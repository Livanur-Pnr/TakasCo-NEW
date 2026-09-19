<?php
//web arayüzü üzerinden yapılan giriş isteklerini yöneten Form Doğrulama ve Güvenlik sınıfı, yanlış şifre deneme) saldırılarına karşı korur.
namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * istek atmaya yetki var mı kontrolu
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * zorunlu kurallar
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * giriş bilgileri doğrulama
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {//çok fazla hatalı deneme yapıldığını kontrol
        $this->ensureIsNotRateLimited();
        //bilgiler doğruysa sisteme giriş yap
        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }
        // giriş başarılıysa: Bu kullanıcının geçmişteki tüm rate limiti sıfırla
        RateLimiter::clear($this->throttleKey());
    }

    /**
     * // rate limit giriş yapma engelleme
    
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * rate limit için sınırlandırma anahtarı
     */
    public function throttleKey(): string
    {// kullanıcının e-postasını küçük harfe çevirir ve ip adresiyle birleştirir (Örn: ahmet@example.com|127.0.0.1)
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
