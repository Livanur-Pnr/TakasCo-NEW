<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

// E-postadaki imzalı bağlantı (giriş gerektirmez, `signed` middleware imzayı/süreyi doğrular) hesabı doğrular ve ön yüze yönlendirir.
class EmailVerificationController extends Controller
{
    public function verify(Request $request, int $id, string $hash)
    {
        $user = User::findOrFail($id);

        if (!hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            abort(403, 'Doğrulama bağlantısı geçersiz.');
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        return redirect(rtrim((string) config('app.frontend_url'), '/') . '/email-verified');
    }

    // Giriş yapmış kullanıcı yeni bir doğrulama e-postası ister (API)
    public function resend(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'E-posta adresin zaten doğrulanmış.']);
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Doğrulama e-postası şu an gönderilemedi. Lütfen daha sonra tekrar dene.'], 503);
        }

        return response()->json(['message' => 'Doğrulama bağlantısı e-posta adresine gönderildi.']);
    }
}
