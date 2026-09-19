<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    // actingAs sonraki isteklere de taşındığından, misafir isteği öncesi oturum sıfırlanır
    private function asGuest(): static
    {
        $this->app['auth']->forgetGuards();

        return $this;
    }

    private function product(User $owner, string $title = 'İlan'): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create([
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    public function test_only_admins_can_use_admin_endpoints(): void
    {
        $user = User::factory()->create();

        foreach (['/api/admin/overview', '/api/admin/products', '/api/admin/users'] as $path) {
            $this->asGuest()->getJson($path)->assertStatus(401);
            $this->actingAs($user, 'sanctum')->getJson($path)->assertStatus(403);
        }
        $this->actingAs($user, 'sanctum')->postJson('/api/admin/products/1/remove')->assertStatus(403);
        $this->actingAs($user, 'sanctum')->postJson('/api/admin/products/1/restore')->assertStatus(403);
    }

    public function test_overview_returns_real_counts(): void
    {
        $admin = $this->admin();
        $owner = User::factory()->create();
        $this->product($owner);
        $this->product($owner);
        Trade::create(['sender_id' => $owner->id, 'receiver_id' => $admin->id, 'offered_product_id' => $this->product($owner)->id, 'requested_product_id' => $this->product($admin)->id, 'status' => 'beklemede']);

        $overview = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/overview')->assertOk()->json();

        $this->assertSame(2, $overview['users']);
        $this->assertSame(4, $overview['active_products']);
        $this->assertSame(1, $overview['active_trades']);
        $this->assertSame(0, $overview['completed_trades']);
    }

    public function test_admin_can_list_and_search_products_and_users(): void
    {
        $admin = $this->admin();
        $owner = User::factory()->create(['name' => 'Zeynep Aranan']);
        $this->product($owner, 'Aranan Telefon');
        $this->product($owner, 'Başka Şey');

        $products = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/products?q=Aranan')->assertOk();
        $this->assertCount(1, $products->json('data'));
        $this->assertSame('Aranan Telefon', $products->json('data.0.title'));

        $users = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users?q=Zeynep')->assertOk();
        $this->assertCount(1, $users->json('data'));
        $this->assertSame(2, $users->json('data.0.products_count'));
        $this->assertArrayNotHasKey('password', $users->json('data.0'));
    }

    public function test_removing_a_product_hides_it_and_rejects_its_pending_offers(): void
    {
        $admin = $this->admin();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $stranger = User::factory()->create();
        $product = $this->product($owner, 'Sorunlu İlan');
        $offered = $this->product($other, 'Teklif Edilen');
        $trade = Trade::create(['sender_id' => $other->id, 'receiver_id' => $owner->id, 'offered_product_id' => $offered->id, 'requested_product_id' => $product->id, 'status' => 'beklemede']);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/products/{$product->id}/remove")->assertOk();

        $this->assertSame(4, (int) $product->fresh()->status);
        $this->assertSame('reddedildi', $trade->fresh()->status->value);

        $titles = collect($this->asGuest()->getJson('/api/products')->json('data'))->pluck('title');
        $this->assertFalse($titles->contains('Sorunlu İlan'));

        $this->asGuest()->getJson("/api/products/{$product->id}")->assertStatus(404);
        $this->actingAs($stranger, 'sanctum')->getJson("/api/products/{$product->id}")->assertStatus(404);
        $this->actingAs($owner, 'sanctum')->getJson("/api/products/{$product->id}")->assertOk();
        $this->actingAs($admin, 'sanctum')->getJson("/api/products/{$product->id}")->assertOk();

        // kaldırılmış ilana yeni teklif verilemez
        $this->actingAs($stranger, 'sanctum')->postJson('/api/trades', [
            'offered_product_id' => $this->product($stranger, 'Benimki')->id, 'requested_product_id' => $product->id,
        ])->assertStatus(409);
    }

    public function test_restore_only_works_for_removed_products(): void
    {
        $admin = $this->admin();
        $product = $this->product(User::factory()->create());

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/products/{$product->id}/restore")->assertStatus(409);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/products/{$product->id}/remove")->assertOk();
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/products/{$product->id}/restore")->assertOk();

        $this->assertSame(1, (int) $product->fresh()->status);
        $this->asGuest()->getJson("/api/products/{$product->id}")->assertOk();
    }

    public function test_is_admin_flag_cannot_be_self_assigned(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/user/profile', [
            'name' => 'Yeni Ad', 'email' => $user->email, 'phone_number' => '123', 'is_admin' => true,
        ])->assertOk();

        $this->assertFalse((bool) $user->fresh()->is_admin);
    }

    public function test_admin_can_suspend_and_unsuspend_users(): void
    {
        $admin = $this->admin();
        $user = User::factory()->create(['email' => 'askida@example.com', 'password' => 'secret123']);
        $token = $user->createToken('t')->plainTextToken;

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/users/{$user->id}/suspend")->assertOk();
        $this->assertNotNull($user->fresh()->suspended_at);
        $this->assertSame(0, $user->tokens()->count());

        $this->asGuest()->postJson('/api/login', ['email' => 'askida@example.com', 'password' => 'secret123'])->assertStatus(403);

        $this->actingAs($user->fresh(), 'sanctum')->getJson('/api/user/products')->assertStatus(403);

        $list = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users?q=askida')->json('data.0');
        $this->assertTrue($list['suspended']);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/users/{$user->id}/unsuspend")->assertOk();
        $this->asGuest()->postJson('/api/login', ['email' => 'askida@example.com', 'password' => 'secret123'])->assertOk();
    }

    public function test_admins_and_self_cannot_be_suspended_and_non_admin_is_forbidden(): void
    {
        $admin = $this->admin();
        $other = $this->admin();
        $user = User::factory()->create();

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/users/{$admin->id}/suspend")->assertStatus(422);
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/users/{$other->id}/suspend")->assertStatus(422);
        $this->actingAs($user, 'sanctum')->postJson("/api/admin/users/{$admin->id}/suspend")->assertStatus(403);
    }

    public function test_suspended_users_listings_and_profile_disappear_publicly_and_return_on_unsuspend(): void
    {
        $admin = $this->admin();
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->product($seller, 'Askıdaki Satıcının İlanı');
        $mine = $this->product($buyer, 'Alıcının İlanı');

        $before = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/overview')->json('active_products');
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/users/{$seller->id}/suspend")->assertOk();
        $this->assertSame($before - 1, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/overview')->json('active_products'));

        $titles = fn () => collect($this->asGuest()->getJson('/api/products')->json('data'))->pluck('title')->all();
        $this->assertNotContains('Askıdaki Satıcının İlanı', $titles());
        $this->asGuest()->getJson("/api/products/{$listing->id}")->assertStatus(404);
        $this->asGuest()->getJson("/api/users/{$seller->id}")->assertStatus(404);
        $this->asGuest()->getJson("/api/users/{$seller->id}/products")->assertStatus(404);
        $this->actingAs($admin, 'sanctum')->getJson("/api/products/{$listing->id}")->assertOk();
        $this->actingAs($buyer, 'sanctum')->postJson('/api/trades', ['offered_product_id' => $mine->id, 'requested_product_id' => $listing->id])->assertStatus(409);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/users/{$seller->id}/unsuspend")->assertOk();
        $this->assertContains('Askıdaki Satıcının İlanı', $titles());
        $this->asGuest()->getJson("/api/products/{$listing->id}")->assertOk();
    }
}
