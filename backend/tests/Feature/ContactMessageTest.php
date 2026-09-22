<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactMessageTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create(['name' => 'Yönetici']);
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    public function test_guest_can_submit_contact_message(): void
    {
        $payload = ['name' => 'Ayşe', 'email' => 'ayse@example.com', 'subject' => 'Sorum var', 'message' => 'Merhaba, bir sorum olacaktı.'];

        $this->postJson('/api/contact', $payload)->assertCreated();

        $this->assertDatabaseHas('contact_messages', ['email' => 'ayse@example.com', 'status' => 'beklemede', 'user_id' => null]);
    }

    public function test_logged_in_user_message_is_linked_to_their_account(): void
    {
        $user = User::factory()->create();
        $payload = ['name' => $user->name, 'email' => $user->email, 'subject' => 'Konu', 'message' => 'Mesaj metni.'];

        $this->actingAs($user, 'sanctum')->postJson('/api/contact', $payload)->assertCreated();

        $this->assertDatabaseHas('contact_messages', ['email' => $user->email, 'user_id' => $user->id]);
    }

    public function test_contact_message_requires_valid_fields(): void
    {
        $this->postJson('/api/contact', ['name' => '', 'email' => 'gecersiz', 'subject' => '', 'message' => ''])->assertStatus(422);
    }

    public function test_only_admin_can_list_and_resolve_contact_messages(): void
    {
        $admin = $this->admin();
        $other = User::factory()->create();
        $message = ContactMessage::create(['name' => 'Ali', 'email' => 'ali@example.com', 'subject' => 'Konu', 'message' => 'Mesaj']);

        $this->actingAs($other, 'sanctum')->getJson('/api/admin/contact-messages')->assertStatus(403);
        $this->actingAs($other, 'sanctum')->postJson("/api/admin/contact-messages/{$message->id}/resolve")->assertStatus(403);

        $list = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/contact-messages')->assertOk();
        $this->assertCount(1, $list->json('data'));

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/contact-messages/{$message->id}/resolve")->assertOk();
        $this->assertDatabaseHas('contact_messages', ['id' => $message->id, 'status' => 'yanıtlandı', 'resolved_by' => $admin->id]);

        $this->assertCount(0, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/contact-messages')->json('data'));
        $this->assertCount(1, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/contact-messages?status=' . urlencode('yanıtlandı'))->json('data'));
    }

    public function test_overview_reports_pending_contact_message_count(): void
    {
        $admin = $this->admin();
        ContactMessage::create(['name' => 'Ali', 'email' => 'ali@example.com', 'subject' => 'Konu', 'message' => 'Mesaj']);

        $overview = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/overview')->assertOk();
        $this->assertSame(1, $overview->json('pending_contact_messages'));
    }
}
