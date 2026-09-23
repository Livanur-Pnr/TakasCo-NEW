<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function requestCode(User $user): string
    {
        Notification::fake();
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();

        $code = null;
        Notification::assertSentTo($user, ResetPasswordCodeNotification::class, function ($n) use (&$code) {
            $code = $n->code;

            return true;
        });

        return $code;
    }

    public function test_user_can_reset_password_with_emailed_code_once_and_old_sessions_are_revoked(): void
    {
        $user = User::factory()->create(['password' => 'eskisifre1']);
        $user->createToken('eski');
        $code = $this->requestCode($user);

        $payload = ['code' => $code, 'email' => $user->email, 'password' => 'yenisifre123', 'password_confirmation' => 'yenisifre123'];
        $this->postJson('/api/reset-password', $payload)->assertOk();
        $this->assertSame(0, $user->tokens()->count());

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'yenisifre123'])->assertOk();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'eskisifre1'])->assertStatus(401);
        $this->postJson('/api/reset-password', $payload)->assertStatus(422); // kod bir kere kullanılınca silinir
    }

    public function test_forgot_password_never_reveals_whether_an_account_exists(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $known = $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk()->json('message');
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'yok@example.com'])->assertOk()->json('message');

        $this->assertSame($known, $unknown);
        Notification::assertSentTimes(ResetPasswordCodeNotification::class, 1);
        $this->postJson('/api/forgot-password', ['email' => 'gecersiz'])->assertStatus(422);
    }

    public function test_reset_rejects_bad_or_expired_codes_and_weak_or_unconfirmed_passwords(): void
    {
        $user = User::factory()->create(['password' => 'eskisifre1']);
        $code = $this->requestCode($user);
        $base = ['code' => $code, 'email' => $user->email];

        $this->postJson('/api/reset-password', $base + ['password' => 'kisa', 'password_confirmation' => 'kisa'])->assertStatus(422);
        $this->postJson('/api/reset-password', $base + ['password' => 'yenisifre123', 'password_confirmation' => 'baska123'])->assertStatus(422);
        $this->postJson('/api/reset-password', ['code' => '000000', 'email' => $user->email, 'password' => 'yenisifre123', 'password_confirmation' => 'yenisifre123'])->assertStatus(422);

        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $user->email)
            ->update(['created_at' => now()->subMinutes(11)]);
        $this->postJson('/api/reset-password', $base + ['password' => 'yenisifre123', 'password_confirmation' => 'yenisifre123'])->assertStatus(422);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'eskisifre1'])->assertOk();
    }
}
