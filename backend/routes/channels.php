<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

// kişisel kanal: yalnızca kullanıcının kendisi dinleyebilir
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// konuşma kanalı: yalnızca konuşmanın iki katılımcısı dinleyebilir (başkasının konuşması için yetki reddedilir)
Broadcast::channel('conversation.{id}', function ($user, $id) {
    $conversation = Conversation::find($id);

    return $conversation && $conversation->hasParticipant((int) $user->id);
});
