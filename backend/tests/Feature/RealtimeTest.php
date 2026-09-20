<?php

namespace Tests\Feature;

use App\Events\MessageSent;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\Factory as BroadcastFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class RealtimeTest extends TestCase
{
    use RefreshDatabase;

    private function startConversation(User $from, User $to): int
    {
        return $this->actingAs($from, 'sanctum')->postJson('/api/conversations', ['user_id' => $to->id])->json('id');
    }

    public function test_sending_a_message_broadcasts_to_the_conversation_and_the_recipient_only(): void
    {
        Event::fake([MessageSent::class]);
        $a = User::factory()->create();
        $b = User::factory()->create();
        $id = $this->startConversation($a, $b);

        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => 'selam'])->assertCreated();

        Event::assertDispatched(MessageSent::class, function (MessageSent $e) use ($id, $a, $b) {
            $names = collect($e->broadcastOn())->map(fn (PrivateChannel $c) => $c->name)->all();

            return $e->recipientId === $b->id
                && $names === ["private-conversation.{$id}", "private-App.Models.User.{$b->id}"]
                && $e->broadcastAs() === 'message.sent'
                && $e->broadcastWith()['sender_id'] === $a->id
                && !array_key_exists('body', $e->broadcastWith()); // metin kanal yükünde taşınmaz
        });
    }

    public function test_a_broadcast_failure_never_breaks_message_sending(): void
    {
        Event::listen(MessageSent::class, fn () => throw new \RuntimeException('Reverb kapalı'));
        $a = User::factory()->create();
        $b = User::factory()->create();
        $id = $this->startConversation($a, $b);

        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => 'yine de gider'])->assertCreated();

        $this->assertDatabaseHas('messages', ['conversation_id' => $id, 'body' => 'yine de gider']);
    }

    public function test_only_participants_get_channel_authorization_over_bearer_auth(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => '1',
        ]);
        $this->app->make(BroadcastFactory::class)->purge('reverb');
        require base_path('routes/channels.php'); // kanal yetkilerini yeni (reverb) sürücüye yeniden kaydet

        $a = User::factory()->create();
        $b = User::factory()->create();
        $stranger = User::factory()->create();
        $id = $this->startConversation($a, $b);
        $auth = fn (User $u, string $channel) => $this->actingAs($u, 'sanctum')->postJson('/api/broadcasting/auth', ['socket_id' => '123.456', 'channel_name' => $channel]);

        $auth($a, "private-conversation.{$id}")->assertOk()->assertJsonStructure(['auth']);
        $auth($b, "private-conversation.{$id}")->assertOk();
        $auth($stranger, "private-conversation.{$id}")->assertStatus(403);
        $auth($a, "private-App.Models.User.{$a->id}")->assertOk();
        $auth($a, "private-App.Models.User.{$b->id}")->assertStatus(403);

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/broadcasting/auth', ['socket_id' => '123.456', 'channel_name' => "private-conversation.{$id}"])->assertStatus(401);
    }
}
