<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SavedSearch;
use App\Models\UserBlock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// "Sana Özel": yalnızca kullanıcının kendi gerçek etkinliğinden (favoriler, ilanları, kayıtlı aramaları) türetilen öneriler.
// Hiç sinyal yoksa boş döner (arayüzde bölüm görünmez); uydurma/rastgele öneri üretilmez.
class RecommendationController extends Controller
{
    private const LIMIT = 12;
    private const CANDIDATES = 200;

    public function index(Request $request)
    {
        $user = $request->user();
        $uid = (int) $user->id;

        $favoriteIds = DB::table('favorites')->where('user_id', $uid)->pluck('product_id');
        $favoriteCategories = Product::withTrashed()->whereIn('id', $favoriteIds)->pluck('category_id')->countBy();
        $ownCategories = Product::where('user_id', $uid)->whereIn('status', [1, 2])->pluck('category_id')->countBy();
        $searches = SavedSearch::where('user_id', $uid)->get();
        $interests = collect($user->interest_category_ids ?? [])->map(fn ($id) => (int) $id);

        if ($favoriteCategories->isEmpty() && $ownCategories->isEmpty() && $searches->isEmpty() && $interests->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $blocked = UserBlock::where('blocker_id', $uid)->pluck('blocked_id')
            ->merge(UserBlock::where('blocked_id', $uid)->pluck('blocker_id'))->unique()->all();

        $candidates = Product::published()->with(['category', 'images', 'user:id,name,city,district,profile_photo_path'])->withCount('favoritedBy')
            ->where('user_id', '!=', $uid)->whereNotIn('id', $favoriteIds)->whereNotIn('user_id', $blocked)
            ->latest()->limit(self::CANDIDATES)->get();

        $scored = $candidates->map(function (Product $p) use ($favoriteCategories, $ownCategories, $searches, $interests, $user) {
            $score = 0;
            $reason = null;

            if ($n = $favoriteCategories->get($p->category_id)) {
                $score += 3 * min($n, 3);
                $reason = 'Favorilerine benzer';
            }
            foreach ($searches as $s) {
                if ($s->matches($p)) {
                    $score += 4;
                    $reason = 'Kayıtlı aramana uygun';
                    break;
                }
            }
            if ($interests->contains((int) $p->category_id)) {
                $score += 2;
                $reason ??= 'İlgi alanlarına uygun';
            }
            if ($n = $ownCategories->get($p->category_id)) {
                $score += min($n, 2);
                $reason ??= 'İlanlarına benzer kategoride';
            }
            if ($score > 0 && $user->city && $p->city === $user->city) {
                $score += 1; // şehir yalnızca sıralamaya yardım eder, tek başına öneri sebebi değildir
            }

            $p->setAttribute('reason', $reason);

            return ['product' => $p, 'score' => $score];
        })->filter(fn ($row) => $row['score'] > 0);

        $sorted = $scored->sortByDesc(fn ($row) => [$row['score'], $row['product']->id])->take(self::LIMIT)->pluck('product')->values();

        return response()->json(['data' => $sorted]);
    }
}
