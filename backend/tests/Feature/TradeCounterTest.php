<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TradeCounterTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title, array $extra = []): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create($extra + [
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    public function test_offer_can_include_cash_adjustment_and_it_is_validated_and_mentioned_in_notification(): void
    {
        $sender = User::factory()->create(['name' => 'Ayşe']);
        $receiver = User::factory()->create();
        $offered = $this->product($sender, 'AirPods');
        $requested = $this->product($receiver, 'Apple Watch');
        $payload = ['offered_product_id' => $offered->id, 'requested_product_id' => $requested->id];

        $this->actingAs($sender, 'sanctum')->postJson('/api/trades', $payload + ['cash_amount' => 1500])->assertStatus(422)->assertJsonValidationErrors(['cash_direction']);
        $this->actingAs($sender, 'sanctum')->postJson('/api/trades', $payload + ['cash_amount' => 0, 'cash_direction' => 'sender_pays'])->assertStatus(422);
        $this->actingAs($sender, 'sanctum')->postJson('/api/trades', $payload + ['cash_amount' => 1500, 'cash_direction' => 'kimse'])->assertStatus(422);

        $res = $this->actingAs($sender, 'sanctum')->postJson('/api/trades', $payload + ['cash_amount' => 1500, 'cash_direction' => 'sender_pays'])->assertCreated();
        $this->assertEquals(1500, $res->json('trade.cash_amount'));
        $this->assertSame('sender_pays', $res->json('trade.cash_direction'));

        $body = $receiver->notifications()->first()->data['body'];
        $this->assertStringContainsString('1.500 TL', $body);

        $list = $this->actingAs($receiver, 'sanctum')->getJson('/api/trades')->json('incoming.0');
        $this->assertEquals(1500, $list['cash_amount']);
    }

    public function test_trade_list_never_exposes_the_other_partys_contact_details(): void
    {
        $sender = User::factory()->create(['phone_number' => '05551112233']);
        $receiver = User::factory()->create(['phone_number' => '05559998877']);
        Trade::create([
            'sender_id' => $sender->id, 'receiver_id' => $receiver->id,
            'offered_product_id' => $this->product($sender, 'A')->id, 'requested_product_id' => $this->product($receiver, 'B')->id, 'status' => 'beklemede',
        ]);

        foreach ([[$receiver, 'incoming.0.sender'], [$sender, 'outgoing.0.receiver']] as [$viewer, $path]) {
            $json = $this->actingAs($viewer, 'sanctum')->getJson('/api/trades')->assertOk()->json($path);
            $this->assertArrayNotHasKey('phone_number', $json);
            $this->assertArrayNotHasKey('email', $json);
            $this->assertArrayHasKey('name', $json);
        }
    }

    public function test_receiver_can_counter_with_changed_cash_and_product_and_sender_can_accept_the_counter(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $a1 = $this->product($sender, 'A1');
        $a2 = $this->product($sender, 'A2');
        $b = $this->product($receiver, 'B');
        $trade = Trade::create(['sender_id' => $sender->id, 'receiver_id' => $receiver->id, 'offered_product_id' => $a1->id, 'requested_product_id' => $b->id, 'status' => 'beklemede']);

        $res = $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/counter", [
            'requested_product_id' => $a2->id, 'cash_amount' => 2000, 'cash_direction' => 'receiver_pays',
        ])->assertCreated();

        $this->assertSame('karşı teklif', $trade->fresh()->status->value);
        $counter = Trade::find($res->json('trade.id'));
        $this->assertSame($receiver->id, $counter->sender_id);
        $this->assertSame($sender->id, $counter->receiver_id);
        $this->assertSame($b->id, $counter->offered_product_id);
        $this->assertSame($a2->id, $counter->requested_product_id);
        $this->assertSame($trade->id, $counter->parent_trade_id);
        $this->assertSame('beklemede', $counter->status->value);

        $this->assertStringContainsString('Karşı teklif', $sender->notifications()->first()->data['title']);

        // ilk teklif artık kabul/reddedilemez, karşı teklifi ilk gönderen kabul eder
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/accept")->assertStatus(409);
        $this->actingAs($sender, 'sanctum')->postJson("/api/trades/{$counter->id}/accept")->assertOk();
        $this->assertSame(3, (int) $a2->fresh()->status);
        $this->assertSame(3, (int) $b->fresh()->status);
        $this->assertSame(1, (int) $a1->fresh()->status);
    }

    public function test_counter_authorization_state_and_product_ownership_rules(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $stranger = User::factory()->create();
        $a = $this->product($sender, 'A');
        $b = $this->product($receiver, 'B');
        $strangers = $this->product($stranger, 'S');
        $trade = Trade::create(['sender_id' => $sender->id, 'receiver_id' => $receiver->id, 'offered_product_id' => $a->id, 'requested_product_id' => $b->id, 'status' => 'beklemede']);

        $this->actingAs($sender, 'sanctum')->postJson("/api/trades/{$trade->id}/counter", [])->assertStatus(403);
        $this->actingAs($stranger, 'sanctum')->postJson("/api/trades/{$trade->id}/counter", [])->assertStatus(403);
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/counter", ['requested_product_id' => $strangers->id])->assertStatus(422);
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/counter", ['cash_amount' => 100])->assertStatus(422);
        $this->assertSame('beklemede', $trade->fresh()->status->value);

        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/counter", [])->assertCreated();
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/counter", [])->assertStatus(409);
        $this->actingAs($receiver, 'sanctum')->postJson('/api/trades/9999/counter', [])->assertStatus(404);
    }

    public function test_counter_is_blocked_for_traded_products_and_blocked_users(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $a = $this->product($sender, 'A');
        $b = $this->product($receiver, 'B');
        $trade = Trade::create(['sender_id' => $sender->id, 'receiver_id' => $receiver->id, 'offered_product_id' => $a->id, 'requested_product_id' => $b->id, 'status' => 'beklemede']);

        $a->update(['status' => 3]);
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/counter", [])->assertStatus(409);
        $a->update(['status' => 1]);

        $this->actingAs($sender, 'sanctum')->postJson("/api/users/{$receiver->id}/block")->assertOk();
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/counter", [])->assertStatus(403);
    }
}
