<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title = 'Ürün'): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create([
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    private function trade(User $sender, User $receiver, string $status = 'onaylandı'): Trade
    {
        return Trade::create([
            'sender_id' => $sender->id, 'receiver_id' => $receiver->id,
            'offered_product_id' => $this->product($sender)->id, 'requested_product_id' => $this->product($receiver)->id, 'status' => $status,
        ]);
    }

    private function asGuest(): static
    {
        $this->app['auth']->forgetGuards();

        return $this;
    }

    public function test_participants_review_each_other_once_after_completed_trade(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $trade = $this->trade($a, $b);

        $this->actingAs($a, 'sanctum')->postJson("/api/trades/{$trade->id}/review", ['rating' => 5, 'comment' => ' Harika  '])->assertCreated();
        $this->actingAs($a, 'sanctum')->postJson("/api/trades/{$trade->id}/review", ['rating' => 4])->assertStatus(409);
        $this->actingAs($b, 'sanctum')->postJson("/api/trades/{$trade->id}/review", ['rating' => 3])->assertCreated();

        $this->assertDatabaseHas('reviews', ['trade_id' => $trade->id, 'reviewer_id' => $a->id, 'reviewee_id' => $b->id, 'rating' => 5, 'comment' => 'Harika']);
        $this->assertDatabaseHas('reviews', ['trade_id' => $trade->id, 'reviewer_id' => $b->id, 'reviewee_id' => $a->id, 'rating' => 3]);
    }

    public function test_review_rules_status_membership_and_validation(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $stranger = User::factory()->create();
        $pending = $this->trade($a, $b, 'beklemede');
        $done = $this->trade($a, $b);

        $this->actingAs($a, 'sanctum')->postJson("/api/trades/{$pending->id}/review", ['rating' => 5])->assertStatus(409);
        $this->actingAs($stranger, 'sanctum')->postJson("/api/trades/{$done->id}/review", ['rating' => 5])->assertStatus(404);
        $this->actingAs($a, 'sanctum')->postJson("/api/trades/{$done->id}/review", [])->assertStatus(422)->assertJsonValidationErrors(['rating']);
        $this->actingAs($a, 'sanctum')->postJson("/api/trades/{$done->id}/review", ['rating' => 6])->assertStatus(422);
        $this->actingAs($a, 'sanctum')->postJson("/api/trades/{$done->id}/review", ['rating' => 0])->assertStatus(422);
        $this->actingAs($a, 'sanctum')->postJson("/api/trades/{$done->id}/review", ['rating' => 5, 'comment' => str_repeat('x', 501)])->assertStatus(422);
        $this->actingAs($a, 'sanctum')->postJson('/api/trades/9999/review', ['rating' => 5])->assertStatus(404);
        $this->asGuest()->postJson("/api/trades/{$done->id}/review", ['rating' => 5])->assertStatus(401);
    }

    public function test_public_reviews_and_stats_are_computed_from_real_data(): void
    {
        $seller = User::factory()->unverified()->create(['created_at' => now()->subDays(200)]);
        $reviewers = User::factory()->count(3)->create(['name' => 'Yorumcu']);
        foreach ($reviewers as $r) {
            $trade = $this->trade($r, $seller);
            $this->actingAs($r, 'sanctum')->postJson("/api/trades/{$trade->id}/review", ['rating' => 5, 'comment' => 'Süper'])->assertCreated();
        }

        $res = $this->asGuest()->getJson("/api/users/{$seller->id}/reviews")->assertOk();
        $this->assertSame(5.0, (float) $res->json('stats.rating_avg'));
        $this->assertSame(3, $res->json('stats.reviews_count'));
        $this->assertSame(3, $res->json('stats.completed_trades'));
        $this->assertEqualsCanonicalizing(['trusted_swapper', 'highly_rated'], $res->json('stats.badges'));
        $this->assertSame('Yorumcu', $res->json('data.0.reviewer'));
        $this->assertArrayNotHasKey('email', $res->json('data.0'));

        $profile = $this->asGuest()->getJson("/api/users/{$seller->id}")->assertOk();
        $this->assertSame(3, $profile->json('reviews_count'));
        $this->assertArrayNotHasKey('email', $profile->json());

        $product = $this->product($seller, 'Satıcı İlanı');
        $detail = $this->asGuest()->getJson("/api/products/{$product->id}")->assertOk();
        $this->assertSame(3, $detail->json('user.stats.reviews_count'));
    }

    public function test_new_users_without_history_get_only_the_new_member_badge_and_no_fake_rating(): void
    {
        $fresh = User::factory()->unverified()->create();

        $stats = $this->asGuest()->getJson("/api/users/{$fresh->id}/reviews")->assertOk()->json('stats');

        $this->assertNull($stats['rating_avg']);
        $this->assertSame(0, $stats['reviews_count']);
        $this->assertSame(['new_member'], $stats['badges']);
    }

    public function test_trade_list_marks_already_reviewed_trades(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $trade = $this->trade($a, $b);

        $this->assertFalse($this->actingAs($a, 'sanctum')->getJson('/api/trades')->json('outgoing.0.reviewed'));
        $this->actingAs($a, 'sanctum')->postJson("/api/trades/{$trade->id}/review", ['rating' => 4])->assertCreated();
        $this->assertTrue($this->actingAs($a, 'sanctum')->getJson('/api/trades')->json('outgoing.0.reviewed'));
        $this->assertFalse($this->actingAs($b, 'sanctum')->getJson('/api/trades')->json('incoming.0.reviewed'));
    }
}
