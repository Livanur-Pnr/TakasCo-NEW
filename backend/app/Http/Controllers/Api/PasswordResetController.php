<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ResetPasswordCodeNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

// Şifremi unuttum: hesabın var olup olmadığı sızdırılmaz (her zaman aynı yanıt).
// 6 haneli kod `password_reset_tokens` tablosunda (Laravel'in standart tablosu, ama burada
// uzun rastgele token yerine hash'lenmiş 6 haneli kod tutulur) 10 dakika geçerli tutulur.
// Not: Web/yönetici panelindeki bağlantı tabanlı akış (routes/auth.php, Password::sendResetLink)
// bu tabloyu ayrıca kendi (uzun) token'ıyla kullanır — ikisi birbirinden bağımsızdır.
class PasswordResetController extends Controller
{
    private const CODE_EXPIRE_MINUTES = 10;

    public function forgot(Request $request)
    {
        $data = $request->validate(['email' => 'required|email'], [
            'email.required' => 'E-posta adresini gir.',
            'email.email' => 'Geçerli bir e-posta adresi gir.',
        ]);

        $user = User::where('email', $data['email'])->first();

        if ($user) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($code), 'created_at' => now()]
            );
            try {
                $user->notify(new ResetPasswordCodeNotification($code));
            } catch (\Throwable $e) {
                report($e); // posta hatası kullanıcıya sızdırılmaz
            }
        }

        return response()->json(['message' => 'Bu e-posta adresi kayıtlıysa şifre sıfırlama kodu gönderildi.']);
    }

    public function reset(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'password.min' => 'Şifre en az 8 karakter olmalıdır.',
            'password.confirmed' => 'Şifreler eşleşmiyor.',
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $data['email'])->first();

        $invalid = !$record
            || !Hash::check($data['code'], $record->token)
            || abs(now()->diffInMinutes($record->created_at)) > self::CODE_EXPIRE_MINUTES;

        if ($invalid) {
            return response()->json(['message' => 'Kod hatalı veya süresi dolmuş.'], 422);
        }

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            return response()->json(['message' => 'Kod hatalı veya süresi dolmuş.'], 422);
        }

        $user->forceFill(['password' => $data['password']])->save(); // modeldeki 'hashed' cast şifreyi hashler
        $user->tokens()->delete(); // eski oturumlar kapanır
        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json(['message' => 'Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.']);
    }
}
