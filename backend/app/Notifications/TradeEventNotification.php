<?php

namespace App\Notifications;

use App\Models\Trade;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// Takas olayları (teklif geldi / kabul / red / geri çekme) için uygulama içi bildirim
class TradeEventNotification extends Notification
{
    public const OFFER_RECEIVED = 'offer_received';
    public const OFFER_ACCEPTED = 'offer_accepted';
    public const OFFER_REJECTED = 'offer_rejected';
    public const OFFER_CANCELLED = 'offer_cancelled';
    public const OFFER_COUNTERED = 'offer_countered';
    public const OFFER_SHIPPED = 'offer_shipped';
    public const OFFER_DELIVERED = 'offer_delivered';

    public function __construct(public string $event, public Trade $trade)
    {
    }

    // e-posta yalnızca teklif geldi / kabul edildi olaylarında ve kullanıcı kapatmadıysa gider
    public function via(object $notifiable): array
    {
        $mailEvents = [self::OFFER_RECEIVED, self::OFFER_ACCEPTED, self::OFFER_COUNTERED, self::OFFER_SHIPPED, self::OFFER_DELIVERED];

        return in_array($this->event, $mailEvents, true) && ($notifiable->email_notifications ?? true) && $notifiable->email
            ? ['database', 'broadcast', 'mail']
            : ['database', 'broadcast'];
    }

    // zil simgesinin anında güncellenmesi için yayın; kuyruk işçisi gerekmez
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return (new BroadcastMessage($this->toArray($notifiable)))->onConnection('sync');
    }

    // takas ortağının iletişim bilgisi e-postaya konmaz; yalnızca uygulama içinde paylaşılır
    public function toMail(object $notifiable): MailMessage
    {
        $data = $this->toArray($notifiable);

        return (new MailMessage)
            ->subject('TakasCo — ' . $data['title'])
            ->greeting('Merhaba ' . $notifiable->name . ',')
            ->line($data['body'])
            ->line('Ayrıntılar için TakasCo uygulamasında Tekliflerim bölümüne bakabilirsin.')
            ->line('Bu e-postaları Ayarlar sayfasından kapatabilirsin.');
    }

    public function toArray(object $notifiable): array
    {
        $trade = $this->trade->loadMissing(['sender:id,name', 'receiver:id,name', 'offeredProduct:id,title', 'requestedProduct:id,title', 'extraProducts']);
        $sender = $trade->sender?->name ?? 'Bir kullanıcı';
        $receiver = $trade->receiver?->name ?? 'Bir kullanıcı';
        $offered = $trade->offeredProduct?->title ?? 'ürününü';
        if ($trade->extraProducts->isNotEmpty()) {
            $offered .= ' ve ' . $trade->extraProducts->count() . ' ürün daha';
        }
        $requested = $trade->requestedProduct?->title ?? 'ilanın';

        // nakit farkı cümlesi (teklifi gönderen kişiye göre)
        $cash = '';
        if ($trade->cash_amount) {
            $amount = number_format((float) $trade->cash_amount, 0, ',', '.') . ' TL';
            $cash = $trade->cash_direction === 'sender_pays'
                ? " {$sender} ayrıca {$amount} nakit ödemeyi öneriyor."
                : " {$sender}, {$amount} nakit farkı istiyor.";
        }

        [$title, $body] = match ($this->event) {
            self::OFFER_COUNTERED => ['Karşı teklif geldi', "{$sender}, teklifine karşı teklif gönderdi: \"{$offered}\" ürününe karşılık \"{$requested}\" ürününü istiyor.{$cash}"],
            self::OFFER_RECEIVED => ['Yeni takas teklifi', "{$sender}, \"{$requested}\" ilanın için \"{$offered}\" ürününü teklif etti.{$cash}"],
            self::OFFER_ACCEPTED => ['Teklifin kabul edildi', "{$receiver}, \"{$requested}\" için gönderdiğin teklifi kabul etti. İletişim bilgileri paylaşıldı."],
            self::OFFER_REJECTED => ['Teklifin reddedildi', "{$receiver}, \"{$requested}\" için gönderdiğin teklifi reddetti."],
            self::OFFER_CANCELLED => ['Teklif geri çekildi', "{$sender}, \"{$requested}\" ilanın için gönderdiği teklifi geri çekti."],
            self::OFFER_SHIPPED => ['Ürünün kargoya verildi', "{$receiver}, \"{$requested}\" ürününü kargoya verdi" . ($trade->shipping_carrier ? " ({$trade->shipping_carrier}" . ($trade->tracking_number ? ", takip no: {$trade->tracking_number}" : '') . ')' : '') . '.'],
            self::OFFER_DELIVERED => ['Ürün teslim edildi', "\"{$requested}\" ürünün teslim edildi olarak işaretlendi."],
        };

        return [
            'type' => $this->event,
            'title' => $title,
            'body' => $body,
            'trade_id' => $trade->id,
        ];
    }
}
