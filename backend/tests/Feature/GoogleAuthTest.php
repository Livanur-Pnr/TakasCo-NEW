<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    private const CLIENT = 'test-client.apps.googleusercontent.com';

    /** @var resource|\OpenSSLAsymmetricKey */
    private $key;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google.client_id' => self::CLIENT]);
        Cache::forget('google.jwks');
        $this->key = $this->newKey();
        $rsa = openssl_pkey_get_details($this->key)['rsa'];
        Http::fake(['www.googleapis.com/oauth2/v3/certs' => Http::response(['keys' => [[
            'kty' => 'RSA', 'alg' => 'RS256', 'use' => 'sig', 'kid' => 'kid-1', 'n' => $this->b64($rsa['n']), 'e' => $this->b64($rsa['e']),
        ]]])]);
    }

    // Windows'ta PHP openssl.cnf'yi bulamayabilir; PHP ile gelen yapılandırma dosyası varsa ona işaret edilir
    private function newKey()
    {
        $options = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];
        $cnf = dirname(PHP_BINARY) . '/extras/ssl/openssl.cnf';
        if (is_file($cnf)) {
            $options['config'] = $cnf;
        }

        return openssl_pkey_new($options);
    }

    private function b64(string $bin): string
    {
        return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
    }

    private function token(array $override = [], $signWith = null, string $kid = 'kid-1', string $alg = 'RS256'): string
    {
        $claims = array_merge([
            'iss' => 'https://accounts.google.com', 'aud' => self::CLIENT, 'exp' => time() + 3600,
            'sub' => 'google-sub-1', 'email' => 'yeni@example.com', 'email_verified' => true, 'name' => 'Yeni Kişi',
        ], $override);
        $head = $this->b64(json_encode(['alg' => $alg, 'kid' => $kid, 'typ' => 'JWT']));
        $body = $this->b64(json_encode($claims));
        openssl_sign("{$head}.{$body}", $sig, $signWith ?? $this->key, OPENSSL_ALGO_SHA256);

        return "{$head}.{$body}." . $this->b64($sig);
    }

    private function login(string $token)
    {
        return $this->postJson('/api/auth/google', ['credential' => $token]);
    }

    public function test_new_google_user_is_created_verified_and_can_use_the_api(): void
    {
        $res = $this->login($this->token())->assertOk();

        $this->assertTrue($res->json('is_new'));
        $user = User::where('email', 'yeni@example.com')->first();
        $this->assertSame('Yeni Kişi', $user->name);
        $this->assertSame('google-sub-1', $user->google_id);
        $this->assertNotNull($user->email_verified_at);
        $this->assertArrayNotHasKey('google_id', $res->json('user')); // kimlik yanıtta dönmez

        $this->app['auth']->forgetGuards();
        $this->withToken($res->json('access_token'))->getJson('/api/user')->assertOk()->assertJsonPath('email', 'yeni@example.com');
    }

    public function test_returning_google_user_logs_in_without_creating_a_duplicate(): void
    {
        $this->login($this->token())->assertOk();
        $again = $this->login($this->token())->assertOk();

        $this->assertFalse($again->json('is_new'));
        $this->assertSame(1, User::count());
    }

    public function test_verified_existing_account_is_linked_and_keeps_its_password(): void
    {
        $user = User::factory()->create(['email' => 'yeni@example.com', 'password' => 'eskisifre1']);

        $this->login($this->token())->assertOk();

        $this->assertSame('google-sub-1', $user->fresh()->google_id);
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', ['email' => 'yeni@example.com', 'password' => 'eskisifre1'])->assertOk();
    }

    public function test_unverified_preregistered_account_is_taken_over_and_squatter_credentials_die(): void
    {
        $squatter = User::factory()->unverified()->create(['email' => 'yeni@example.com', 'password' => 'saldirgan123']);
        $oldTokenId = $squatter->createToken('saldirgan')->accessToken->id;

        $this->login($this->token())->assertOk();

        $this->assertNull(\Laravel\Sanctum\PersonalAccessToken::find($oldTokenId)); // eski (saldırgan) oturum kapandı
        $this->assertSame(1, $squatter->tokens()->count()); // yalnızca yeni Google oturumu var
        $this->assertNotNull($squatter->fresh()->email_verified_at);
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', ['email' => 'yeni@example.com', 'password' => 'saldirgan123'])->assertStatus(401);
    }

    public function test_invalid_tokens_are_rejected(): void
    {
        $other = $this->newKey();
        $cases = [
            'yanlış imza (başka anahtar)' => $this->token([], $other),
            'yanlış hedef (aud)' => $this->token(['aud' => 'baska-istemci']),
            'süresi geçmiş' => $this->token(['exp' => time() - 10]),
            'sahte yayıncı' => $this->token(['iss' => 'https://kotu.example.com']),
            'e-posta doğrulanmamış' => $this->token(['email_verified' => false]),
            'sub yok' => $this->token(['sub' => '']),
            'bilinmeyen kid' => $this->token([], null, 'kid-yok'),
            'alg none' => $this->token([], null, 'kid-1', 'none'),
            'çöp' => 'abc.def',
        ];

        foreach ($cases as $name => $jwt) {
            $this->login($jwt)->assertStatus(401);
            $this->assertSame(0, User::count(), "Kullanıcı oluşmamalı: {$name}");
        }
    }

    public function test_tampered_payload_fails_signature_check_and_missing_config_disables_login(): void
    {
        [$h, $p, $s] = explode('.', $this->token());
        $forged = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
        $forged['email'] = 'kurban@example.com';
        $this->login($h . '.' . $this->b64(json_encode($forged)) . '.' . $s)->assertStatus(401);

        config(['services.google.client_id' => null]);
        $this->login($this->token())->assertStatus(401);
        $this->postJson('/api/auth/google', [])->assertStatus(422);
        $this->assertSame(0, User::count());
    }

    public function test_suspended_google_user_cannot_log_in(): void
    {
        $this->login($this->token())->assertOk();
        User::where('email', 'yeni@example.com')->first()->forceFill(['suspended_at' => now()])->save();

        $this->login($this->token())->assertStatus(403);
    }
}
