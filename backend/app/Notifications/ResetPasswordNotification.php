<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// Şifre sıfırlama e-postası: Türkçe ve TakasCo markasına uygun metin.
// Laravel'in varsayılan İngilizce Illuminate\Auth\Notifications\ResetPassword bildirimi yerine
// User::sendPasswordResetNotification() üzerinden kullanılır; bağlantıyı kendisi kurar
// (AppServiceProvider'daki ResetPassword::createUrlUsing artık bu sınıf için geçerli değil).
class ResetPasswordNotification extends Notification
{
    public function __construct(public string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim((string) config('app.frontend_url'), '/')
            . '/reset-password?token=' . $this->token
            . '&email=' . urlencode($notifiable->getEmailForPasswordReset());

        $minutes = (int) config('auth.passwords.' . config('auth.defaults.passwords', 'users') . '.expire', 60);

        return (new MailMessage)
            ->subject('TakasCo — Şifre sıfırlama isteği')
            ->greeting('Merhaba ' . $notifiable->name . ',')
            ->line('Hesabın için bir şifre sıfırlama isteği aldık.')
            ->action('Şifremi Sıfırla', $url)
            ->line("Bu bağlantı {$minutes} dakika boyunca geçerlidir.")
            ->line('Bu isteği sen yapmadıysan hiçbir şey yapmana gerek yok, şifren değişmeden kalır.')
            ->line('Not: Yeni bir sıfırlama e-postası istersen, önceki e-postadaki bağlantı otomatik olarak geçersiz olur — en son gelen e-postayı kullan.')
            ->salutation('Sevgiyle, TakasCo Ekibi');
    }
}
