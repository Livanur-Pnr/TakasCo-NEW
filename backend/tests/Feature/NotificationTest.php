<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Trade;
use App\Models\User;
use App\Notifications\TradeEventNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create([
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    private function pendingTrade(User $sender, User $receiver): Trade
    {
        return Trade::create([
            'sender_id' => $sender->id, 'receiver_id' => $receiver->id,
            'offered_product_id' => $this->product($sender, 'Verilen')->id,
            'requested_product_id' => $this->product($receiver, 'İstenen')->id,
            'status' => 'beklemede',
        ]);
    }

    public function test_new_offer_notifies_the_receiver_only(): void
    {
        $sender = User::factory()->create(['name' => 'Ayşe']);
        $receiver = User::factory()->create();
        $offered = $this->product($sender, 'Kulaklık');
        $requested = $this->product($receiver, 'Kitap');

        $this->actingAs($sender, 'sanctum')->postJson('/api/trades', [
            'offered_product_id' => $offered->id, 'requested_product_id' => $requested->id,
        ])->assertCreated();

        $this->assertSame(1, $receiver->unreadNotifications()->count());
        $this->assertSame(0, $sender->notifications()->count());

        $data = $receiver->notifications()->first()->data;
        $this->assertSame('offer_received', $data['type']);
        $this->assertSame('Yeni takas teklifi', $data['title']);
        $this->assertStringContainsString('Ayşe', $data['body']);
        $this->assertStringContainsString('Kitap', $data['body']);
    }

    public function test_accept_reject_and_cancel_notify_the_other_party(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $accepted = $this->pendingTrade($sender, $receiver);
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$accepted->id}/accept")->assertOk();

        $rejected = $this->pendingTrade($sender, $receiver);
        $this->actingAs($receiver, 'sanctum')->postJson("/api/trades/{$rejected->id}/reject")->assertOk();

        $cancelled = $this->pendingTrade($sender, $receiver);
        $this->actingAs($sender, 'sanctum')->postJson("/api/trades/{$cancelled->id}/cancel")->assertOk();

        $this->assertEqualsCanonicalizing(
            ['offer_accepted', 'offer_rejected'],
            $sender->notifications->map(fn ($n) => $n->data['type'])->all()
        );
        $this->assertSame(['offer_cancelled'], $receiver->notifications->map(fn ($n) => $n->data['type'])->all());
    }

    public function test_index_returns_only_own_notifications_with_unread_count(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $stranger = User::factory()->create();
        $this->actingAs($sender, 'sanctum')->postJson('/api/trades', [
            'offered_product_id' => $this->product($sender, 'A')->id, 'requested_product_id' => $this->product($receiver, 'B')->id,
        ])->assertCreated();

        $mine = $this->actingAs($receiver, 'sanctum')->getJson('/api/notifications')->assertOk();
        $this->assertCount(1, $mine->json('data'));
        $this->assertSame(1, $mine->json('unread_count'));

        $theirs = $this->actingAs($stranger, 'sanctum')->getJson('/api/notifications')->assertOk();
        $this->assertCount(0, $theirs->json('data'));
        $this->assertSame(0, $theirs->json('unread_count'));
    }

    public function test_user_can_mark_own_notification_read_but_not_someone_elses(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $stranger = User::factory()->create();
        $this->actingAs($sender, 'sanctum')->postJson('/api/trades', [
            'offered_product_id' => $this->product($sender, 'C')->id, 'requested_product_id' => $this->product($receiver, 'D')->id,
        ])->assertCreated();
        $id = $receiver->notifications()->first()->id;

        $this->actingAs($stranger, 'sanctum')->postJson("/api/notifications/{$id}/read")->assertStatus(404);
        $this->assertNull($receiver->notifications()->find($id)->read_at);

        $this->actingAs($receiver, 'sanctum')->postJson("/api/notifications/{$id}/read")->assertOk();
        $this->assertNotNull($receiver->notifications()->find($id)->read_at);
    }

    public function test_mark_all_as_read(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        foreach (['E', 'F'] as $name) {
            $this->actingAs($sender, 'sanctum')->postJson('/api/trades', [
                'offered_product_id' => $this->product($sender, $name)->id, 'requested_product_id' => $this->product($receiver, $name . '2')->id,
            ])->assertCreated();
        }
        $this->assertSame(2, $receiver->unreadNotifications()->count());

        $this->actingAs($receiver, 'sanctum')->postJson('/api/notifications/read-all')->assertOk();

        $this->assertSame(0, $receiver->fresh()->unreadNotifications()->count());
    }

    public function test_guest_cannot_access_notifications(): void
    {
        $this->getJson('/api/notifications')->assertStatus(401);
        $this->postJson('/api/notifications/read-all')->assertStatus(401);
    }

    public function test_notifications_are_also_broadcast_in_real_time_with_the_same_content(): void
    {
        $sender = User::factory()->create(['name' => 'Ayşe']);
        $receiver = User::factory()->create();
        $trade = $this->pendingTrade($sender, $receiver);
        $n = new TradeEventNotification(TradeEventNotification::OFFER_RECEIVED, $trade);

        $this->assertContains('broadcast', $n->via($receiver));
        $this->assertSame($n->toArray($receiver), $n->toBroadcast($receiver)->data);
        $this->assertSame('sync', $n->toBroadcast($receiver)->connection); // kuyruk işçisi gerektirmez
    }

    public function test_offer_received_and_accepted_are_also_emailed(): void
    {
        Notification::fake();
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $viaMail = fn ($n, $channels) => in_array('mail', $channels, true);

        $created = $this->actingAs($sender, 'sanctum')->postJson('/api/trades', [
            'offered_product_id' => $this->product($sender, 'Verilen')->id, 'requested_product_id' => $this->product($receiver, 'İstenen')->id,
        ])->assertCreated();
        Notification::assertSentTo($receiver, TradeEventNotification::class, $viaMail);

        $this->actingAs($receiver, 'sanctum')->postJson('/api/trades/' . $created->json('trade.id') . '/accept')->assertOk();
        Notification::assertSentTo($sender, TradeEventNotification::class, $viaMail);
    }

    public function test_email_respects_opt_out_skips_rejections_and_never_contains_contact_info(): void
    {
        $sender = User::factory()->create(['phone_number' => '05551112233']);
        $receiver = User::factory()->create(['phone_number' => '05559998877']);
        $trade = $this->pendingTrade($sender, $receiver);

        $accepted = new TradeEventNotification(TradeEventNotification::OFFER_ACCEPTED, $trade);
        $mail = $accepted->toMail($sender);
        $text = implode(' ', array_merge($mail->introLines, [$mail->subject]));
        $this->assertStringNotContainsString('0555', $text);
        $this->assertStringNotContainsString($receiver->email, $text);

        $this->assertContains('mail', $accepted->via($sender));
        $this->actingAs($sender, 'sanctum')->postJson('/api/user/preferences', ['email_notifications' => false])->assertOk();
        $this->assertSame(['database', 'broadcast'], $accepted->via($sender->fresh()));

        $rejected = new TradeEventNotification(TradeEventNotification::OFFER_REJECTED, $trade);
        $this->assertSame(['database', 'broadcast'], $rejected->via($receiver));

        $this->actingAs($sender, 'sanctum')->postJson('/api/user/preferences', ['email_notifications' => 'belki'])->assertStatus(422);
    }
}
