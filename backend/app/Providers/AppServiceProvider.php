<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // doğrulama bağlantısı imzalı ve süreli (60 dk); `email.verify` rotası doğrulayıp ön yüze yönlendirir
        VerifyEmail::createUrlUsing(fn ($user) => URL::temporarySignedRoute('email.verify', now()->addMinutes(60), [
            'id' => $user->getKey(),
            'hash' => sha1($user->getEmailForVerification()),
        ]));

        // Şifre sıfırlama e-postası: bkz. User::sendPasswordResetNotification() (Türkçe, markalı; bağlantıyı kendisi kurar)
    }
}
