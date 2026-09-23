<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

// Kayıt sırasında (ya da e-posta değiştiğinde) gönderilen 6 haneli doğrulama kodu.
// Kod 10 dakika geçerlidir (bkz. User::sendEmailVerificationCode()).
class EmailVerificationCodeNotification extends Notification
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
            ->subject('TakasCo — Doğrulama kodun: ' . $this->code)
            ->greeting('Merhaba ' . $notifiable->name . ',')
            ->line('E-posta adresini doğrulamak için aşağıdaki kodu uygulamaya gir:')
            ->line(new HtmlString(
                '<div style="text-align:center;margin:8px 0 20px;">' .
                '<span style="display:inline-block;padding:14px 22px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;' .
                'font-size:30px;font-weight:800;letter-spacing:6px;color:#14532D;">' . e($spaced) . '</span>' .
                '</div>'
            ))
            ->line('Bu kod 10 dakika boyunca geçerlidir.')
            ->line('Bu isteği sen yapmadıysan hiçbir şey yapmana gerek yok.')
            ->salutation('Sevgiyle, TakasCo Ekibi');
    }
}
