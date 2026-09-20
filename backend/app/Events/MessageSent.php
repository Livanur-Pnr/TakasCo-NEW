<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

// Yeni mesajı konuşma kanalına ve alıcının kişisel kanalına yayınlar (kuyruk işçisi gerekmez: ShouldBroadcastNow).
// Yükte mesaj metni yoktur; istemci olayı alınca API'den okur, böylece yetki ve okundu bilgisi tek yerden yönetilir.
class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public Message $message, public int $recipientId)
    {
    }

    /** @return Channel[] */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->message->conversation_id),
            new PrivateChannel('App.Models.User.' . $this->recipientId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->message->id, 'conversation_id' => $this->message->conversation_id, 'sender_id' => $this->message->sender_id];
    }
}
