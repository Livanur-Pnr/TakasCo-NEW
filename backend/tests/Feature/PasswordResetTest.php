<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function requestToken(User $user): string
    {
        Notification::fake();
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function ($n) use (&$token) {
            $token = $n->token;

            return true;
        });

        return $token;
    }

    public function test_user_can_reset_password_with_emailed_token_once_and_old_sessions_are_revoked(): void
    {
        config(['app.frontend_url' => 'https://takasco.example']);
        $user = User::factory()->create(['password' => 'eskisifre1']);
        $user->createToken('eski');
        $token = $this->requestToken($user);

        $url = (new ResetPassword($token))->toMail($user)->actionUrl;
        $this->assertStringStartsWith('https://takasco.example/reset-password?token=' . $token, $url);

        $payload = ['token' => $token, 'email' => $user->email, 'password' => 'yenisifre123', 'password_confirmation' => 'yenisifre123'];
        $this->postJson('/api/reset-password', $payload)->assertOk();
        $this->assertSame(0, $user->tokens()->count());

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'yenisifre123'])->assertOk();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'eskisifre1'])->assertStatus(401);
        $this->postJson('/api/reset-password', $payload)->assertStatus(422);
    }

    public function test_forgot_password_never_reveals_whether_an_account_exists(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $known = $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk()->json('message');
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'yok@example.com'])->assertOk()->json('message');

        $this->assertSame($known, $unknown);
        Notification::assertSentTimes(ResetPassword::class, 1);
        $this->postJson('/api/forgot-password', ['email' => 'gecersiz'])->assertStatus(422);
    }

    public function test_reset_rejects_bad_tokens_and_weak_or_unconfirmed_passwords(): void
    {
        $user = User::factory()->create(['password' => 'eskisifre1']);
        $token = $this->requestToken($user);
        $base = ['token' => $token, 'email' => $user->email];

        $this->postJson('/api/reset-password', $base + ['password' => 'kisa', 'password_confirmation' => 'kisa'])->assertStatus(422);
        $this->postJson('/api/reset-password', $base + ['password' => 'yenisifre123', 'password_confirmation' => 'baska123'])->assertStatus(422);
        $this->postJson('/api/reset-password', ['token' => 'sahte', 'email' => $user->email, 'password' => 'yenisifre123', 'password_confirmation' => 'yenisifre123'])->assertStatus(422);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'eskisifre1'])->assertOk();
    }
}
