<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SafetyTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title = 'İlan'): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create([
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    public function test_user_can_report_a_product_once(): void
    {
        $owner = User::factory()->create();
        $reporter = User::factory()->create();
        $product = $this->product($owner);
        $payload = ['target_type' => 'product', 'target_id' => $product->id, 'reason' => 'sahte', 'details' => 'Taklit ürün'];

        $this->actingAs($reporter, 'sanctum')->postJson('/api/reports', $payload)->assertCreated();
        $this->actingAs($reporter, 'sanctum')->postJson('/api/reports', $payload)->assertStatus(409);

        $this->assertDatabaseCount('reports', 1);
    }

    public function test_report_validation_and_self_report_rules(): void
    {
        $user = User::factory()->create();
        $own = $this->product($user);

        $this->actingAs($user, 'sanctum')->postJson('/api/reports', ['target_type' => 'product', 'target_id' => $own->id, 'reason' => 'spam'])->assertStatus(422);
        $this->actingAs($user, 'sanctum')->postJson('/api/reports', ['target_type' => 'user', 'target_id' => $user->id, 'reason' => 'spam'])->assertStatus(422);
        $this->actingAs($user, 'sanctum')->postJson('/api/reports', ['target_type' => 'user', 'target_id' => 9999, 'reason' => 'spam'])->assertStatus(404);
        $this->actingAs($user, 'sanctum')->postJson('/api/reports', ['target_type' => 'user', 'target_id' => 1, 'reason' => 'uydurma'])->assertStatus(422);
        $this->actingAs($user, 'sanctum')->postJson('/api/reports', ['target_type' => 'mesaj', 'target_id' => 1, 'reason' => 'spam'])->assertStatus(422);
    }

    public function test_guest_cannot_report_or_block(): void
    {
        $this->postJson('/api/reports', [])->assertStatus(401);
        $this->postJson('/api/users/1/block')->assertStatus(401);
    }

    public function test_block_stops_messaging_in_both_directions_and_unblock_restores_it(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $conversationId = $this->actingAs($a, 'sanctum')->postJson('/api/conversations', ['user_id' => $b->id])->json('id');

        $this->actingAs($a, 'sanctum')->postJson("/api/users/{$b->id}/block")->assertOk();

        // engelleyen de engellenen de mesaj gönderemez / yeni konuşma açamaz
        $this->actingAs($a, 'sanctum')->postJson("/api/conversations/{$conversationId}/messages", ['body' => 'selam'])->assertStatus(403);
        $this->actingAs($b, 'sanctum')->postJson("/api/conversations/{$conversationId}/messages", ['body' => 'selam'])->assertStatus(403);
        $this->actingAs($b, 'sanctum')->postJson('/api/conversations', ['user_id' => $a->id])->assertStatus(403);

        $list = $this->actingAs($a, 'sanctum')->getJson('/api/conversations')->json('data.0');
        $this->assertTrue($list['blocked']);
        $this->assertTrue($list['blocked_by_me']);
        $theirs = $this->actingAs($b, 'sanctum')->getJson('/api/conversations')->json('data.0');
        $this->assertTrue($theirs['blocked']);
        $this->assertFalse($theirs['blocked_by_me']);

        $this->actingAs($a, 'sanctum')->deleteJson("/api/users/{$b->id}/block")->assertOk();
        $this->actingAs($b, 'sanctum')->postJson("/api/conversations/{$conversationId}/messages", ['body' => 'tekrar merhaba'])->assertCreated();
    }

    public function test_blocked_users_cannot_send_trade_offers(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $mine = $this->product($a, 'Benim');
        $theirs = $this->product($b, 'Onun');

        $this->actingAs($b, 'sanctum')->postJson("/api/users/{$a->id}/block")->assertOk();

        $this->actingAs($a, 'sanctum')->postJson('/api/trades', ['offered_product_id' => $mine->id, 'requested_product_id' => $theirs->id])->assertStatus(403);
    }

    public function test_cannot_block_yourself_or_missing_user_and_block_is_idempotent(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();

        $this->actingAs($a, 'sanctum')->postJson("/api/users/{$a->id}/block")->assertStatus(422);
        $this->actingAs($a, 'sanctum')->postJson('/api/users/9999/block')->assertStatus(404);

        $this->actingAs($a, 'sanctum')->postJson("/api/users/{$b->id}/block")->assertOk();
        $this->actingAs($a, 'sanctum')->postJson("/api/users/{$b->id}/block")->assertOk();
        $this->assertDatabaseCount('user_blocks', 1);
    }

    public function test_admin_sees_pending_reports_and_can_resolve_them(): void
    {
        $admin = $this->admin();
        $owner = User::factory()->create();
        $reporter = User::factory()->create(['name' => 'Şikayetçi']);
        $product = $this->product($owner, 'Şüpheli İlan');
        $this->actingAs($reporter, 'sanctum')->postJson('/api/reports', ['target_type' => 'product', 'target_id' => $product->id, 'reason' => 'yaniltici'])->assertCreated();

        $this->assertSame(1, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/overview')->json('pending_reports'));

        $queue = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/reports')->assertOk();
        $this->assertSame('Şüpheli İlan', $queue->json('data.0.target_label'));
        $this->assertSame('Şikayetçi', $queue->json('data.0.reporter'));
        $reportId = $queue->json('data.0.id');

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/reports/{$reportId}/resolve", ['status' => 'yanlış'])->assertStatus(422);
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/reports/{$reportId}/resolve", ['status' => 'çözüldü'])->assertOk();

        $this->assertSame(0, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/overview')->json('pending_reports'));
        $this->assertCount(0, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/reports')->json('data'));
        $this->assertCount(1, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/reports?status=' . urlencode('çözüldü'))->json('data'));
    }

    public function test_non_admin_cannot_read_report_queue(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/admin/reports')->assertStatus(403);
        $this->actingAs($user, 'sanctum')->postJson('/api/admin/reports/1/resolve', ['status' => 'çözüldü'])->assertStatus(403);
    }
}
