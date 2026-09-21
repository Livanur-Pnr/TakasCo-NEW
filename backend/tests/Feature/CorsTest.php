<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsTest extends TestCase
{
    public function test_only_the_configured_web_origin_is_allowed_to_call_the_api(): void
    {
        config(['cors.allowed_origins' => ['https://takasco.example']]);
        $preflight = fn (string $origin) => $this->call('OPTIONS', '/api/products', [], [], [], [
            'HTTP_ORIGIN' => $origin,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization',
        ]);

        $allowed = $preflight('https://takasco.example');
        $this->assertSame('https://takasco.example', $allowed->headers->get('Access-Control-Allow-Origin'));

        // tek izinli adres varken kütüphane başlığa o adresi yazar; tarayıcı, istek adresiyle uyuşmadığı için engeller
        $denied = $preflight('https://kotu-site.example');
        $this->assertNotSame('https://kotu-site.example', $denied->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $denied->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_real_requests_carry_the_allow_origin_header_only_for_the_allowed_origin(): void
    {
        config(['cors.allowed_origins' => ['https://takasco.example']]);

        $ok = $this->getJson('/api/categories', ['Origin' => 'https://takasco.example']);
        $this->assertSame('https://takasco.example', $ok->headers->get('Access-Control-Allow-Origin'));

        $other = $this->getJson('/api/categories', ['Origin' => 'https://kotu-site.example']);
        $this->assertNotSame('https://kotu-site.example', $other->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $other->headers->get('Access-Control-Allow-Origin'));
    }
}
