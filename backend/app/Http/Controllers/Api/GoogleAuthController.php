<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GoogleTokenVerifier;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Google ile giriş/kayıt (web): istemci Google Identity Services'ten aldığı ID token'ı gönderir; backend imzayı ve talepleri doğrular.
class GoogleAuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate(['credential' => 'required|string|max:4096']);

        $claims = GoogleTokenVerifier::verify($data['credential'], config('services.google.client_id'));
        if (!$claims) {
            return response()->json(['message' => 'Google girişi doğrulanamadı. Lütfen tekrar dene.'], 401);
        }

        $isNew = false;
        $user = User::where('google_id', $claims['sub'])->first();

        if (!$user) {
            $user = User::where('email', $claims['email'])->first();

            if ($user) {
                // Google e-postayı doğruladı. Hesap e-postası hiç doğrulanmamışsa (başkası önceden kayıt açmış olabilir)
                // eski şifre geçersiz kılınır ve oturumları kapatılır; böylece e-postanın gerçek sahibi hesabı devralır.
                if (!$user->hasVerifiedEmail()) {
                    $user->forceFill(['password' => Str::random(40)]);
                    $user->tokens()->delete();
                }
                $user->forceFill(['google_id' => $claims['sub']]);
                if (!$user->hasVerifiedEmail()) {
                    $user->markEmailAsVerified();
                }
                $user->save();
            } else {
                $user = User::create([
                    'name' => Str::limit($claims['name'] ?? Str::before($claims['email'], '@'), 255, ''),
                    'email' => $claims['email'],
                    'phone_number' => '',
                    'password' => Str::random(40), // Google hesabı parolasız; istenirse "şifremi unuttum" ile parola belirlenir
                ]);
                $user->forceFill(['google_id' => $claims['sub'], 'email_verified_at' => now()])->save();
                $isNew = true;
            }
        }

        if ($user->suspended_at) {
            return response()->json(['message' => 'Hesabın askıya alındı.'], 403);
        }

        return response()->json([
            'message' => 'Giriş başarılı!',
            'access_token' => $user->createToken('auth_token')->plainTextToken,
            'token_type' => 'Bearer',
            'user' => $user->fresh(),
            'is_new' => $isNew,
        ]);
    }
}
