<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\SavedSearch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecommendationTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title, Category $category, array $extra = []): Product
    {
        return Product::create($extra + [
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    private function titles(User $user): array
    {
        return collect($this->actingAs($user, 'sanctum')->getJson('/api/recommendations')->assertOk()->json('data'))->pluck('title')->all();
    }

    public function test_no_activity_means_no_recommendations_and_login_is_required(): void
    {
        $this->getJson('/api/recommendations')->assertStatus(401);
        $user = User::factory()->create();
        $seller = User::factory()->create();
        $this->product($seller, 'Rastgele', Category::create(['name' => 'Spor']));

        $this->assertSame([], $this->titles($user));
    }

    public function test_favorites_drive_recommendations_and_exclude_own_favorited_blocked_and_hidden_items(): void
    {
        $me = User::factory()->create();
        $seller = User::factory()->create();
        $blocked = User::factory()->create();
        $suspended = User::factory()->create();
        $suspended->forceFill(['suspended_at' => now()])->save();
        $music = Category::create(['name' => 'Müzik']);
        $sport = Category::create(['name' => 'Spor']);

        $liked = $this->product($seller, 'Sevdiğim Gitar', $music);
        $this->product($seller, 'Yeni Bateri', $music);
        $this->product($seller, 'Bisiklet', $sport);
        $this->product($blocked, 'Engelli Keman', $music);
        $this->product($suspended, 'Askıdaki Piyano', $music);
        $this->product($seller, 'Takaslanmış Flüt', $music, ['status' => 3]);
        $this->product($me, 'Kendi Davulum', $music);
        $this->actingAs($me, 'sanctum')->postJson("/api/products/{$liked->id}/favorite")->assertOk();
        $this->actingAs($me, 'sanctum')->postJson("/api/users/{$blocked->id}/block")->assertOk();

        $data = $this->actingAs($me, 'sanctum')->getJson('/api/recommendations')->assertOk()->json('data');

        $this->assertSame(['Yeni Bateri'], collect($data)->pluck('title')->all());
        $this->assertSame('Favorilerine benzer', $data[0]['reason']);
        $this->assertArrayNotHasKey('email', $data[0]['user']);
    }

    public function test_onboarding_saves_interests_and_city_once_and_feeds_recommendations(): void
    {
        $me = User::factory()->create();
        $seller = User::factory()->create();
        $music = Category::create(['name' => 'Müzik']);
        $sport = Category::create(['name' => 'Spor']);
        $this->product($seller, 'Gitar', $music);
        $this->product($seller, 'Bisiklet', $sport);

        $this->actingAs($me, 'sanctum')->postJson('/api/user/onboarding', ['category_ids' => [9999]])->assertStatus(422);
        $this->actingAs($me, 'sanctum')->postJson('/api/user/onboarding', ['category_ids' => range(1, 11)])->assertStatus(422);

        $res = $this->actingAs($me, 'sanctum')->postJson('/api/user/onboarding', ['category_ids' => [$music->id, $music->id], 'city' => ' Ankara '])->assertOk();
        $this->assertSame([$music->id], $res->json('user.interest_category_ids'));
        $this->assertNotNull($me->fresh()->onboarded_at);
        $this->assertSame('Ankara', $me->fresh()->city);

        $data = $this->actingAs($me, 'sanctum')->getJson('/api/recommendations')->json('data');
        $this->assertSame(['Gitar'], collect($data)->pluck('title')->all());
        $this->assertSame('İlgi alanlarına uygun', $data[0]['reason']);
    }

    public function test_skipping_onboarding_marks_it_done_without_changing_city(): void
    {
        $me = User::factory()->create(['city' => 'İzmir']);

        $this->actingAs($me, 'sanctum')->postJson('/api/user/onboarding', [])->assertOk();

        $this->assertNotNull($me->fresh()->onboarded_at);
        $this->assertSame('İzmir', $me->fresh()->city);
        $this->assertSame([], $me->fresh()->interest_category_ids);
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/user/onboarding', [])->assertStatus(401);
    }

    public function test_saved_searches_rank_first_and_city_alone_is_not_a_reason(): void
    {
        $me = User::factory()->create(['city' => 'İzmir']);
        $seller = User::factory()->create();
        $music = Category::create(['name' => 'Müzik']);
        $tech = Category::create(['name' => 'Elektronik']);
        SavedSearch::create(['user_id' => $me->id, 'q' => 'gitar']);
        $this->product($seller, 'Elektro Gitar', $music);
        $this->product($seller, 'İzmir Monitör', $tech, ['city' => 'İzmir']);

        $data = $this->actingAs($me, 'sanctum')->getJson('/api/recommendations')->json('data');

        $this->assertSame(['Elektro Gitar'], collect($data)->pluck('title')->all());
        $this->assertSame('Kayıtlı aramana uygun', $data[0]['reason']);
    }
}
