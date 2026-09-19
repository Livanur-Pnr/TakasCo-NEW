<?php

namespace App\Services;

use App\Enums\TradeStatus;
use App\Models\Review;
use App\Models\Trade;
use App\Models\User;

// Herkese açık güven göstergeleri: yalnızca gerçek verilerden hesaplanır (uydurma puan/rozet yok)
class UserStats
{
    public const BADGE_NEW_MEMBER = 'new_member';
    public const BADGE_TRUSTED_SWAPPER = 'trusted_swapper';
    public const BADGE_HIGHLY_RATED = 'highly_rated';
    public const BADGE_EMAIL_VERIFIED = 'email_verified';

    public static function for(int $userId, $memberSince = null): array
    {
        $reviews = Review::where('reviewee_id', $userId);
        $count = (clone $reviews)->count();
        $avg = $count ? round((float) (clone $reviews)->avg('rating'), 1) : null;

        $completed = Trade::where('status', TradeStatus::Accepted->value)
            ->where(fn ($q) => $q->where('sender_id', $userId)->orWhere('receiver_id', $userId))
            ->count();

        $memberSince ??= User::whereKey($userId)->value('created_at');
        $emailVerified = User::whereKey($userId)->whereNotNull('email_verified_at')->exists();

        $badges = [];
        if ($emailVerified) {
            $badges[] = self::BADGE_EMAIL_VERIFIED;
        }
        if ($memberSince && now()->diffInDays($memberSince, true) < 30) {
            $badges[] = self::BADGE_NEW_MEMBER;
        }
        if ($completed >= 3) {
            $badges[] = self::BADGE_TRUSTED_SWAPPER;
        }
        if ($count >= 3 && $avg >= 4.5) {
            $badges[] = self::BADGE_HIGHLY_RATED;
        }

        return ['rating_avg' => $avg, 'reviews_count' => $count, 'completed_trades' => $completed, 'email_verified' => $emailVerified, 'badges' => $badges];
    }
}
