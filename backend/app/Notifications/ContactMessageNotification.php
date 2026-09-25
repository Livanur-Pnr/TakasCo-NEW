<?php

namespace App\Notifications;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// İletişim formu gönderilince tüm admin kullanıcılara (is_admin=true) giden e-posta bildirimi.
// "Yanıtla" tuşuna basınca mesajı gönderen kişinin e-postasına gider (replyTo).
// Kuyruğa alınır: gönderen kullanıcı bu e-postayı beklemiyor, admin'e ulaşması birkaç saniye gecikse sorun olmaz.
class ContactMessageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public ContactMessage $message)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('TakasCo — Yeni iletişim mesajı: ' . $this->message->subject)
            ->replyTo($this->message->email, $this->message->name)
            ->greeting('Merhaba ' . $notifiable->name . ',')
            ->line('İletişim formundan yeni bir mesaj geldi.')
            ->line('Gönderen: ' . $this->message->name . ' (' . $this->message->email . ')')
            ->line('Konu: ' . $this->message->subject)
            ->line($this->message->message)
            ->line('Bu e-postayı doğrudan yanıtlarsan cevabın gönderene ulaşır.')
            ->action('Yönetim Panelinde Gör', rtrim((string) config('app.frontend_url'), '/') . '/admin');
    }
}
