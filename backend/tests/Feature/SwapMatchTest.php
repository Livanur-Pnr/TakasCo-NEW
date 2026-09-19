<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Trade;
use App\Models\User;
use App\Services\SwapMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SwapMatchTest extends TestCase
{
    use RefreshDatabase;

    private function product(User $owner, string $title, string $wants, array $extra = []): Product
    {
        $category = Category::firstOrCreate(['name' => 'Elektronik']);

        return Product::create($extra + [
            'user_id' => $owner->id, 'category_id' => $category->id, 'title' => $title, 'description' => 'd',
            'condition' => 'Sıfır', 'swap_expectation' => $wants, 'status' => 1, 'image_path' => 'products/fake.jpg',
        ]);
    }

    public function test_tokenizer_and_similarity_handle_turkish_text_and_suffixes(): void
    {
        $this->assertSame(['playstation', 'steam', 'deck'], SwapMatcher::tokens('PlayStation ve Steam Deck için takas'));
        $this->assertTrue(SwapMatcher::similar('telefon', 'telefonu'));
        $this->assertTrue(SwapMatcher::similar('iphone', 'iphone'));
        $this->assertFalse(SwapMatcher::similar('kam', 'kamera')); // çok kısa kök eşleşme sayılmaz
        $this->assertFalse(SwapMatcher::similar('gitar', 'kitap'));
        $this->assertSame(1, SwapMatcher::overlap(['steam', 'laptop'], ['steam', 'deck', 'oled']));
    }

    public function test_mutual_matches_rank_above_one_way_and_unrelated_items_are_ignored(): void
    {
        $me = User::factory()->create();
        $ali = User::factory()->create(['name' => 'Ali']);
        $veli = User::factory()->create();
        $mine = $this->product($me, 'PlayStation 5', 'Steam Deck');
        $mutual = $this->product($ali, 'Steam Deck OLED', 'PlayStation veya konsol');
        $oneWay = $this->product($veli, 'Steam Deck LCD', 'Bisiklet');
        $this->product($veli, 'Gitar', 'Kitap');

        $data = $this->actingAs($me, 'sanctum')->getJson('/api/matches')->assertOk()->json('data');

        $this->assertCount(2, $data);
        $this->assertSame($mutual->id, $data[0]['their_product']['id']);
        $this->assertTrue($data[0]['mutual']);
        $this->assertSame($mine->id, $data[0]['my_product']['id']);
        $this->assertSame('Ali', $data[0]['their_product']['user']['name']);
        $this->assertSame($oneWay->id, $data[1]['their_product']['id']);
        $this->assertFalse($data[1]['mutual']);
        $this->assertArrayNotHasKey('email', $data[0]['their_product']['user']);
    }

    public function test_matches_exclude_own_sale_only_blocked_suspended_traded_and_already_offered_items(): void
    {
        $me = User::factory()->create();
        $blocked = User::factory()->create();
        $suspended = User::factory()->create();
        $suspended->forceFill(['suspended_at' => now()])->save();
        $other = User::factory()->create();
        $mine = $this->product($me, 'PlayStation 5', 'Steam Deck');
        $this->product($me, 'Steam Deck kendi ilanım', 'x');
        $this->product($other, 'Steam Deck satılık', 'PlayStation', ['listing_type' => 'satilik', 'price' => 100]);
        $this->product($blocked, 'Steam Deck engelli', 'PlayStation');
        $this->product($suspended, 'Steam Deck askıda', 'PlayStation');
        $this->product($other, 'Steam Deck takaslanmış', 'PlayStation', ['status' => 3]);
        $offered = $this->product($other, 'Steam Deck teklif verilmiş', 'PlayStation');
        $this->actingAs($me, 'sanctum')->postJson("/api/users/{$blocked->id}/block")->assertOk();
        Trade::create(['sender_id' => $me->id, 'receiver_id' => $other->id, 'offered_product_id' => $mine->id, 'requested_product_id' => $offered->id, 'status' => 'beklemede']);

        $this->assertSame([], $this->actingAs($me, 'sanctum')->getJson('/api/matches')->assertOk()->json('data'));
    }

    public function test_matches_require_login_and_are_empty_without_listings(): void
    {
        $this->getJson('/api/matches')->assertStatus(401);
        $user = User::factory()->create();
        $this->assertSame([], $this->actingAs($user, 'sanctum')->getJson('/api/matches')->json('data'));
    }
}
