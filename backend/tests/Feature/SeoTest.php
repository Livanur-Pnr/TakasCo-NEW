<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title, int $status = 1): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create([
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => 'y', 'status' => $status, 'image_path' => 'products/fake.jpg',
        ]);
    }

    public function test_robots_txt_hides_private_areas_and_points_to_the_sitemap(): void
    {
        config(['app.frontend_url' => 'https://takasco.example']);

        $body = $this->get('/robots.txt')->assertOk()->getContent();

        $this->assertStringContainsString('Disallow: /admin', $body);
        $this->assertStringContainsString('Disallow: /messages', $body);
        $this->assertStringContainsString('Sitemap: https://takasco.example/sitemap.xml', $body);
    }

    public function test_sitemap_lists_only_public_listings_with_frontend_urls(): void
    {
        config(['app.frontend_url' => 'https://takasco.example/']);
        $owner = User::factory()->create();
        $suspended = User::factory()->create();
        $suspended->forceFill(['suspended_at' => now()])->save();
        $live = $this->product($owner, 'Yayında');
        $traded = $this->product($owner, 'Takaslanmış', 3);
        $removed = $this->product($owner, 'Kaldırılmış', 4);
        $hidden = $this->product($suspended, 'Askıdaki');

        $res = $this->get('/sitemap.xml')->assertOk();
        $xml = $res->getContent();

        $this->assertStringContainsString('application/xml', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('<loc>https://takasco.example/product/' . $live->id . '</loc>', $xml);
        $this->assertStringContainsString('<loc>https://takasco.example/sss</loc>', $xml);
        foreach ([$traded, $removed, $hidden] as $p) {
            $this->assertStringNotContainsString('/product/' . $p->id . '<', $xml);
        }
        $this->assertNotFalse(simplexml_load_string($xml));
    }
}
