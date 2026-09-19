<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\ProductImageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ProductImageTest extends TestCase
{
    use RefreshDatabase;

    /** @var string[] test sırasında diske yazılan ve temizlenecek göreli yollar */
    private array $created = [];

    protected function tearDown(): void
    {
        foreach ($this->created as $path) {
            ProductImageService::delete($path);
        }
        parent::tearDown();
    }

    public function test_service_creates_main_and_thumbnail_and_deletes_both(): void
    {
        $path = ProductImageService::store(UploadedFile::fake()->image('foto.png', 1200, 900));
        $this->created[] = $path;

        $this->assertStringEndsWith('.jpg', $path); // uzantı istemciden değil sunucudan gelir
        $this->assertFileExists(storage_path('app/public/' . $path));
        $this->assertFileExists(storage_path('app/public/' . ProductImageService::thumbPathFor($path)));
        $this->assertSame(ProductImageService::thumbPathFor($path), ProductImageService::thumbOrOriginal($path));

        ProductImageService::delete($path);
        $this->assertFileDoesNotExist(storage_path('app/public/' . $path));
        $this->assertFileDoesNotExist(storage_path('app/public/' . ProductImageService::thumbPathFor($path)));
    }

    public function test_thumb_falls_back_to_original_and_understands_legacy_json_paths(): void
    {
        $this->assertSame('products/yok.jpg', ProductImageService::thumbOrOriginal('products/yok.jpg'));
        $this->assertSame('products/yok.jpg', ProductImageService::thumbOrOriginal('["products\/yok.jpg"]'));
        $this->assertSame('https://ornek.com/a.jpg', ProductImageService::thumbOrOriginal('https://ornek.com/a.jpg'));
        $this->assertSame(['products/a.jpg'], ProductImageService::pathsFrom('["products\/a.jpg"]'));
    }

    public function test_store_accepts_up_to_eight_images_and_rejects_more(): void
    {
        $user = User::factory()->create();
        $category = Category::create(['name' => 'Elektronik']);
        $payload = fn (int $count) => [
            'title' => 'Çok fotoğraflı', 'category_id' => $category->id, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y',
            'images' => array_map(fn ($i) => UploadedFile::fake()->image("f{$i}.jpg", 300, 300), range(1, $count)),
        ];

        $ok = $this->actingAs($user, 'sanctum')->post('/api/products', $payload(8), ['Accept' => 'application/json']);
        $ok->assertStatus(201);
        foreach ($ok->json('product.images') as $image) {
            $this->created[] = $image['image_path'];
        }
        $this->assertCount(8, $ok->json('product.images'));

        $this->actingAs($user, 'sanctum')->post('/api/products', $payload(9), ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_update_rejects_non_image_uploads(): void
    {
        $owner = User::factory()->create();
        $category = Category::create(['name' => 'Elektronik']);
        $product = Product::create([
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => 't', 'description' => 'd', 'condition' => 'Sıfır',
            'swap_expectation' => 'y', 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);

        $this->actingAs($owner, 'sanctum')->put("/api/products/{$product->id}", [
            'images' => [UploadedFile::fake()->create('zararli.php', 10, 'application/x-php')],
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_owner_can_add_photos_up_to_limit_and_cover_moves_when_deleted(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $category = Category::create(['name' => 'Elektronik']);
        $create = $this->actingAs($owner, 'sanctum')->post('/api/products', [
            'title' => 'Foto', 'category_id' => $category->id, 'description' => 'd', 'condition' => 'Sıfır', 'swap_expectation' => 'y',
            'images' => [UploadedFile::fake()->image('a.jpg', 300, 300)],
        ], ['Accept' => 'application/json'])->assertStatus(201);
        $id = $create->json('product.id');
        $this->created[] = $create->json('product.images.0.image_path');
        $coverId = $create->json('product.images.0.id');

        $img = fn (string $n) => UploadedFile::fake()->image($n, 300, 300);

        $this->actingAs($stranger, 'sanctum')->post("/api/products/{$id}/images", ['images' => [$img('x.jpg')]], ['Accept' => 'application/json'])->assertStatus(403);

        $added = $this->actingAs($owner, 'sanctum')->post("/api/products/{$id}/images", ['images' => [$img('b.jpg')]], ['Accept' => 'application/json'])->assertStatus(201);
        $this->created[] = $added->json('images.1.image_path');
        $secondPath = $added->json('images.1.image_path');
        $this->assertCount(2, $added->json('images'));

        $this->actingAs($owner, 'sanctum')->post("/api/products/{$id}/images", [
            'images' => array_map($img, ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg']),
        ], ['Accept' => 'application/json'])->assertStatus(422);

        // kapak silinince sıradaki kapak olur; son fotoğraf silinemez
        $this->actingAs($owner, 'sanctum')->deleteJson("/api/products/images/{$coverId}")->assertOk();
        $this->assertSame($secondPath, Product::find($id)->image_path);
        $remaining = Product::find($id)->images()->first();
        $this->assertTrue((bool) $remaining->is_primary);
        $this->actingAs($owner, 'sanctum')->deleteJson("/api/products/images/{$remaining->id}")->assertStatus(409);
    }
}
