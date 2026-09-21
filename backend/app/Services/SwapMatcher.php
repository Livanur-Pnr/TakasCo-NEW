<?php

namespace App\Services;

use App\Enums\TradeStatus;
use App\Models\Product;
use App\Models\Trade;
use App\Models\UserBlock;

// Takas eşleşmesi: "takas beklentisi" metinlerini karşı ilanların başlık/kategori/marka bilgileriyle karşılaştırır.
// Yalnızca gerçek ilan verisi kullanılır; skor, ortak anahtar kelime sayısıdır (uydurma yüzde yok).
class SwapMatcher
{
    private const STOPWORDS = ['ile', 'için', 'icin', 'veya', 'ama', 'gibi', 'olan', 'bir', 'bu', 'şu', 'her', 'hem', 'daha', 'çok', 'cok', 'ise', 'den', 'dan', 'karşılığında', 'karsiliginda', 'takas', 'takasa', 'olur', 'olabilir', 'isterim', 'istiyorum', 'arıyorum', 'ariyorum', 'benzeri', 'uygun', 'yeni', 'iyi'];
    private const CANDIDATE_LIMIT = 300;

    /** @return string[] */
    public static function tokens(?string $text): array
    {
        $text = mb_strtolower(str_replace(['İ', 'I'], ['i', 'ı'], (string) $text));
        $parts = preg_split('/[^\p{L}\p{N}]+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_unique(array_filter($parts, fn ($t) => mb_strlen($t) >= 3 && !in_array($t, self::STOPWORDS, true))));
    }

    // Türkçe ekleri kabaca yakalamak için: kelimeler eşit ya da kısa olan (≥ 4 harf) uzun olanın başında yer alıyor
    public static function similar(string $a, string $b): bool
    {
        if ($a === $b) {
            return true;
        }
        [$short, $long] = mb_strlen($a) <= mb_strlen($b) ? [$a, $b] : [$b, $a];

        return mb_strlen($short) >= 4 && str_starts_with($long, $short);
    }

    /** @param string[] $wanted @param string[] $offered */
    public static function overlap(array $wanted, array $offered): int
    {
        $hits = 0;
        foreach ($wanted as $w) {
            foreach ($offered as $o) {
                if (self::similar($w, $o)) {
                    $hits++;
                    break;
                }
            }
        }

        return $hits;
    }

    private static function descriptor(Product $p): array
    {
        return self::tokens($p->title . ' ' . ($p->brand ?? '') . ' ' . ($p->category?->name ?? ''));
    }

    /** @return array<int, array<string, mixed>> */
    public static function forUser(int $userId, int $limit = 10): array
    {
        $mine = Product::with('category')->where('user_id', $userId)->whereIn('status', [1, 2])
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where('listing_type', '!=', 'satilik')->latest()->limit(20)->get();
        if ($mine->isEmpty()) {
            return [];
        }

        $blocked = UserBlock::where('blocker_id', $userId)->pluck('blocked_id')
            ->merge(UserBlock::where('blocked_id', $userId)->pluck('blocker_id'))->unique()->all();

        $others = Product::published()->with(['category', 'user:id,name'])->where('user_id', '!=', $userId)
            ->where('listing_type', '!=', 'satilik')->where('status', '!=', 5)->whereNotIn('user_id', $blocked)->latest()->limit(self::CANDIDATE_LIMIT)->get();

        $pending = Trade::where('status', TradeStatus::Pending->value)
            ->where(fn ($q) => $q->where('sender_id', $userId)->orWhere('receiver_id', $userId))
            ->get(['offered_product_id', 'requested_product_id'])
            ->map(fn ($t) => $t->offered_product_id . ':' . $t->requested_product_id)->all();

        $matches = [];
        foreach ($mine as $a) {
            $wantedByMe = self::tokens($a->swap_expectation);
            $myDescriptor = self::descriptor($a);
            foreach ($others as $b) {
                if (in_array($a->id . ':' . $b->id, $pending, true) || in_array($b->id . ':' . $a->id, $pending, true)) {
                    continue;
                }
                $forward = self::overlap($wantedByMe, self::descriptor($b));     // benim istediğim onda var mı
                if ($forward === 0) {
                    continue;
                }
                $backward = self::overlap(self::tokens($b->swap_expectation), $myDescriptor); // onun istediği bende var mı
                $matches[] = ['mine' => $a, 'theirs' => $b, 'mutual' => $backward > 0, 'score' => $forward + $backward];
            }
        }

        usort($matches, fn ($x, $y) => [$y['mutual'], $y['score'], $y['theirs']->id] <=> [$x['mutual'], $x['score'], $x['theirs']->id]);

        return array_map(fn ($m) => [
            'mutual' => $m['mutual'],
            'score' => $m['score'],
            'my_product' => ['id' => $m['mine']->id, 'title' => $m['mine']->title, 'thumb_path' => $m['mine']->thumb_path],
            'their_product' => [
                'id' => $m['theirs']->id, 'title' => $m['theirs']->title, 'thumb_path' => $m['theirs']->thumb_path,
                'city' => $m['theirs']->city, 'price' => $m['theirs']->price, 'user' => ['id' => $m['theirs']->user?->id, 'name' => $m['theirs']->user?->name],
            ],
        ], array_slice($matches, 0, $limit));
    }
}
