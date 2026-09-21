<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ListingLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title = 'İlan', array $extra = []): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create($extra + [
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    private function titles(): array
    {
        return collect($this->getJson('/api/products')->assertOk()->json('data'))->pluck('title')->all();
    }

    public function test_new_listings_get_a_sixty_day_lifetime_while_legacy_listings_never_expire(): void
    {
        $user = User::factory()->create();
        $category = Category::create(['name' => 'Elektronik']);
        $res = $this->actingAs($user, 'sanctum')->post('/api/products', [
            'title' => 'Yeni', 'category_id' => $category->id, 'description' => 'd', 'condition' => 'Sıfır', 'swap_expectation' => 'y',
            'images' => [UploadedFile::fake()->image('a.jpg', 300, 300)],
        ], ['Accept' => 'application/json'])->assertStatus(201);
        \App\Services\ProductImageService::delete($res->json('product.images.0.image_path'));

        $days = now()->diffInDays(Product::find($res->json('product.id'))->expires_at, false);
        $this->assertGreaterThanOrEqual(59, $days);
        $this->assertLessThanOrEqual(60, $days);

        $legacy = $this->product($user, 'Eski İlan');
        $this->assertNull($legacy->expires_at);
        $this->assertFalse($legacy->is_expired);
        $this->assertContains('Eski İlan', $this->titles());
    }

    public function test_expired_listings_leave_public_views_but_the_owner_still_sees_them_and_can_renew(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $expired = $this->product($owner, 'Süresi Dolmuş', ['expires_at' => now()->subDay()]);
        $live = $this->product($owner, 'Yayında', ['expires_at' => now()->addDays(10)]);

        $this->assertSame(['Yayında'], $this->titles());
        $this->getJson("/api/users/{$owner->id}/products")->assertOk()->assertJsonCount(1);
        $this->actingAs($other, 'sanctum')->getJson("/api/products/{$expired->id}")->assertStatus(404);
        $this->actingAs($owner, 'sanctum')->getJson("/api/products/{$expired->id}")->assertOk();

        $mine = collect($this->actingAs($owner, 'sanctum')->getJson('/api/user/products')->json());
        $this->assertTrue((bool) $mine->firstWhere('title', 'Süresi Dolmuş')['is_expired']);
        $this->assertFalse((bool) $mine->firstWhere('title', 'Yayında')['is_expired']);

        $this->actingAs($other, 'sanctum')->postJson("/api/products/{$expired->id}/renew")->assertStatus(403);
        $this->actingAs($owner, 'sanctum')->postJson("/api/products/{$expired->id}/renew")->assertOk();

        $this->assertFalse($expired->fresh()->is_expired);
        $this->assertEqualsCanonicalizing(['Süresi Dolmuş', 'Yayında'], $this->titles());
    }

    public function test_renew_is_blocked_for_traded_or_removed_listings(): void
    {
        $owner = User::factory()->create();
        $traded = $this->product($owner, 'Takaslı', ['status' => 3]);
        $removed = $this->product($owner, 'Kaldırılmış', ['status' => 4]);

        $this->actingAs($owner, 'sanctum')->postJson("/api/products/{$traded->id}/renew")->assertStatus(409);
        $this->actingAs($owner, 'sanctum')->postJson("/api/products/{$removed->id}/renew")->assertStatus(409);
        $this->actingAs($owner, 'sanctum')->postJson("/api/products/{$traded->id}/reserve")->assertStatus(409);
    }

    public function test_reserved_listing_stays_visible_but_cannot_receive_new_offers_and_can_be_reactivated(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $stranger = User::factory()->create();
        $item = $this->product($seller, 'Rezerve Edilecek');
        $mine = $this->product($buyer, 'Alıcının İlanı');
        $offer = fn () => $this->actingAs($buyer, 'sanctum')->postJson('/api/trades', ['offered_product_id' => $mine->id, 'requested_product_id' => $item->id]);

        $this->actingAs($stranger, 'sanctum')->postJson("/api/products/{$item->id}/reserve")->assertStatus(403);

        $res = $this->actingAs($seller, 'sanctum')->postJson("/api/products/{$item->id}/reserve")->assertOk();
        $this->assertSame(5, $res->json('status'));
        $this->assertContains('Rezerve Edilecek', $this->titles()); // görünür kalır
        $offer()->assertStatus(409);

        $back = $this->actingAs($seller, 'sanctum')->postJson("/api/products/{$item->id}/reserve")->assertOk();
        $this->assertSame(1, $back->json('status'));
        $offer()->assertCreated();
    }

    public function test_expired_listings_cannot_receive_offers_and_do_not_appear_in_swap_matches(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $expired = $this->product($seller, 'Steam Deck', ['expires_at' => now()->subDay(), 'swap_expectation' => 'PlayStation']);
        $mine = $this->product($buyer, 'PlayStation 5', ['swap_expectation' => 'Steam Deck']);

        $this->actingAs($buyer, 'sanctum')->postJson('/api/trades', ['offered_product_id' => $mine->id, 'requested_product_id' => $expired->id])->assertStatus(409);
        $this->assertSame([], $this->actingAs($buyer, 'sanctum')->getJson('/api/matches')->json('data'));
    }
}
