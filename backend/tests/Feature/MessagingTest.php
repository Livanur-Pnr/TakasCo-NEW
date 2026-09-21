<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessagingTest extends TestCase
{
    use RefreshDatabase;

    private function startConversation(User $from, User $to, ?int $productId = null): int
    {
        return $this->actingAs($from, 'sanctum')
            ->postJson('/api/conversations', array_filter(['user_id' => $to->id, 'product_id' => $productId]))
            ->json('id');
    }

    public function test_conversation_is_created_once_per_pair_and_shared_by_both_users(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();

        $first = $this->actingAs($a, 'sanctum')->postJson('/api/conversations', ['user_id' => $b->id])->assertCreated()->json('id');
        $again = $this->actingAs($a, 'sanctum')->postJson('/api/conversations', ['user_id' => $b->id])->assertOk()->json('id');
        $reverse = $this->actingAs($b, 'sanctum')->postJson('/api/conversations', ['user_id' => $a->id])->assertOk()->json('id');

        $this->assertSame($first, $again);
        $this->assertSame($first, $reverse);
    }

    public function test_cannot_message_yourself_or_a_missing_user(): void
    {
        $a = User::factory()->create();

        $this->actingAs($a, 'sanctum')->postJson('/api/conversations', ['user_id' => $a->id])->assertStatus(422);
        $this->actingAs($a, 'sanctum')->postJson('/api/conversations', ['user_id' => 99999])->assertStatus(422);
    }

    public function test_product_is_only_linked_when_it_belongs_to_the_other_user(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $category = Category::create(['name' => 'Elektronik']);
        $bProduct = Product::create(['user_id' => $b->id, 'category_id' => $category->id, 'title' => 'B Ürünü', 'description' => 'd', 'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'x']);
        $aProduct = Product::create(['user_id' => $a->id, 'category_id' => $category->id, 'title' => 'A Ürünü', 'description' => 'd', 'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'x']);

        $withProduct = $this->startConversation($a, $b, $bProduct->id);
        $spoofed = $this->startConversation($a, $b, $aProduct->id); // başkasının değil kendi ilanı: bağlanmaz

        $this->assertDatabaseHas('conversations', ['id' => $withProduct, 'product_id' => $bProduct->id]);
        $this->assertDatabaseHas('conversations', ['id' => $spoofed, 'product_id' => null]);
    }

    public function test_messages_are_delivered_read_and_counted(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $id = $this->startConversation($a, $b);

        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => 'Merhaba, hâlâ satılık mı?'])->assertCreated();
        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => 'Takas yapabiliriz.'])->assertCreated();

        $list = $this->actingAs($b, 'sanctum')->getJson('/api/conversations')->assertOk();
        $this->assertSame(2, $list->json('unread_total'));
        $this->assertSame(2, $list->json('data.0.unread_count'));
        $this->assertSame('Takas yapabiliriz.', $list->json('data.0.last_message.body'));
        $this->assertSame($a->id, $list->json('data.0.other_user.id'));
        $this->actingAs($b, 'sanctum')->getJson('/api/conversations/unread-count')->assertJson(['unread_total' => 2]);

        // gönderenin kendi listesinde okunmamış yok
        $this->assertSame(0, $this->actingAs($a, 'sanctum')->getJson('/api/conversations')->json('unread_total'));

        $messages = $this->actingAs($b, 'sanctum')->getJson("/api/conversations/{$id}/messages")->assertOk();
        $this->assertCount(2, $messages->json('data'));
        $this->assertSame('Merhaba, hâlâ satılık mı?', $messages->json('data.0.body'));

        $this->assertSame(0, $this->actingAs($b, 'sanctum')->getJson('/api/conversations')->json('unread_total'));
    }

    public function test_non_participant_cannot_read_or_send(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $stranger = User::factory()->create();
        $id = $this->startConversation($a, $b);
        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => 'Gizli'])->assertCreated();

        $this->actingAs($stranger, 'sanctum')->getJson("/api/conversations/{$id}/messages")->assertStatus(404);
        $this->actingAs($stranger, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => 'İzinsiz'])->assertStatus(404);
        $this->assertCount(0, $this->actingAs($stranger, 'sanctum')->getJson('/api/conversations')->json('data'));
        $this->assertDatabaseMissing('messages', ['body' => 'İzinsiz']);
    }

    public function test_message_body_is_validated(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $id = $this->startConversation($a, $b);

        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => ''])->assertStatus(422);
        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => str_repeat('a', 1001)])->assertStatus(422);
    }

    public function test_sending_is_rate_limited(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $id = $this->startConversation($a, $b);

        for ($i = 0; $i < 30; $i++) {
            $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => "m{$i}"])->assertCreated();
        }

        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => 'çok fazla'])->assertStatus(429);
    }

    public function test_guest_cannot_use_messaging(): void
    {
        $this->getJson('/api/conversations')->assertStatus(401);
        $this->postJson('/api/conversations', ['user_id' => 1])->assertStatus(401);
        $this->getJson('/api/conversations/1/messages')->assertStatus(401);
    }

    public function test_messages_endpoint_supports_incremental_fetch_with_after(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $id = $this->startConversation($a, $b);
        $ids = [];
        foreach (['bir', 'iki', 'üç'] as $body) {
            $ids[] = $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => $body])->json('id');
        }

        $after = $this->actingAs($b, 'sanctum')->getJson("/api/conversations/{$id}/messages?after={$ids[0]}")->assertOk();
        $this->assertSame(['iki', 'üç'], collect($after->json('data'))->pluck('body')->all());

        $none = $this->actingAs($b, 'sanctum')->getJson("/api/conversations/{$id}/messages?after={$ids[2]}")->assertOk();
        $this->assertSame([], $none->json('data'));
        $this->assertCount(3, $this->actingAs($b, 'sanctum')->getJson("/api/conversations/{$id}/messages")->json('data'));
    }

    public function test_older_messages_can_be_paged_with_before_and_has_more_is_reported(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $id = $this->startConversation($a, $b);
        // gönderim uç noktası dakikada 30 istekle sınırlı olduğu için mesajlar doğrudan eklenir
        $ids = [];
        foreach (range(1, 120) as $n) {
            $ids[] = \App\Models\Message::create(['conversation_id' => $id, 'sender_id' => $a->id, 'body' => "m{$n}"])->id;
        }

        $first = $this->actingAs($b, 'sanctum')->getJson("/api/conversations/{$id}/messages")->assertOk();
        $this->assertCount(100, $first->json('data'));
        $this->assertTrue($first->json('has_more'));
        $this->assertSame('m21', $first->json('data.0.body'));
        $this->assertSame('m120', $first->json('data.99.body'));

        $older = $this->actingAs($b, 'sanctum')->getJson("/api/conversations/{$id}/messages?before=" . $first->json('data.0.id'))->assertOk();
        $this->assertCount(20, $older->json('data'));
        $this->assertFalse($older->json('has_more'));
        $this->assertSame('m1', $older->json('data.0.body'));
        $this->assertSame('m20', $older->json('data.19.body'));

        $this->assertFalse($this->actingAs($b, 'sanctum')->getJson("/api/conversations/{$id}/messages?after={$ids[118]}")->json('has_more'));
    }

    public function test_reading_messages_broadcasts_a_read_receipt_only_when_something_was_unread(): void
    {
        \Illuminate\Support\Facades\Event::fake([\App\Events\MessagesRead::class, \App\Events\MessageSent::class]);
        $a = User::factory()->create();
        $b = User::factory()->create();
        $id = $this->startConversation($a, $b);
        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$id}/messages", ['body' => 'selam'])->assertCreated();

        // gönderen kendi mesajını açınca okundu bilgisi üretilmez
        $this->actingAs($a, 'sanctum')->getJson("/api/conversations/{$id}/messages")->assertOk();
        \Illuminate\Support\Facades\Event::assertNotDispatched(\App\Events\MessagesRead::class);

        $this->actingAs($b, 'sanctum')->getJson("/api/conversations/{$id}/messages")->assertOk();
        \Illuminate\Support\Facades\Event::assertDispatched(\App\Events\MessagesRead::class, fn ($e) => $e->conversationId === $id && $e->readerId === $b->id);

        // ikinci açılışta okunmamış mesaj kalmadığı için yeni olay yok
        $this->actingAs($b, 'sanctum')->getJson("/api/conversations/{$id}/messages")->assertOk();
        \Illuminate\Support\Facades\Event::assertDispatchedTimes(\App\Events\MessagesRead::class, 1);
    }
}
