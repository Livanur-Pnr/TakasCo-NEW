<?php

namespace Tests\Feature;

use App\Enums\TradeStatus;
use App\Models\Category;
use App\Models\Product;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TradeSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function makeProduct(User $owner, string $title): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'title' => $title,
            'description' => 'Test açıklaması',
            'condition' => 'Az Kullanılmış',
            'swap_expectation' => 'Kitap',
            'city' => 'İstanbul',
            'district' => 'Kadıköy',
            'status' => 1,
            'image_path' => 'products/fake.jpg',
        ]);
    }

    public function test_receiver_can_accept_a_pending_trade_and_products_become_traded(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $response = $this->actingAs($receiver, 'sanctum')
            ->postJson("/api/trades/{$trade->id}/accept");

        $response->assertOk()->assertJsonStructure(['message', 'contact']);

        $this->assertSame(TradeStatus::Accepted, $trade->fresh()->status);
        $this->assertSame(3, (int) $offered->fresh()->status);
        $this->assertSame(3, (int) $requested->fresh()->status);
    }

    public function test_sender_cannot_accept_their_own_outgoing_trade(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $response = $this->actingAs($sender, 'sanctum')
            ->postJson("/api/trades/{$trade->id}/accept");

        $response->assertStatus(403);
        $this->assertSame(TradeStatus::Pending, $trade->fresh()->status);
    }

    public function test_an_already_resolved_trade_cannot_be_accepted_again(): void
    {
        // Aynı isteği ikinci kez göndermek, race condition'da ikinci thread'in
        // göreceği durumu simüle eder: state guard bunu 409 ile reddetmeli.
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/accept")->assertOk();

        $second = $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/accept");

        $second->assertStatus(409);
    }

    public function test_accepting_a_trade_auto_rejects_other_pending_offers_on_the_same_products(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $otherSender = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');
        $otherOffered = $this->makeProduct($otherSender, 'Rakip Teklif Ürünü');

        $winningTrade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $rivalTrade = Trade::create([
            'sender_id' => $otherSender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $otherOffered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$winningTrade->id}/accept")->assertOk();

        $this->assertSame(TradeStatus::Rejected, $rivalTrade->fresh()->status);
    }

    public function test_receiver_can_reject_a_pending_trade(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $response = $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/reject");

        $response->assertOk();
        $this->assertSame(TradeStatus::Rejected, $trade->fresh()->status);
        // reddedilen bir teklif ürünlerin durumunu etkilememeli
        $this->assertSame(1, (int) $offered->fresh()->status);
        $this->assertSame(1, (int) $requested->fresh()->status);
    }

    public function test_sender_cannot_reject_their_own_outgoing_trade(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $response = $this->actingAs($sender, 'sanctum')->postJson("/api/trades/{$trade->id}/reject");

        $response->assertStatus(403);
        $this->assertSame(TradeStatus::Pending, $trade->fresh()->status);
    }

    public function test_sender_can_cancel_their_own_pending_trade(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $response = $this->actingAs($sender, 'sanctum')->postJson("/api/trades/{$trade->id}/cancel");

        $response->assertOk();
        $this->assertSame(TradeStatus::Cancelled, $trade->fresh()->status);
    }

    public function test_receiver_cannot_cancel_a_trade_they_did_not_send(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $response = $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/cancel");

        $response->assertStatus(403);
    }

    public function test_a_rejected_trade_cannot_be_cancelled_or_accepted_afterwards(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/reject")->assertOk();

        $this->actingAs($sender, 'sanctum')->postJson("/api/trades/{$trade->id}/cancel")->assertStatus(409);
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/accept")->assertStatus(409);
    }

    public function test_cannot_create_duplicate_pending_trade_for_same_product_pair(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün');
        $requested = $this->makeProduct($receiver, 'İstenen Ürün');

        $payload = [
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
        ];

        $this->actingAs($sender, 'sanctum')->postJson('/api/trades', $payload)->assertCreated();

        $second = $this->actingAs($sender, 'sanctum')->postJson('/api/trades', $payload);

        $second->assertStatus(409);
    }
}
