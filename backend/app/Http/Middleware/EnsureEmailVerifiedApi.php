<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// E-postasını doğrulamamış kullanıcılar, doğrulama akışını tamamlayabilecekleri
// birkaç rota dışında API'yi kullanamaz (bkz. AuthController::register/verifyEmailCode).
class EnsureEmailVerifiedApi
{
    private const ALLOWED_WHILE_UNVERIFIED = [
        'api/user',
        'api/user/profile',
        'api/user/verify-email-code',
        'api/user/resend-verification-code',
        'api/email/verification-notification',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !$user->hasVerifiedEmail() && !$request->is(...self::ALLOWED_WHILE_UNVERIFIED)) {
            return response()->json([
                'message' => 'Devam etmeden önce e-posta adresini doğrulaman gerekiyor.',
                'email_verified' => false,
            ], 403);
        }

        return $next($request);
    }
}
