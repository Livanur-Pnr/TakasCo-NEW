<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\SavedSearch;
use App\Models\User;
use App\Services\ProductImageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class SavedSearchTest extends TestCase
{
    use RefreshDatabase;

    private array $created = [];

    protected function tearDown(): void
    {
        foreach ($this->created as $path) {
            ProductImageService::delete($path);
        }
        parent::tearDown();
    }

    private function publish(User $owner, Category $category, array $overrides = []): void
    {
        $res = $this->actingAs($owner, 'sanctum')->post('/api/products', $overrides + [
            'title' => 'Akustik Gitar', 'category_id' => $category->id, 'description' => 'Az kullanıldı', 'condition' => 'Az Kullanılmış',
            'swap_expectation' => 'Kitap', 'city' => 'İzmir', 'images' => [UploadedFile::fake()->image('g.jpg', 300, 300)],
        ], ['Accept' => 'application/json'])->assertStatus(201);
        $this->created[] = $res->json('product.images.0.image_path');
    }

    public function test_user_can_save_list_and_delete_own_searches(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();

        $this->actingAs($a, 'sanctum')->postJson('/api/saved-searches', [])->assertStatus(422);
        $this->actingAs($a, 'sanctum')->postJson('/api/saved-searches', ['condition' => 'Yepyeni'])->assertStatus(422);

        $id = $this->actingAs($a, 'sanctum')->postJson('/api/saved-searches', ['q' => ' gitar ', 'city' => 'İzmir'])->assertCreated()->json('id');
        $this->actingAs($a, 'sanctum')->postJson('/api/saved-searches', ['q' => 'gitar', 'city' => 'İzmir'])->assertOk();
        $this->assertDatabaseCount('saved_searches', 1);
        $this->assertSame('gitar · İzmir', $this->actingAs($a, 'sanctum')->getJson('/api/saved-searches')->json('data.0.label'));

        $this->actingAs($b, 'sanctum')->deleteJson("/api/saved-searches/{$id}")->assertStatus(404);
        $this->actingAs($a, 'sanctum')->deleteJson("/api/saved-searches/{$id}")->assertOk();
        $this->assertDatabaseCount('saved_searches', 0);
    }

    public function test_saved_search_limit_is_enforced(): void
    {
        $user = User::factory()->create();
        foreach (range(1, 10) as $i) {
            $this->actingAs($user, 'sanctum')->postJson('/api/saved-searches', ['q' => "kelime{$i}"])->assertCreated();
        }
        $this->actingAs($user, 'sanctum')->postJson('/api/saved-searches', ['q' => 'fazla'])->assertStatus(422);
    }

    public function test_new_matching_listing_notifies_watchers_but_not_owner_or_non_matches(): void
    {
        $category = Category::create(['name' => 'Müzik']);
        $owner = User::factory()->create();
        $watcher = User::factory()->create();
        $other = User::factory()->create();
        SavedSearch::create(['user_id' => $watcher->id, 'q' => 'gitar', 'category_id' => $category->id]);
        SavedSearch::create(['user_id' => $watcher->id, 'city' => 'İzmir']); // aynı kullanıcı, tek bildirim
        SavedSearch::create(['user_id' => $other->id, 'q' => 'piyano']);
        SavedSearch::create(['user_id' => $owner->id, 'q' => 'gitar']);

        $this->publish($owner, $category);

        $list = $this->actingAs($watcher, 'sanctum')->getJson('/api/notifications')->assertOk();
        $this->assertCount(1, $list->json('data'));
        $this->assertSame('saved_search_match', $list->json('data.0.type'));
        $this->assertNotNull($list->json('data.0.product_id'));
        $this->assertCount(0, $this->actingAs($other, 'sanctum')->getJson('/api/notifications')->json('data'));
        $this->assertCount(0, $this->actingAs($owner, 'sanctum')->getJson('/api/notifications')->json('data'));
    }
}
