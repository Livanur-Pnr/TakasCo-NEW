<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TradeShippingTest extends TestCase
{
    use RefreshDatabase;

    private function makeProduct(User $owner, string $title, bool $shipping = true): Product
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
            'shipping_enabled' => $shipping,
        ]);
    }

    private function acceptedTrade(bool $shipping = true): array
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $offered = $this->makeProduct($sender, 'Teklif Edilen Ürün', false);
        $requested = $this->makeProduct($receiver, 'İstenen Ürün', $shipping);

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$trade->id}/accept")->assertOk();

        return [$trade->fresh(), $sender, $receiver];
    }

    public function test_accepting_a_trade_with_shipping_enabled_starts_shipping_status(): void
    {
        [$trade] = $this->acceptedTrade(true);
        $this->assertSame('hazırlanıyor', $trade->shipping_status);
    }

    public function test_accepting_a_trade_without_shipping_leaves_shipping_status_null(): void
    {
        [$trade] = $this->acceptedTrade(false);
        $this->assertNull($trade->shipping_status);
    }

    public function test_receiver_can_mark_shipped_then_delivered(): void
    {
        [$trade, $sender, $receiver] = $this->acceptedTrade(true);

        $this->actingAs($sender, 'sanctum')
            ->postJson("/api/trades/{$trade->id}/shipping", ['status' => 'kargoda', 'carrier' => 'Aras Kargo', 'tracking_number' => '123456'])
            ->assertStatus(403);

        $this->actingAs($receiver, 'sanctum')
            ->postJson("/api/trades/{$trade->id}/shipping", ['status' => 'kargoda'])
            ->assertStatus(422);

        $this->actingAs($receiver, 'sanctum')
            ->postJson("/api/trades/{$trade->id}/shipping", ['status' => 'kargoda', 'carrier' => 'Aras Kargo', 'tracking_number' => '123456'])
            ->assertOk();

        $trade->refresh();
        $this->assertSame('kargoda', $trade->shipping_status);
        $this->assertSame('Aras Kargo', $trade->shipping_carrier);
        $this->assertSame('123456', $trade->tracking_number);
        $this->assertNotNull($trade->shipped_at);

        // geriye gidemez
        $this->actingAs($receiver, 'sanctum')
            ->postJson("/api/trades/{$trade->id}/shipping", ['status' => 'kargoda', 'carrier' => 'x', 'tracking_number' => 'y'])
            ->assertStatus(409);

        $this->actingAs($receiver, 'sanctum')
            ->postJson("/api/trades/{$trade->id}/shipping", ['status' => 'teslim edildi'])
            ->assertOk();

        $trade->refresh();
        $this->assertSame('teslim edildi', $trade->shipping_status);
        $this->assertNotNull($trade->delivered_at);

        $this->actingAs($receiver, 'sanctum')
            ->postJson("/api/trades/{$trade->id}/shipping", ['status' => 'teslim edildi'])
            ->assertStatus(409);
    }

    public function test_shipping_cannot_be_updated_before_trade_is_accepted(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $offered = $this->makeProduct($sender, 'A');
        $requested = $this->makeProduct($receiver, 'B');

        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'offered_product_id' => $offered->id,
            'requested_product_id' => $requested->id,
            'status' => 'beklemede',
        ]);

        $this->actingAs($receiver, 'sanctum')
            ->postJson("/api/trades/{$trade->id}/shipping", ['status' => 'kargoda', 'carrier' => 'x', 'tracking_number' => 'y'])
            ->assertStatus(409);
    }
}
