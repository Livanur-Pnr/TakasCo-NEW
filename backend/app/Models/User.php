<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Laravel\Sanctum\HasApiTokens;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'phone_number', 'email', 'password', 'profile_photo_path', 'address_title', 'city', 'district'])]
#[Hidden(['password', 'remember_token', 'google_id', 'email_verification_code', 'email_verification_code_expires_at'])]
class User extends Authenticatable implements MustVerifyEmail
{
    //hasApiTokens=API üzerinden güvenli bir şekilde kullanıcı girişi yapmasını sağlayan token üretme
    use HasApiTokens, HasFactory, Notifiable;

    // Şifre sıfırlama e-postasını Laravel'in varsayılan İngilizce bildirimi yerine Türkçe/markalı olanla gönderir
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }

    // 6 haneli e-posta doğrulama kodu üretir, 10 dakika geçerli kılar ve markalı bildirimle gönderir
    public function sendEmailVerificationCode(): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $this->forceFill([
            'email_verification_code' => $code,
            'email_verification_code_expires_at' => now()->addMinutes(10),
        ])->save();
        $this->notify(new \App\Notifications\EmailVerificationCodeNotification($code));
    }

    /**
     *hangi veri tipine dönüştürüleceğini belirleme
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'email_verification_code_expires_at' => 'datetime',
            'is_admin' => 'boolean',
            'email_notifications' => 'boolean',
            'interest_category_ids' => 'array',
            'password' => 'hashed',
        ];
    }
    //kullanıcının birden fazla ürün/ilan oluşturma
    public function products()
    {
        return $this->hasMany(Product::class);
    }
    //kullanıcı birden fazla teklif yapabilir
    public function sentTrades()
    {
        return $this->hasMany(Trade::class, 'sender_id');
    }
    //kullanıcıya birden fazla takas tekifi gelebilir    
    public function receivedTrades()
    {
        return $this->hasMany(Trade::class, 'receiver_id');
    }
}
