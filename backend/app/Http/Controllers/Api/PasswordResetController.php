<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

// Şifremi unuttum: hesabın var olup olmadığı sızdırılmaz (her zaman aynı yanıt); bağlantı e-postayla gider.
class PasswordResetController extends Controller
{
    public function forgot(Request $request)
    {
        $data = $request->validate(['email' => 'required|email'], [
            'email.required' => 'E-posta adresini gir.',
            'email.email' => 'Geçerli bir e-posta adresi gir.',
        ]);

        try {
            Password::sendResetLink(['email' => $data['email']]);
        } catch (\Throwable $e) {
            report($e); // posta hatası kullanıcıya sızdırılmaz
        }

        return response()->json(['message' => 'Bu e-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi.']);
    }

    public function reset(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'password.min' => 'Şifre en az 8 karakter olmalıdır.',
            'password.confirmed' => 'Şifreler eşleşmiyor.',
        ]);

        $status = Password::reset(
            $data + ['password_confirmation' => $request->input('password_confirmation')],
            function ($user, string $password) {
                $user->forceFill(['password' => $password])->save(); // modeldeki 'hashed' cast şifreyi hashler
                $user->tokens()->delete(); // eski oturumlar kapanır
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.'], 422);
        }

        return response()->json(['message' => 'Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.']);
    }
}
