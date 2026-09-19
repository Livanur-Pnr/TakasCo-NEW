<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receives_token_without_password_in_response(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Ayşe Yılmaz',
            'email' => 'ayse@example.com',
            'phone_number' => '05550000000',
            'password' => 'gizli1234',
            'password_confirmation' => 'gizli1234',
        ]);

        $response->assertOk()->assertJsonStructure(['access_token', 'token_type', 'user']);
        $this->assertArrayNotHasKey('password', $response->json('user'));
        $this->assertDatabaseHas('users', ['email' => 'ayse@example.com', 'is_admin' => 0]);
    }

    public function test_registration_validates_input(): void
    {
        $this->postJson('/api/register', ['email' => 'not-an-email', 'password' => '123'])->assertStatus(422);
    }

    public function test_registration_cannot_grant_admin_rights(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Sinsi',
            'email' => 'sinsi@example.com',
            'phone_number' => '05550000001',
            'password' => 'gizli1234',
            'password_confirmation' => 'gizli1234',
            'is_admin' => true,
        ])->assertOk();

        $this->assertDatabaseHas('users', ['email' => 'sinsi@example.com', 'is_admin' => 0]);
    }

    public function test_user_can_login_with_correct_credentials(): void
    {
        User::factory()->create(['email' => 'mert@example.com', 'password' => bcrypt('dogru-sifre')]);

        $this->postJson('/api/login', ['email' => 'mert@example.com', 'password' => 'dogru-sifre'])
            ->assertOk()
            ->assertJsonStructure(['access_token']);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create(['email' => 'mert@example.com', 'password' => bcrypt('dogru-sifre')]);

        $this->postJson('/api/login', ['email' => 'mert@example.com', 'password' => 'yanlis'])->assertStatus(401);
    }

    public function test_protected_endpoints_require_authentication(): void
    {
        foreach (['/api/user', '/api/favorites', '/api/trades', '/api/user/products'] as $path) {
            $this->getJson($path)->assertStatus(401);
        }
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/login', ['email' => 'kimse@example.com', 'password' => 'yanlis'])->assertStatus(401);
        }

        $this->postJson('/api/login', ['email' => 'kimse@example.com', 'password' => 'yanlis'])
            ->assertStatus(429)
            ->assertJson(['message' => 'Çok fazla deneme yaptın. Lütfen biraz bekleyip tekrar dene.']);
    }

    public function test_missing_records_return_turkish_404_json_without_internals(): void
    {
        $response = $this->getJson('/api/products/999999')->assertStatus(404);

        $this->assertSame('Aradığın kayıt bulunamadı.', $response->json('message'));
        $this->assertStringNotContainsString('App\\Models', $response->getContent());
    }

    public function test_unauthenticated_response_is_turkish_json(): void
    {
        $this->getJson('/api/trades')->assertStatus(401)->assertJson(['message' => 'Bu işlem için giriş yapmalısın.']);
    }

    public function test_non_admin_cannot_approve_products(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/products/1/approve')->assertStatus(403);
    }
}
