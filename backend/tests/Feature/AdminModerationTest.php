<?php

namespace Tests\Feature;

use App\Models\AdminAction;
use App\Models\Category;
use App\Models\Product;
use App\Models\Report;
use App\Models\Review;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminModerationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create(['name' => 'Yönetici']);
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    private function product(User $owner, string $title = 'İlan'): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create([
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    private function review(User $reviewer, User $reviewee, int $rating, ?string $comment = null): Review
    {
        $trade = Trade::create([
            'sender_id' => $reviewer->id, 'receiver_id' => $reviewee->id, 'status' => 'onaylandı',
            'offered_product_id' => $this->product($reviewer)->id, 'requested_product_id' => $this->product($reviewee)->id,
        ]);

        return Review::create(['trade_id' => $trade->id, 'reviewer_id' => $reviewer->id, 'reviewee_id' => $reviewee->id, 'rating' => $rating, 'comment' => $comment]);
    }

    public function test_admin_can_list_filter_and_delete_reviews_and_ratings_recompute(): void
    {
        $admin = $this->admin();
        $seller = User::factory()->create();
        $a = User::factory()->create(['name' => 'Yorumcu A']);
        $b = User::factory()->create(['name' => 'Yorumcu B']);
        $good = $this->review($a, $seller, 5, 'Harika satıcı');
        $bad = $this->review($b, $seller, 1, 'Uygunsuz ve küfürlü yorum');

        $this->assertSame(3.0, (float) $this->getJson("/api/users/{$seller->id}/reviews")->json('stats.rating_avg'));

        $list = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/reviews')->assertOk();
        $this->assertCount(2, $list->json('data'));
        $this->assertSame('Yorumcu B', $list->json('data.0.reviewer'));
        $this->assertCount(1, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/reviews?rating=1')->json('data'));
        $this->assertCount(1, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/reviews?q=' . urlencode('küfürlü'))->json('data'));

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/reviews/{$bad->id}")->assertOk();
        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/reviews/{$bad->id}")->assertStatus(404);

        $this->assertNull(Review::find($bad->id));
        $this->assertNotNull(Review::find($good->id));
        $this->assertSame(5.0, (float) $this->getJson("/api/users/{$seller->id}/reviews")->json('stats.rating_avg'));
    }

    public function test_non_admins_cannot_moderate_reviews_or_read_the_action_log(): void
    {
        $user = User::factory()->create();
        $review = $this->review(User::factory()->create(), User::factory()->create(), 4);

        $this->actingAs($user, 'sanctum')->getJson('/api/admin/reviews')->assertStatus(403);
        $this->actingAs($user, 'sanctum')->deleteJson("/api/admin/reviews/{$review->id}")->assertStatus(403);
        $this->actingAs($user, 'sanctum')->getJson('/api/admin/actions')->assertStatus(403);
        $this->assertNotNull(Review::find($review->id));
        $this->assertSame(0, AdminAction::count());
    }

    public function test_every_admin_moderation_action_is_logged_with_who_what_and_target(): void
    {
        $admin = $this->admin();
        $owner = User::factory()->create(['name' => 'Satıcı Ali']);
        $product = $this->product($owner, 'Şüpheli İlan');
        $reporter = User::factory()->create();
        $report = Report::create(['reporter_id' => $reporter->id, 'target_type' => 'product', 'target_id' => $product->id, 'reason' => 'sahte']);
        $review = $this->review($reporter, $owner, 2, 'kötü');

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/products/{$product->id}/remove")->assertOk();
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/products/{$product->id}/restore")->assertOk();
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/users/{$owner->id}/suspend")->assertOk();
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/users/{$owner->id}/unsuspend")->assertOk();
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/reports/{$report->id}/resolve", ['status' => 'çözüldü'])->assertOk();
        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/reviews/{$review->id}")->assertOk();

        $log = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/actions')->assertOk()->json('data');
        $this->assertSame(
            ['review_deleted', 'report_resolved', 'user_unsuspended', 'user_suspended', 'product_restored', 'product_removed'],
            collect($log)->pluck('action')->all()
        );
        $this->assertSame('Yönetici', $log[0]['admin']);
        $this->assertSame('review', $log[0]['target_type']);
        $this->assertStringContainsString('2★', $log[0]['details']);
        $this->assertSame('Şüpheli İlan', collect($log)->firstWhere('action', 'product_removed')['details']);
        $this->assertSame('Satıcı Ali', collect($log)->firstWhere('action', 'user_suspended')['details']);
    }

    public function test_failed_admin_actions_are_not_logged(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/users/{$admin->id}/suspend")->assertStatus(422);
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/products/9999/remove')->assertStatus(404);

        $this->assertSame(0, AdminAction::count());
    }
}
