<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

// Mobil uygulama (iOS/Android) için "Ben robot değilim" sayfası. Google reCAPTCHA widget'ı yalnızca tarayıcıda
// çalıştığından uygulama bu sayfayı uygulama içi tarayıcıda açar; kutu işaretlenince token, uygulamanın kendi
// adresine (takasco:// ya da Expo Go'da exp://) yönlendirilerek geri verilir. Token'ın asıl doğrulaması yine
// AuthController::verifyRecaptcha() içinde Google'da yapılır; bu sayfa yalnızca token'ı üretir.
class CaptchaController extends Controller
{
    // Token'ın yalnızca uygulamaya dönmesi için izin verilen şemalar (açık yönlendirme / token sızması önlenir)
    private const ALLOWED_SCHEMES = ['takasco', 'exp', 'exps'];

    public function show(Request $request)
    {
        $siteKey = config('services.recaptcha.site_key');
        $redirect = (string) $request->query('redirect', '');
        $scheme = strtolower((string) parse_url($redirect, PHP_URL_SCHEME));

        if (!$siteKey || !in_array($scheme, self::ALLOWED_SCHEMES, true)) {
            abort(400, 'Geçersiz doğrulama isteği.');
        }

        return response()
            ->view('captcha', ['siteKey' => $siteKey, 'redirect' => $redirect])
            ->header('Cache-Control', 'no-store')
            ->header('X-Frame-Options', 'DENY');
    }
}
