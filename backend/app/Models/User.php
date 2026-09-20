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
#[Hidden(['password', 'remember_token', 'google_id'])]
class User extends Authenticatable implements MustVerifyEmail
{
    //hasApiTokens=API üzerinden güvenli bir şekilde kullanıcı girişi yapmasını sağlayan token üretme
    use HasApiTokens, HasFactory, Notifiable;

    /**
     *hangi veri tipine dönüştürüleceğini belirleme
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
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
