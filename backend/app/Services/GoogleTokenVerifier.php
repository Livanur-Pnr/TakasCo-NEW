<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

// Google ID token (JWT, RS256) doğrulaması: imza Google'ın yayınladığı genel anahtarlarla (JWKS) yerelde kontrol edilir,
// ardından iss/aud/exp/email_verified talepleri denetlenir. Ek paket gerektirmez (openssl + HTTP).
class GoogleTokenVerifier
{
    private const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
    private const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    /** @return array<string, mixed>|null doğrulanmış talepler; geçersizse null */
    public static function verify(string $idToken, ?string $clientId): ?array
    {
        if (!$clientId) {
            return null; // Google girişi yapılandırılmamış
        }
        $parts = explode('.', $idToken);
        if (count($parts) !== 3) {
            return null;
        }
        [$h64, $p64, $s64] = $parts;
        $header = json_decode(self::b64d($h64), true);
        $claims = json_decode(self::b64d($p64), true);
        if (!is_array($header) || !is_array($claims) || ($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) {
            return null;
        }

        $jwk = collect(self::keys())->firstWhere('kid', $header['kid']);
        if (!$jwk || ($jwk['kty'] ?? '') !== 'RSA') {
            return null;
        }
        $pem = self::pemFromJwk($jwk['n'], $jwk['e']);
        if (openssl_verify("{$h64}.{$p64}", self::b64d($s64), $pem, OPENSSL_ALGO_SHA256) !== 1) {
            return null;
        }

        if (!in_array($claims['iss'] ?? '', self::ISSUERS, true)
            || ($claims['aud'] ?? null) !== $clientId
            || (int) ($claims['exp'] ?? 0) < time()
            || empty($claims['sub'])
            || empty($claims['email'])
            || !filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return null;
        }

        return $claims;
    }

    /** @return array<int, array<string, mixed>> */
    private static function keys(): array
    {
        return Cache::remember('google.jwks', 3600, function () {
            $res = Http::timeout(5)->get(self::JWKS_URL);

            return $res->successful() ? ($res->json('keys') ?? []) : [];
        });
    }

    private static function b64d(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4)) ?: '';
    }

    // JWK (n, e) → PEM (SubjectPublicKeyInfo) dönüşümü
    private static function pemFromJwk(string $n, string $e): string
    {
        $int = function (string $bytes): string {
            if ($bytes !== '' && (ord($bytes[0]) & 0x80)) {
                $bytes = "\x00" . $bytes; // pozitif tam sayı: en üst bit doluysa 0x00 eklenir
            }

            return "\x02" . self::len($bytes) . $bytes;
        };
        $body = $int(self::b64d($n)) . $int(self::b64d($e));
        $rsaKey = "\x30" . self::len($body) . $body;
        $algorithm = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00"; // rsaEncryption + NULL
        $bitString = "\x03" . self::len("\x00" . $rsaKey) . "\x00" . $rsaKey;
        $spki = "\x30" . self::len($algorithm . $bitString) . $algorithm . $bitString;

        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    private static function len(string $content): string
    {
        $length = strlen($content);
        if ($length < 128) {
            return chr($length);
        }
        $bytes = ltrim(pack('N', $length), "\x00");

        return chr(0x80 | strlen($bytes)) . $bytes;
    }
}
