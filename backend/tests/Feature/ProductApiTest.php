<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use App\Services\ProductImageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeProduct(User $owner, array $overrides = []): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create(array_merge([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Test Ürünü',
            'description' => 'Açıklama',
            'condition' => 'Sıfır',
            'swap_expectation' => 'Kitap',
            'city' => 'İzmir',
            'status' => 1,
            'image_path' => 'products/fake.jpg',
        ], $overrides));
    }

    public function test_owner_can_update_own_product(): void
    {
        $owner = User::factory()->create();
        $product = $this->makeProduct($owner);

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/products/{$product->id}", ['title' => 'Yeni Başlık'])
            ->assertOk();

        $this->assertSame('Yeni Başlık', $product->fresh()->title);
    }

    public function test_user_cannot_update_someone_elses_product(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $product = $this->makeProduct($owner);

        $this->actingAs($intruder, 'sanctum')
            ->putJson("/api/products/{$product->id}", ['title' => 'Ele Geçirildi'])
            ->assertStatus(403);

        $this->assertSame('Test Ürünü', $product->fresh()->title);
    }

    public function test_user_cannot_delete_someone_elses_product(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $product = $this->makeProduct($owner);

        $this->actingAs($intruder, 'sanctum')
            ->deleteJson("/api/products/{$product->id}")
            ->assertStatus(403);

        $this->assertNotNull(Product::find($product->id));
    }

    public function test_owner_can_delete_own_product(): void
    {
        $owner = User::factory()->create();
        $product = $this->makeProduct($owner);

        $this->actingAs($owner, 'sanctum')->deleteJson("/api/products/{$product->id}")->assertOk();

        $this->assertNull(Product::find($product->id));
    }

    public function test_updating_missing_product_returns_404_not_500(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->putJson('/api/products/9999', ['title' => 'x'])->assertStatus(404);
    }

    public function test_user_cannot_delete_someone_elses_product_image(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $product = $this->makeProduct($owner);
        $image = ProductImage::create(['product_id' => $product->id, 'image_path' => 'products/a.jpg', 'is_primary' => true, 'sort_order' => 0]);

        $this->actingAs($intruder, 'sanctum')->deleteJson("/api/products/images/{$image->id}")->assertStatus(403);

        $this->assertNotNull(ProductImage::find($image->id));
    }

    public function test_guest_cannot_create_update_or_delete_products(): void
    {
        $owner = User::factory()->create();
        $product = $this->makeProduct($owner);

        $this->postJson('/api/products', [])->assertStatus(401);
        $this->putJson("/api/products/{$product->id}", ['title' => 'x'])->assertStatus(401);
        $this->deleteJson("/api/products/{$product->id}")->assertStatus(401);
    }

    public function test_favorite_toggle_never_creates_duplicates(): void
    {
        $owner = User::factory()->create();
        $fan = User::factory()->create();
        $product = $this->makeProduct($owner);

        $this->actingAs($fan, 'sanctum')->postJson("/api/products/{$product->id}/favorite")->assertOk()->assertJson(['is_favorite' => true]);
        $this->assertSame(1, DB::table('favorites')->where('product_id', $product->id)->count());

        $this->actingAs($fan, 'sanctum')->postJson("/api/products/{$product->id}/favorite")->assertOk()->assertJson(['is_favorite' => false]);
        $this->assertSame(0, DB::table('favorites')->where('product_id', $product->id)->count());
    }

    public function test_database_rejects_duplicate_favorite_rows(): void
    {
        $owner = User::factory()->create();
        $fan = User::factory()->create();
        $product = $this->makeProduct($owner);

        DB::table('favorites')->insert(['user_id' => $fan->id, 'product_id' => $product->id, 'created_at' => now(), 'updated_at' => now()]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        DB::table('favorites')->insert(['user_id' => $fan->id, 'product_id' => $product->id, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_listing_hides_traded_products_and_does_not_leak_private_user_fields(): void
    {
        $owner = User::factory()->create();
        $this->makeProduct($owner, ['title' => 'Yayında']);
        $this->makeProduct($owner, ['title' => 'Takaslanmış', 'status' => 3]);

        $response = $this->getJson('/api/products')->assertOk();

        $titles = collect($response->json('data'))->pluck('title');
        $this->assertTrue($titles->contains('Yayında'));
        $this->assertFalse($titles->contains('Takaslanmış'));

        $user = $response->json('data.0.user');
        $this->assertArrayNotHasKey('email', $user);
        $this->assertArrayNotHasKey('phone_number', $user);
        $this->assertArrayNotHasKey('password', $user);
    }

    public function test_listing_filters_and_sorting(): void
    {
        $owner = User::factory()->create();
        $electronics = Category::create(['name' => 'Elektronik']);
        $fashion = Category::create(['name' => 'Moda']);
        $a = $this->makeProduct($owner, ['title' => 'Telefon', 'category_id' => $electronics->id, 'condition' => 'Sıfır']);
        $b = $this->makeProduct($owner, ['title' => 'Ceket', 'category_id' => $fashion->id, 'condition' => 'Eskimiş']);

        $byCategory = $this->getJson("/api/products?category_id={$fashion->id}")->json('data');
        $this->assertCount(1, $byCategory);
        $this->assertSame('Ceket', $byCategory[0]['title']);

        $bySearch = $this->getJson('/api/products?q=Telef')->json('data');
        $this->assertSame('Telefon', $bySearch[0]['title']);

        $byCondition = $this->getJson('/api/products?condition=' . urlencode('Eskimiş'))->json('data');
        $this->assertSame('Ceket', $byCondition[0]['title']);

        $fan = User::factory()->create();
        DB::table('favorites')->insert(['user_id' => $fan->id, 'product_id' => $b->id, 'created_at' => now(), 'updated_at' => now()]);
        $popular = $this->getJson('/api/products?sort=popular')->json('data');
        $this->assertSame('Ceket', $popular[0]['title']);
    }

    public function test_per_page_is_capped(): void
    {
        $owner = User::factory()->create();
        $this->makeProduct($owner);

        $this->getJson('/api/products?per_page=100000')->assertOk()->assertJsonPath('per_page', 50);
    }

    public function test_cached_categories_and_cities_stay_plain_arrays_with_a_serializing_cache_store(): void
    {
        // veritabanı/dosya önbelleği nesneleri geri yüklerken sınıfları reddeder; yanıt her iki okumada da dizi olmalı
        config(['cache.default' => 'file']);
        \Illuminate\Support\Facades\Cache::forget('categories.all');
        \Illuminate\Support\Facades\Cache::forget('cities.active');
        $owner = User::factory()->create();
        $this->makeProduct($owner, ['city' => 'İzmir']);

        foreach ([1, 2] as $_) {
            $this->assertIsArray($this->getJson('/api/categories')->assertOk()->json());
            $this->assertNotEmpty($this->getJson('/api/categories')->json());
            $this->assertSame(['İzmir'], $this->getJson('/api/cities')->assertOk()->json());
        }

        \Illuminate\Support\Facades\Cache::forget('categories.all');
        \Illuminate\Support\Facades\Cache::forget('cities.active');
    }

    public function test_cities_endpoint_lists_only_cities_of_active_products(): void
    {
        $owner = User::factory()->create();
        $this->makeProduct($owner, ['city' => 'İzmir']);
        $this->makeProduct($owner, ['city' => 'Ankara']);
        $this->makeProduct($owner, ['city' => 'Van', 'status' => 3]);

        $cities = $this->getJson('/api/cities')->assertOk()->json();

        $this->assertEqualsCanonicalizing(['Ankara', 'İzmir'], $cities);
    }

    public function test_store_rejects_invalid_category_and_condition(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/products', [
            'title' => 'x', 'category_id' => 9999, 'description' => 'd', 'condition' => 'Yepyeni',
            'swap_expectation' => 'y',
        ])->assertStatus(422)->assertJsonValidationErrors(['category_id', 'condition']);
    }

    public function test_product_detail_includes_other_listings_of_same_seller(): void
    {
        $seller = User::factory()->create();
        $other = User::factory()->create();
        $main = $this->makeProduct($seller, ['title' => 'Ana']);
        $this->makeProduct($seller, ['title' => 'Satıcının Diğeri']);
        $this->makeProduct($seller, ['title' => 'Takaslanmış Diğeri', 'status' => 3]);
        $this->makeProduct($other, ['title' => 'Başkasının']);

        $titles = collect($this->getJson("/api/products/{$main->id}")->assertOk()->json('seller_products'))->pluck('title');

        $this->assertSame(['Satıcının Diğeri'], $titles->all());
    }

    public function test_owner_can_edit_text_fields_and_category_but_not_others_listing(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $product = $this->makeProduct($owner, ['title' => 'Eski']);
        $newCategory = Category::firstOrCreate(['name' => 'Kitap']);

        $this->actingAs($stranger, 'sanctum')->putJson("/api/products/{$product->id}", ['title' => 'Hack'])->assertStatus(403);
        $this->actingAs($owner, 'sanctum')->putJson("/api/products/{$product->id}", ['title' => 'Yeni', 'category_id' => $newCategory->id])->assertOk();
        $this->actingAs($owner, 'sanctum')->putJson("/api/products/{$product->id}", ['category_id' => 9999])->assertStatus(422);

        $fresh = $product->fresh();
        $this->assertSame('Yeni', $fresh->title);
        $this->assertSame($newCategory->id, (int) $fresh->category_id);
    }

    public function test_traded_or_removed_listing_cannot_be_edited(): void
    {
        $owner = User::factory()->create();
        $traded = $this->makeProduct($owner, ['status' => 3]);
        $removed = $this->makeProduct($owner, ['status' => 4]);

        $this->actingAs($owner, 'sanctum')->putJson("/api/products/{$traded->id}", ['title' => 'x'])->assertStatus(409);
        $this->actingAs($owner, 'sanctum')->putJson("/api/products/{$removed->id}", ['title' => 'x'])->assertStatus(409);
    }

    public function test_views_are_counted_once_per_visitor_and_never_for_the_owner(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $other = User::factory()->create();
        $product = $this->makeProduct($owner);

        $this->actingAs($owner, 'sanctum')->getJson("/api/products/{$product->id}")->assertOk();
        $this->assertSame(0, (int) $product->fresh()->views);

        $first = $this->actingAs($viewer, 'sanctum')->getJson("/api/products/{$product->id}")->assertOk();
        $this->assertSame(1, $first->json('views'));
        $this->actingAs($viewer, 'sanctum')->getJson("/api/products/{$product->id}")->assertOk();
        $this->assertSame(1, (int) $product->fresh()->views);

        $this->actingAs($other, 'sanctum')->getJson("/api/products/{$product->id}")->assertOk();
        $this->assertSame(2, (int) $product->fresh()->views);
    }

    public function test_listing_types_validate_price_and_swap_expectation(): void
    {
        $user = User::factory()->create();
        $category = Category::firstOrCreate(['name' => 'Elektronik']);
        $base = ['title' => 'Test', 'category_id' => $category->id, 'description' => 'd', 'condition' => 'Sıfır',
            'images' => [UploadedFile::fake()->image('a.jpg', 300, 300)]];
        $post = fn (array $extra) => $this->actingAs($user, 'sanctum')->post('/api/products', $base + $extra, ['Accept' => 'application/json']);

        $post(['listing_type' => 'satilik'])->assertStatus(422)->assertJsonValidationErrors(['price']);
        $post(['listing_type' => 'takas'])->assertStatus(422)->assertJsonValidationErrors(['swap_expectation']);
        $post(['listing_type' => 'ikisi', 'price' => 500])->assertStatus(422)->assertJsonValidationErrors(['swap_expectation']);
        $post(['listing_type' => 'foo', 'price' => 5, 'swap_expectation' => 'x'])->assertStatus(422);

        $sale = $post(['listing_type' => 'satilik', 'price' => 1500, 'brand' => 'Nike', 'shipping_enabled' => true])->assertCreated();
        $this->assertSame('satilik', $sale->json('product.listing_type'));
        $this->assertEquals(1500, $sale->json('product.price'));
        $this->assertSame('', $sale->json('product.swap_expectation'));

        // eski istemci (tür göndermeyen) takas ilanı açmaya devam eder, fiyat yok sayılır
        $legacy = $post(['swap_expectation' => 'Kitap', 'price' => 99])->assertCreated();
        $this->assertSame('takas', $legacy->json('product.listing_type'));
        $this->assertNull($legacy->json('product.price'));

        foreach ([$sale, $legacy] as $res) {
            ProductImageService::delete($res->json('product.images.0.image_path'));
        }
    }

    public function test_price_type_brand_filters_and_price_sorting(): void
    {
        $owner = User::factory()->create();
        $this->makeProduct($owner, ['title' => 'Ucuz', 'listing_type' => 'satilik', 'price' => 100, 'brand' => 'Nike']);
        $this->makeProduct($owner, ['title' => 'Pahalı', 'listing_type' => 'ikisi', 'price' => 900, 'brand' => 'Adidas']);
        $this->makeProduct($owner, ['title' => 'SadeceTakas', 'listing_type' => 'takas']);

        $titles = fn (string $qs) => collect($this->getJson('/api/products?' . $qs)->assertOk()->json('data'))->pluck('title')->all();

        $this->assertEqualsCanonicalizing(['Ucuz', 'Pahalı'], $titles('listing_type=satilik'));
        $this->assertEqualsCanonicalizing(['Pahalı', 'SadeceTakas'], $titles('listing_type=takas'));
        $this->assertSame(['Pahalı'], $titles('min_price=500'));
        $this->assertSame(['Ucuz'], $titles('max_price=500'));
        $this->assertSame(['Ucuz'], $titles('brand=Nike'));
        $this->assertSame(['Ucuz', 'Pahalı'], $titles('sort=price_asc'));
        $this->assertSame(['Pahalı', 'Ucuz'], $titles('sort=price_desc'));
    }

    public function test_sale_only_listings_cannot_receive_or_offer_swap_and_edit_keeps_consistency(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $sale = $this->makeProduct($seller, ['listing_type' => 'satilik', 'price' => 200, 'swap_expectation' => '']);
        $mine = $this->makeProduct($buyer);

        $this->actingAs($buyer, 'sanctum')->postJson('/api/trades', ['offered_product_id' => $mine->id, 'requested_product_id' => $sale->id])->assertStatus(409);

        $this->actingAs($seller, 'sanctum')->putJson("/api/products/{$sale->id}", ['listing_type' => 'ikisi'])->assertStatus(422)->assertJsonValidationErrors(['swap_expectation']);
        $this->actingAs($seller, 'sanctum')->putJson("/api/products/{$sale->id}", ['listing_type' => 'ikisi', 'swap_expectation' => 'Kitap'])->assertOk();
        $this->actingAs($buyer, 'sanctum')->postJson('/api/trades', ['offered_product_id' => $mine->id, 'requested_product_id' => $sale->id])->assertCreated();

        $this->actingAs($seller, 'sanctum')->putJson("/api/products/{$sale->id}", ['listing_type' => 'takas'])->assertOk();
        $this->assertNull($sale->fresh()->price);
    }
}
