<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Product;
use App\Models\User;
use App\Models\UserBlock;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    // kullanıcının konuşmaları: karşı taraf, son mesaj, okunmamış sayısı (en yeni konuşma üstte)
    public function index(Request $request)
    {
        $me = (int) $request->user()->id;

        $conversations = Conversation::where(fn ($q) => $q->where('user_one_id', $me)->orWhere('user_two_id', $me))
            ->with(['userOne:id,name,profile_photo_path', 'userTwo:id,name,profile_photo_path', 'product:id,title'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get();

        $ids = $conversations->pluck('id');
        $lastMessages = Message::whereIn('id', Message::whereIn('conversation_id', $ids)->selectRaw('MAX(id)')->groupBy('conversation_id'))
            ->get()->keyBy('conversation_id');
        $unread = Message::whereIn('conversation_id', $ids)->where('sender_id', '!=', $me)->whereNull('read_at')
            ->selectRaw('conversation_id, COUNT(*) as total')->groupBy('conversation_id')->pluck('total', 'conversation_id');

        $blocks = UserBlock::where('blocker_id', $me)->orWhere('blocked_id', $me)->get();

        $data = $conversations->map(function (Conversation $c) use ($me, $lastMessages, $unread, $blocks) {
            $other = $c->otherUser($me);
            $last = $lastMessages->get($c->id);

            return [
                'id' => $c->id,
                'other_user' => ['id' => $other->id, 'name' => $other->name, 'profile_photo_path' => $other->profile_photo_path],
                'product' => $c->product ? ['id' => $c->product->id, 'title' => $c->product->title] : null,
                'last_message' => $last ? ['body' => $last->body, 'sender_id' => $last->sender_id, 'created_at' => $last->created_at] : null,
                'unread_count' => (int) ($unread[$c->id] ?? 0),
                'blocked_by_me' => $blocks->contains(fn ($b) => (int) $b->blocker_id === $me && (int) $b->blocked_id === (int) $other->id),
                'blocked' => $blocks->contains(fn ($b) => in_array((int) $other->id, [(int) $b->blocker_id, (int) $b->blocked_id], true)),
                'last_message_at' => $c->last_message_at,
            ];
        });

        return response()->json(['data' => $data, 'unread_total' => (int) $unread->sum()]);
    }

    // iki kullanıcı (ve isteğe bağlı ilan) için konuşmayı bulur ya da oluşturur
    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'product_id' => 'nullable|integer|exists:products,id',
        ], [
            'user_id.exists' => 'Mesaj göndermek istediğin kullanıcı bulunamadı.',
        ]);

        $me = (int) $request->user()->id;
        $other = (int) $data['user_id'];

        if ($other === $me) {
            return response()->json(['message' => 'Kendine mesaj gönderemezsin.'], 422);
        }

        if (UserBlock::existsBetween($me, $other)) {
            return response()->json(['message' => 'Bu kullanıcıyla mesajlaşamazsın.'], 403);
        }

        $productId = $data['product_id'] ?? null;
        if ($productId && (int) Product::find($productId)->user_id !== $other) {
            // ilan, mesajlaşılan kişiye ait değilse ilişkilendirme yapılmaz (başkası adına ilan bağlanamaz)
            $productId = null;
        }

        $conversation = Conversation::firstOrCreate([
            'user_one_id' => min($me, $other),
            'user_two_id' => max($me, $other),
            'product_id' => $productId,
        ]);

        return response()->json(['id' => $conversation->id], $conversation->wasRecentlyCreated ? 201 : 200);
    }

    // sadece katılımcılar okuyabilir; karşı tarafın gönderdiği mesajlar okundu olur
    public function messages(Request $request, $id)
    {
        $conversation = $this->authorizedConversation($request, $id);
        $me = (int) $request->user()->id;

        Message::where('conversation_id', $conversation->id)->where('sender_id', '!=', $me)->whereNull('read_at')->update(['read_at' => now()]);

        // `after` verilirse yalnızca o mesajdan sonrakiler döner (artımlı polling: gereksiz veri taşınmaz)
        $query = Message::where('conversation_id', $conversation->id);
        $messages = $request->filled('after')
            ? $query->where('id', '>', (int) $request->input('after'))->orderBy('id')->limit(100)->get()
            : $query->orderByDesc('id')->limit(100)->get()->reverse()->values();
        $other = $conversation->otherUser($me);

        return response()->json([
            'other_user' => ['id' => $other->id, 'name' => $other->name, 'profile_photo_path' => $other->profile_photo_path],
            'blocked' => UserBlock::existsBetween($me, (int) $other->id),
            'blocked_by_me' => UserBlock::where(['blocker_id' => $me, 'blocked_id' => $other->id])->exists(),
            'product' => $conversation->product ? ['id' => $conversation->product->id, 'title' => $conversation->product->title] : null,
            'data' => $messages->map(fn (Message $m) => [
                'id' => $m->id, 'sender_id' => $m->sender_id, 'body' => $m->body, 'created_at' => $m->created_at, 'read_at' => $m->read_at,
            ]),
        ]);
    }

    public function send(Request $request, $id)
    {
        $conversation = $this->authorizedConversation($request, $id);
        $meId = (int) $request->user()->id;
        if (UserBlock::existsBetween($meId, (int) $conversation->otherUser($meId)->id)) {
            return response()->json(['message' => 'Bu konuşmaya mesaj gönderemezsin.'], 403);
        }
        $data = $request->validate(['body' => 'required|string|max:1000'], [
            'body.required' => 'Mesaj boş olamaz.',
            'body.max' => 'Mesaj en fazla 1000 karakter olabilir.',
        ]);

        $message = $conversation->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => trim($data['body']),
        ]);
        $conversation->update(['last_message_at' => $message->created_at]);

        return response()->json([
            'id' => $message->id, 'sender_id' => $message->sender_id, 'body' => $message->body,
            'created_at' => $message->created_at, 'read_at' => null,
        ], 201);
    }

    // toplam okunmamış mesaj (header rozeti için hafif uç)
    public function unreadCount(Request $request)
    {
        $me = (int) $request->user()->id;

        $count = Message::whereHas('conversation', fn ($q) => $q->where(fn ($w) => $w->where('user_one_id', $me)->orWhere('user_two_id', $me)))
            ->where('sender_id', '!=', $me)->whereNull('read_at')->count();

        return response()->json(['unread_total' => $count]);
    }

    private function authorizedConversation(Request $request, $id): Conversation
    {
        $conversation = Conversation::with(['userOne:id,name,profile_photo_path', 'userTwo:id,name,profile_photo_path', 'product:id,title'])->findOrFail($id);

        // konuşmanın varlığını katılımcı olmayanlara sızdırmamak için 404 döndürülür
        abort_unless($conversation->hasParticipant((int) $request->user()->id), 404, 'Konuşma bulunamadı.');

        return $conversation;
    }
}
