<?php
//Laravel'in test ve sahte veri üretim mekanizması
namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * performans optimizasyonu: her sahte kullanıcı için şifreyi tekrar tekrar hash'leyerek sunucuyu yormamak adına şifreyi hafızada tutar
     */
    protected static ?string $password;

    /**
     * Sahte bir kullanıcının sahip olacağı varsayılan veri şablonunu (sütun bazlı) tanımlar
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone_number' => fake()->phoneNumber(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Durum Belirteci (State): İstenirse e-postası onaylanmamış sahte kullanıcılar üretilmesini sağlayan özel bir metot
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
