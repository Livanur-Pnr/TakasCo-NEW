<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create([
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    public function test_blocked_list_returns_only_my_blocks(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create(['name' => 'Engellenen']);
        $c = User::factory()->create();

        $this->actingAs($a, 'sanctum')->postJson("/api/users/{$b->id}/block")->assertOk();
        $this->actingAs($c, 'sanctum')->postJson("/api/users/{$a->id}/block")->assertOk();

        $list = $this->actingAs($a, 'sanctum')->getJson('/api/blocks')->assertOk()->json('data');
        $this->assertSame([['id' => $b->id, 'name' => 'Engellenen']], $list);
        $this->asGuest()->getJson('/api/blocks')->assertStatus(401);
    }

    private function asGuest(): static
    {
        $this->app['auth']->forgetGuards();

        return $this;
    }

    public function test_account_deletion_requires_password_and_anonymizes_data(): void
    {
        $user = User::factory()->create(['name' => 'Ayşe', 'password' => 'secret123', 'phone_number' => '05551112233', 'city' => 'İzmir']);
        $other = User::factory()->create();
        $mine = $this->product($user, 'Silinecek İlan');
        $theirs = $this->product($other, 'Diğerinin İlanı');
        $trade = Trade::create([
            'sender_id' => $user->id, 'receiver_id' => $other->id, 'offered_product_id' => $mine->id,
            'requested_product_id' => $theirs->id, 'status' => 'beklemede',
        ]);
        $user->createToken('t');

        $this->actingAs($user, 'sanctum')->postJson('/api/user/delete', ['password' => 'yanlis'])->assertStatus(422);
        $this->assertSame('Ayşe', $user->fresh()->name);

        $this->actingAs($user, 'sanctum')->postJson('/api/user/delete', ['password' => 'secret123'])->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('Silinmiş Kullanıcı', $fresh->name);
        $this->assertSame('', $fresh->phone_number);
        $this->assertNull($fresh->city);
        $this->assertStringEndsWith('@deleted.invalid', $fresh->email);
        $this->assertSame(0, $fresh->tokens()->count());
        $this->assertNull(Product::find($mine->id));
        $this->assertNotNull(Product::find($theirs->id));
        $this->assertSame('iptal edildi', $trade->fresh()->status->value);

        $this->asGuest()->postJson('/api/login', ['email' => 'ayse@example.com', 'password' => 'secret123'])->assertStatus(401);
    }

    public function test_admin_account_cannot_be_deleted_via_self_service(): void
    {
        $admin = User::factory()->create(['password' => 'secret123']);
        $admin->forceFill(['is_admin' => true])->save();

        $this->actingAs($admin, 'sanctum')->postJson('/api/user/delete', ['password' => 'secret123'])->assertStatus(422);
    }
}
