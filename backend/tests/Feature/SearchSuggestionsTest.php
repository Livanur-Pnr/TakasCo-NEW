<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchSuggestionsTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title, array $extra = []): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create($extra + [
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    public function test_suggestions_return_matching_public_products_categories_and_brands_only(): void
    {
        $owner = User::factory()->create();
        $suspended = User::factory()->create();
        $suspended->forceFill(['suspended_at' => now()])->save();
        Category::create(['name' => 'Telefon']);
        $this->product($owner, 'iPhone 14 Pro', ['brand' => 'Apple']);
        $this->product($owner, 'iPhone 13', ['status' => 3]);
        $this->product($suspended, 'iPhone gizli');
        $this->product($owner, 'Gitar');

        $res = $this->getJson('/api/search/suggestions?q=iph')->assertOk();
        $this->assertSame(['iPhone 14 Pro'], collect($res->json('products'))->pluck('title')->all());

        $this->assertSame(['Telefon'], collect($this->getJson('/api/search/suggestions?q=tel')->json('categories'))->pluck('name')->all());
        $this->assertSame(['Apple'], $this->getJson('/api/search/suggestions?q=app')->json('brands'));
    }

    public function test_short_or_wildcard_queries_return_nothing_unexpected(): void
    {
        $owner = User::factory()->create();
        $this->product($owner, 'Gitar');

        $this->assertSame([], $this->getJson('/api/search/suggestions?q=g')->json('products'));
        $this->assertSame([], $this->getJson('/api/search/suggestions')->json('products'));
        $this->assertSame([], $this->getJson('/api/search/suggestions?q=%25%25')->json('products'));
    }
}
