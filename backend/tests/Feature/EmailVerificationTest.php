<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function signedLink(User $user, ?string $hash = null): string
    {
        return URL::temporarySignedRoute('email.verify', now()->addMinutes(60), [
            'id' => $user->id, 'hash' => $hash ?? sha1($user->getEmailForVerification()),
        ]);
    }

    public function test_registration_sends_a_verification_code_and_the_new_user_starts_unverified(): void
    {
        Notification::fake();

        $res = $this->postJson('/api/register', [
            'name' => 'Yeni', 'email' => 'yeni@example.com', 'phone_number' => '05551112233',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertOk();

        $user = User::where('email', 'yeni@example.com')->first();
        $this->assertNull($user->email_verified_at);
        $this->assertNull($res->json('user.email_verified_at'));
        Notification::assertSentTo($user, EmailVerificationCodeNotification::class);
    }

    public function test_verify_email_code_endpoint_accepts_the_correct_code_and_rejects_wrong_or_expired_ones(): void
    {
        $user = User::factory()->unverified()->create();
        $user->sendEmailVerificationCode();
        $code = $user->fresh()->email_verification_code;

        $this->actingAs($user, 'sanctum')->postJson('/api/user/verify-email-code', ['code' => '000000'])
            ->assertStatus(422);
        $this->assertNull($user->fresh()->email_verified_at);

        $user->forceFill(['email_verification_code_expires_at' => now()->subMinute()])->save();
        $this->actingAs($user, 'sanctum')->postJson('/api/user/verify-email-code', ['code' => $code])
            ->assertStatus(422);

        $user->forceFill(['email_verification_code_expires_at' => now()->addMinutes(10)])->save();
        $this->actingAs($user, 'sanctum')->postJson('/api/user/verify-email-code', ['code' => $code])
            ->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertNull($user->fresh()->email_verification_code);
    }

    public function test_unverified_users_are_blocked_from_the_rest_of_the_api_until_they_verify(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();

        // doğrulama ile ilgili rotalar hâlâ erişilebilir
        $this->actingAs($user, 'sanctum')->getJson('/api/user')->assertOk();
        $this->actingAs($user, 'sanctum')->postJson('/api/user/resend-verification-code')->assertOk();

        // ama uygulamanın geri kalanı kapalı
        $this->actingAs($user, 'sanctum')->getJson('/api/favorites')->assertStatus(403);

        $code = $user->fresh()->email_verification_code;
        $this->actingAs($user, 'sanctum')->postJson('/api/user/verify-email-code', ['code' => $code])->assertOk();

        $this->actingAs($user, 'sanctum')->getJson('/api/favorites')->assertOk();
    }

    public function test_signed_link_verifies_the_account_and_redirects_to_the_frontend(): void
    {
        config(['app.frontend_url' => 'https://takasco.example']);
        $user = User::factory()->unverified()->create();

        $this->get($this->signedLink($user))->assertRedirect('https://takasco.example/email-verified');

        $this->assertNotNull($user->fresh()->email_verified_at);
        $stats = $this->getJson("/api/users/{$user->id}/reviews")->json('stats');
        $this->assertTrue($stats['email_verified']);
        $this->assertContains('email_verified', $stats['badges']);
    }

    public function test_tampered_expired_or_unsigned_links_are_rejected(): void
    {
        $user = User::factory()->unverified()->create();
        $other = User::factory()->unverified()->create();

        $this->get($this->signedLink($user, sha1('baska@example.com')))->assertStatus(403);
        $this->get(str_replace('/' . $user->id . '/', '/' . $other->id . '/', $this->signedLink($user)))->assertStatus(403); // imza uyuşmaz
        $this->get("/email/verify/{$user->id}/" . sha1($user->email))->assertStatus(403); // imzasız
        $expired = URL::temporarySignedRoute('email.verify', now()->subMinute(), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->get($expired)->assertStatus(403);

        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertNull($other->fresh()->email_verified_at);
    }

    public function test_resend_endpoint_sends_only_to_unverified_users_and_requires_login(): void
    {
        Notification::fake();
        $unverified = User::factory()->unverified()->create();
        $verified = User::factory()->create();

        $this->actingAs($unverified, 'sanctum')->postJson('/api/email/verification-notification')->assertOk();
        Notification::assertSentTo($unverified, VerifyEmail::class);

        $this->actingAs($verified, 'sanctum')->postJson('/api/email/verification-notification')->assertOk();
        Notification::assertNotSentTo($verified, VerifyEmail::class);

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/email/verification-notification')->assertStatus(401);
    }

    public function test_changing_the_email_resets_verification_and_sends_a_new_code(): void
    {
        Notification::fake();
        $user = User::factory()->create(['phone_number' => '05551112233']);
        $this->assertNotNull($user->email_verified_at);

        $this->actingAs($user, 'sanctum')->postJson('/api/user/profile', ['name' => $user->name, 'email' => $user->email, 'phone_number' => '05551112233'])->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
        Notification::assertNothingSent();

        $this->actingAs($user, 'sanctum')->postJson('/api/user/profile', ['name' => $user->name, 'email' => 'yeni-adres@example.com', 'phone_number' => '05551112233'])->assertOk();
        $this->assertNull($user->fresh()->email_verified_at);
        Notification::assertSentTo($user->fresh(), EmailVerificationCodeNotification::class);
    }
}
