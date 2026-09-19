<?php

namespace App\Http\Controllers\Api;

use App\Enums\TradeStatus;
use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Trade;
use App\Models\User;
use App\Services\UserStats;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    // Tamamlanan (kabul edilmiş) takasın taraflarından biri, diğer tarafı bir kez değerlendirir.
    public function store(Request $request, $tradeId)
    {
        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:500',
        ], [
            'rating.required' => 'Bir puan seçin.',
            'rating.integer' => 'Bir puan seçin.',
            'rating.min' => 'Puan 1 ile 5 arasında olmalıdır.',
            'rating.max' => 'Puan 1 ile 5 arasında olmalıdır.',
            'comment.max' => 'Yorum en fazla 500 karakter olabilir.',
        ]);

        $trade = Trade::findOrFail($tradeId);
        $me = (int) $request->user()->id;

        if (!in_array($me, [(int) $trade->sender_id, (int) $trade->receiver_id], true)) {
            return response()->json(['message' => 'Teklif bulunamadı.'], 404); // katılımcı olmayanlara varlığı sızdırılmaz
        }
        if ($trade->status !== TradeStatus::Accepted) {
            return response()->json(['message' => 'Yalnızca tamamlanan takaslar değerlendirilebilir.'], 409);
        }
        if (Review::where(['trade_id' => $trade->id, 'reviewer_id' => $me])->exists()) {
            return response()->json(['message' => 'Bu takası zaten değerlendirdin.'], 409);
        }

        $revieweeId = $me === (int) $trade->sender_id ? (int) $trade->receiver_id : (int) $trade->sender_id;
        $review = Review::create([
            'trade_id' => $trade->id, 'reviewer_id' => $me, 'reviewee_id' => $revieweeId,
            'rating' => $data['rating'], 'comment' => isset($data['comment']) ? trim($data['comment']) ?: null : null,
        ]);

        return response()->json(['message' => 'Değerlendirmen kaydedildi.', 'id' => $review->id], 201);
    }

    // bir kullanıcının aldığı değerlendirmeler (herkese açık) + özet istatistikler
    public function index($userId)
    {
        $user = User::select('id', 'created_at')->whereNull('suspended_at')->findOrFail($userId);

        $reviews = Review::with('reviewer:id,name')->where('reviewee_id', $user->id)->latest()->limit(50)->get()
            ->map(fn (Review $r) => [
                'id' => $r->id, 'rating' => $r->rating, 'comment' => $r->comment,
                'reviewer' => $r->reviewer?->name ?? 'Silinmiş Kullanıcı', 'created_at' => $r->created_at,
            ]);

        return response()->json(['stats' => UserStats::for($user->id, $user->created_at), 'data' => $reviews]);
    }
}
