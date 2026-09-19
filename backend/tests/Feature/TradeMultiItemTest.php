<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TradeMultiItemTest extends TestCase
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

    public function test_offer_can_include_extra_products_and_accepting_trades_all_of_them(): void
    {
        $sender = User::factory()->create(['name' => 'Ayşe']);
        $receiver = User::factory()->create();
        $watch = $this->product($sender, 'Apple Watch');
        $pods = $this->product($sender, 'AirPods');
        $case = $this->product($sender, 'Kılıf');
        $phone = $this->product($receiver, 'iPhone 14');

        $res = $this->actingAs($sender, 'sanctum')->postJson('/api/trades', [
            'offered_product_id' => $watch->id, 'requested_product_id' => $phone->id, 'extra_offered_product_ids' => [$pods->id, $case->id],
        ])->assertCreated();
        $this->assertCount(2, $res->json('trade.extra_products'));
        $this->assertStringContainsString('ve 2 ürün daha', $receiver->notifications()->first()->data['body']);

        $list = $this->actingAs($receiver, 'sanctum')->getJson('/api/trades')->json('incoming.0');
        $this->assertEqualsCanonicalizing(['AirPods', 'Kılıf'], collect($list['extra_products'])->pluck('title')->all());

        $this->actingAs($receiver, 'sanctum')->postJson('/api/trades/' . $res->json('trade.id') . '/accept')->assertOk();
        foreach ([$watch, $pods, $case, $phone] as $p) {
            $this->assertSame(3, (int) $p->fresh()->status);
        }
    }

    public function test_extra_product_rules_ownership_availability_limit_and_duplicates(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $mine = $this->product($sender, 'A');
        $others = $this->product($receiver, 'Onun Diğeri');
        $traded = $this->product($sender, 'Takaslı', ['status' => 3]);
        $saleOnly = $this->product($sender, 'Satılık', ['listing_type' => 'satilik', 'price' => 10, 'swap_expectation' => '']);
        $target = $this->product($receiver, 'Hedef');
        $base = ['offered_product_id' => $mine->id, 'requested_product_id' => $target->id];
        $post = fn (array $extra) => $this->actingAs($sender, 'sanctum')->postJson('/api/trades', $base + $extra);

        $post(['extra_offered_product_ids' => [$others->id]])->assertStatus(403);
        $post(['extra_offered_product_ids' => [$mine->id]])->assertStatus(403);
        $post(['extra_offered_product_ids' => [$traded->id]])->assertStatus(409);
        $post(['extra_offered_product_ids' => [$saleOnly->id]])->assertStatus(409);
        $post(['extra_offered_product_ids' => [9999]])->assertStatus(422);
        $extras = collect(range(1, 4))->map(fn ($i) => $this->product($sender, "Ek {$i}")->id)->all();
        $post(['extra_offered_product_ids' => $extras])->assertStatus(422)->assertJsonValidationErrors(['extra_offered_product_ids']);
        $post(['extra_offered_product_ids' => [$extras[0], $extras[0]]])->assertStatus(422);

        $this->assertDatabaseCount('trade_items', 0);
    }

    public function test_other_pending_offers_touching_any_traded_product_are_rejected_and_unavailable_extra_blocks_accept(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $rival = User::factory()->create();
        $a1 = $this->product($sender, 'A1');
        $a2 = $this->product($sender, 'A2');
        $b = $this->product($receiver, 'B');
        $r = $this->product($rival, 'Rakip');

        $main = $this->actingAs($sender, 'sanctum')->postJson('/api/trades', ['offered_product_id' => $a1->id, 'requested_product_id' => $b->id, 'extra_offered_product_ids' => [$a2->id]])->assertCreated()->json('trade.id');
        // rakip, ilk göndericinin ek ürününü (a2) istiyor
        $rival2 = $this->actingAs($rival, 'sanctum')->postJson('/api/trades', ['offered_product_id' => $r->id, 'requested_product_id' => $a2->id])->assertCreated()->json('trade.id');

        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$main}/accept")->assertOk();
        $this->assertSame('reddedildi', \App\Models\Trade::find($rival2)->status->value);

        // ek ürünü sonradan kaybolan teklif kabul edilemez
        $c1 = $this->product($sender, 'C1');
        $c2 = $this->product($sender, 'C2');
        $d = $this->product($receiver, 'D');
        $t = $this->actingAs($sender, 'sanctum')->postJson('/api/trades', ['offered_product_id' => $c1->id, 'requested_product_id' => $d->id, 'extra_offered_product_ids' => [$c2->id]])->assertCreated()->json('trade.id');
        $c2->update(['status' => 3]);
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$t}/accept")->assertStatus(409);
        $this->assertSame(1, (int) $d->fresh()->status);
    }
}
