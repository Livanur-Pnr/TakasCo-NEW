<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

// Şifremi unuttum akışında gönderilen 6 haneli kod (bkz. PasswordResetController).
// Mobil uygulamada tıklanması gereken bir bağlantı yerine uygulama içinde girilecek bir kod
// kullanılır — deep-link güvenilirliği sorunlarını önler (bkz. EmailVerificationCodeNotification).
// NOT: Bu, web/yönetici panelindeki bağlantı tabanlı akıştan (ResetPasswordNotification, Password::sendResetLink)
// tamamen ayrıdır; o akış dokunulmadan kalır.
class ResetPasswordCodeNotification extends Notification
{
    public function __construct(public string $code)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $spaced = implode(' ', str_split($this->code));

        return (new MailMessage)
            ->subject('TakasCo — Şifre sıfırlama kodun: ' . $this->code)
            ->greeting('Merhaba ' . $notifiable->name . ',')
            ->line('Hesabın için bir şifre sıfırlama isteği aldık. Devam etmek için aşağıdaki kodu uygulamaya gir:')
            ->line(new HtmlString(
                '<div style="text-align:center;margin:8px 0 20px;">' .
                '<span style="display:inline-block;padding:14px 22px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;' .
                'font-size:30px;font-weight:800;letter-spacing:6px;color:#14532D;">' . e($spaced) . '</span>' .
                '</div>'
            ))
            ->line('Bu kod 10 dakika boyunca geçerlidir.')
            ->line('Bu isteği sen yapmadıysan hiçbir şey yapmana gerek yok, şifren değişmeden kalır.')
            ->salutation('Sevgiyle, TakasCo Ekibi');
    }
}
