<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;



class AuthController extends Controller
{
    public function register(Request $request){
        // gelen veriyi doğrulama
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone_number' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);
        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
    }
    $user = User::create([
        'name' => $request->name,
        'email' => $request->email,
        'phone_number' => $request->phone_number,
        'password' => Hash::make($request->password), // şifreyi hashledik
        'is_admin' => false,
    ]);
    // e-posta doğrulama kodu; posta hatası kaydı engellemez
    try {
        $user->sendEmailVerificationCode();
    } catch (\Throwable $e) {
        report($e);
    }
    //  app için token oluşturduk
    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Kullanıcı başarıyla oluşturuldu.',
        'access_token' => $token,
        'token_type' => 'Bearer',
        'user' => $user
    ]);
}
public function login(Request $request)
{
    // önce gelen giriş bilgilerini doğrula
    $validator = Validator::make($request->all(), [
        'email' => 'required|string|email',
        'password' => 'required|string',
    ]);

    if ($validator->fails()) {
        return response()->json($validator->errors(), 422);
    }

    if (!$this->verifyRecaptcha($request->input('recaptcha_token'))) {
        return response()->json(['message' => 'Robot olmadığınızı doğrulayamadık. Lütfen tekrar deneyin.'], 422);
    }

    // kullanıcıyı bul
    $user = User::where('email', $request->email)->first();

    // kullanıcı var mı ve şifre doğru mu? (Hash kontrolü)
    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'message' => 'Giriş bilgileri hatalı!'
        ], 401);
    }

    if ($user->suspended_at) {
        return response()->json(['message' => 'Hesabın askıya alındı.'], 403);
    }

    // yeni bir anahtar (Token) üret
    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Giriş başarılı!',
        'access_token' => $token,
        'token_type' => 'Bearer',
        'user' => $user // app için kullanıcı bilgilerini de gönderelim
    ]);
}

// RECAPTCHA_SECRET_KEY tanımlı değilse (ör. yerel geliştirme) doğrulama hiç istenmez.
// Tanımlıysa token zorunludur ve Google'ın siteverify uctan gerçekten doğrulanır — istemci
// tarafındaki widget'ı atlayıp doğrudan API'ye istek atan botlara karşı asıl koruma budur.
private function verifyRecaptcha(?string $token): bool
{
    $secret = config('services.recaptcha.secret_key');
    if (!$secret) {
        return true;
    }
    if (!$token) {
        return false;
    }

    try {
        $response = Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
            'secret' => $secret,
            'response' => $token,
        ]);

        return (bool) ($response->json('success') ?? false);
    } catch (\Throwable $e) {
        report($e);
        return false;
    }
}

// Galeri/kamera kullanmak istemeyen kullanıcılar için hazır anonim avatarlar
const PRESET_AVATARS = [
    'avatars/avatar-1.png',
    'avatars/avatar-2.png',
    'avatars/avatar-3.png',
    'avatars/avatar-4.png',
    'avatars/avatar-5.png',
    'avatars/avatar-6.png',
];

public function updateProfile(Request $request)
{
    $user = $request->user();

    $validator = Validator::make($request->all(), [
        'name' => 'required|string|max:255',
        'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
        'phone_number' => 'required|string',
        'bio' => 'nullable|string|max:300',
        'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        'profile_photo_path' => ['nullable', 'string', Rule::in(self::PRESET_AVATARS)],
    ]);

    if ($validator->fails()) {
        return response()->json($validator->errors(), 422);
    }

    $user->name = $request->name;
    // e-posta adresi değişirse doğrulama sıfırlanır ve yeni adrese doğrulama bağlantısı gider
    $emailChanged = strcasecmp((string) $user->email, (string) $request->email) !== 0;
    $user->email = $request->email;
    if ($emailChanged) {
        $user->email_verified_at = null;
    }
    $user->phone_number = $request->phone_number;
    if ($request->has('bio')) {
        $user->bio = trim((string) $request->bio) ?: null;
    }

    // eski fotoğraf, ortak avatar değil de kullanıcıya özel yüklenmiş bir dosyaysa sil
    $oldPhotoIsOwnUpload = $user->profile_photo_path && str_starts_with($user->profile_photo_path, 'profiles/');

    if ($request->hasFile('profile_photo')) {
        $file = $request->file('profile_photo');
        $fileName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();

        $manager = new ImageManager(new Driver());
        $image = $manager->decode($file->getRealPath());
        $image->cover(400, 400); // Profil fotoğrafı kare olmalı

        Storage::disk('public')->makeDirectory('profiles');
        $image->save(storage_path('app/public/profiles/' . $fileName));

        if ($oldPhotoIsOwnUpload && Storage::disk('public')->exists($user->profile_photo_path)) {
            Storage::disk('public')->delete($user->profile_photo_path);
        }

        $user->profile_photo_path = 'profiles/' . $fileName;
    } elseif ($request->filled('profile_photo_path')) {
        // hazır avatarlardan biri seçildi, dosya yüklemeye gerek yok
        if ($oldPhotoIsOwnUpload && Storage::disk('public')->exists($user->profile_photo_path)) {
            Storage::disk('public')->delete($user->profile_photo_path);
        }

        $user->profile_photo_path = $request->profile_photo_path;
    }

    $user->save();

    if ($emailChanged) {
        try {
            $user->sendEmailVerificationCode();
        } catch (\Throwable $e) {
            report($e);
        }
    }

    return response()->json([
        'message' => 'Profil başarıyla güncellendi.',
        'user' => $user
    ]);
}

// Kayıt sırasında (ya da e-posta değiştiğinde) gönderilen 6 haneli kodu doğrular
public function verifyEmailCode(Request $request)
{
    $request->validate([
        'code' => 'required|string|size:6',
    ]);

    $user = $request->user();

    if ($user->hasVerifiedEmail()) {
        return response()->json(['message' => 'E-posta zaten doğrulanmış.', 'user' => $user]);
    }

    if (
        !$user->email_verification_code
        || !hash_equals($user->email_verification_code, $request->code)
        || !$user->email_verification_code_expires_at
        || $user->email_verification_code_expires_at->isPast()
    ) {
        return response()->json(['message' => 'Kod hatalı veya süresi dolmuş.'], 422);
    }

    $user->forceFill([
        'email_verified_at' => now(),
        'email_verification_code' => null,
        'email_verification_code_expires_at' => null,
    ])->save();

    return response()->json(['message' => 'E-posta doğrulandı.', 'user' => $user]);
}

// Kodun süresi dolduysa ya da e-posta gelmediyse yeni kod ister
public function resendVerificationCode(Request $request)
{
    $user = $request->user();

    if ($user->hasVerifiedEmail()) {
        return response()->json(['message' => 'E-posta zaten doğrulanmış.', 'user' => $user]);
    }

    $user->sendEmailVerificationCode();

    return response()->json(['message' => 'Doğrulama kodu yeniden gönderildi.']);
}

public function updatePassword(Request $request)
{
    $request->validate([
        'current_password' => 'required',
        'password' => 'required|string|min:8|confirmed',
    ]);

    $user = $request->user();

    if (!Hash::check($request->current_password, $user->password)) {
        return response()->json([
            'message' => 'Mevcut şifreniz yanlış.'
        ], 400);
    }

    $user->password = Hash::make($request->password);
    $user->save();

    return response()->json([
        'message' => 'Şifreniz başarıyla güncellendi.'
    ]);
}

    public function updatePreferences(Request $request)
    {
        $data = $request->validate(['email_notifications' => 'required|boolean']);
        $user = $request->user();
        $user->forceFill(['email_notifications' => $data['email_notifications']])->save();

        return response()->json(['message' => 'Tercihlerin kaydedildi.', 'user' => $user]);
    }

    public function updateAddress(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'address_title' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'district' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $user->address_title = $request->address_title;
        $user->city = $request->city;
        $user->district = $request->district;
        $user->save();

        return response()->json([
            'message' => 'Adres bilgileriniz başarıyla güncellendi.',
            'user' => $user
        ]);
    }
}
    //

