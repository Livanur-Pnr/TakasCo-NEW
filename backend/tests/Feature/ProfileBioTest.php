<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileBioTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title, int $status = 1): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create([
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => $status, 'image_path' => 'products/fake.jpg',
        ]);
    }

    private function update(User $user, array $extra)
    {
        return $this->actingAs($user, 'sanctum')->postJson('/api/user/profile', $extra + [
            'name' => $user->name, 'email' => $user->email, 'phone_number' => '05551112233',
        ]);
    }

    public function test_user_can_set_edit_and_clear_the_public_bio(): void
    {
        $user = User::factory()->create();

        $this->update($user, ['bio' => '  Kitap ve müzik aletleri takas ediyorum.  '])->assertOk();
        $this->assertSame('Kitap ve müzik aletleri takas ediyorum.', $this->getJson("/api/users/{$user->id}")->json('bio'));

        // bio gönderilmezse dokunulmaz (eski istemciler)
        $this->update($user, [])->assertOk();
        $this->assertSame('Kitap ve müzik aletleri takas ediyorum.', $user->fresh()->bio);

        $this->update($user, ['bio' => '   '])->assertOk();
        $this->assertNull($user->fresh()->bio);
    }

    public function test_bio_length_is_limited(): void
    {
        $user = User::factory()->create();

        $this->update($user, ['bio' => str_repeat('a', 301)])->assertStatus(422)->assertJsonStructure(['bio']); // bu uç doğrulama hatalarını alan adıyla döner
        $this->update($user, ['bio' => str_repeat('a', 300)])->assertOk();
    }

    public function test_public_profile_lists_active_and_traded_listings_separately(): void
    {
        $seller = User::factory()->create();
        $this->product($seller, 'Aktif İlan');
        $this->product($seller, 'Takaslanmış İlan', 3);
        $this->product($seller, 'Kaldırılmış İlan', 4);

        $active = collect($this->getJson("/api/users/{$seller->id}/products")->assertOk()->json())->pluck('title')->all();
        $traded = collect($this->getJson("/api/users/{$seller->id}/products?status=traded")->assertOk()->json())->pluck('title')->all();

        $this->assertSame(['Aktif İlan'], $active);
        $this->assertSame(['Takaslanmış İlan'], $traded);
    }

    public function test_suspended_users_traded_listings_are_hidden_too(): void
    {
        $seller = User::factory()->create();
        $this->product($seller, 'Takaslanmış İlan', 3);
        $seller->forceFill(['suspended_at' => now()])->save();

        $this->getJson("/api/users/{$seller->id}/products?status=traded")->assertStatus(404);
    }
}
