<?php

namespace Tests\Feature;

use Tests\TestCase;

class CaptchaPageTest extends TestCase
{
    public function test_captcha_page_renders_the_widget_for_app_redirects(): void
    {
        config(['services.recaptcha.site_key' => 'site-key-123']);

        foreach (['takasco://captcha', 'exp://192.168.1.20:8081/--/captcha'] as $redirect) {
            $this->get('/captcha?redirect=' . urlencode($redirect))
                ->assertOk()
                ->assertHeader('X-Frame-Options', 'DENY')
                ->assertSee('site-key-123')
                ->assertSee('Robot olmadığını doğrula');
        }
    }

    public function test_captcha_page_refuses_web_or_script_redirects_so_tokens_cannot_leak(): void
    {
        config(['services.recaptcha.site_key' => 'site-key-123']);

        foreach (['https://evil.example/steal', 'javascript:alert(1)', '', '//evil.example'] as $redirect) {
            $this->get('/captcha?redirect=' . urlencode($redirect))->assertStatus(400);
        }
    }

    public function test_captcha_page_is_unavailable_when_recaptcha_is_not_configured(): void
    {
        config(['services.recaptcha.site_key' => null]);

        $this->get('/captcha?redirect=' . urlencode('takasco://captcha'))->assertStatus(400);
    }
}
