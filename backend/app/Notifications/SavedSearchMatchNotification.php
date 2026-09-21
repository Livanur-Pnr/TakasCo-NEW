<?php

namespace App\Notifications;

use App\Models\Product;
use App\Models\SavedSearch;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

// kayıtlı aramaya uyan yeni ilan için uygulama içi bildirim
class SavedSearchMatchNotification extends Notification
{
    public function __construct(public Product $product, public SavedSearch $search)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return (new BroadcastMessage($this->toArray($notifiable)))->onConnection('sync');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'saved_search_match',
            'title' => 'Kayıtlı aramana yeni ilan',
            'body' => "\"{$this->product->title}\" ilanı \"{$this->search->label()}\" aramana uyuyor.",
            'product_id' => $this->product->id,
        ];
    }
}
