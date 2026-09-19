<?php

namespace App\Http\Controllers\Api;

use App\Enums\TradeStatus;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Trade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

// Hesap silme (KVKK): kişisel veriler anonimleştirilir, ilanlar kaldırılır, takas geçmişi diğer taraf için tutarlı kalsın diye satırlar silinmez.
class AccountController extends Controller
{
    // Kayıt sonrası kısa kişiselleştirme: ilgi alanları (kategoriler) ve isteğe bağlı şehir. Boş gönderilirse "şimdi değil" sayılır ve tekrar sorulmaz.
    public function onboarding(Request $request)
    {
        $data = $request->validate([
            'category_ids' => 'nullable|array|max:10',
            'category_ids.*' => 'integer|exists:categories,id',
            'city' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
        ], [
            'category_ids.max' => 'En fazla 10 ilgi alanı seçebilirsin.',
            'category_ids.*.exists' => 'Seçtiğin kategorilerden biri geçerli değil.',
        ]);

        $user = $request->user();
        $user->forceFill([
            'interest_category_ids' => array_values(array_unique(array_map('intval', $data['category_ids'] ?? []))),
            'onboarded_at' => now(),
        ]);
        if (!empty($data['city'])) {
            $user->city = trim($data['city']);
            $user->district = !empty($data['district']) ? trim($data['district']) : $user->district;
        }
        $user->save();

        return response()->json(['message' => 'Tercihlerin kaydedildi.', 'user' => $user]);
    }

    public function destroy(Request $request)
    {
        $data = $request->validate(['password' => 'required|string']);
        $user = $request->user();

        if (!Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Şifre hatalı.'], 422);
        }
        if ($user->is_admin) {
            return response()->json(['message' => 'Yönetici hesabı buradan silinemez.'], 422);
        }

        DB::transaction(function () use ($user) {
            Trade::where('status', TradeStatus::Pending->value)
                ->where(fn ($q) => $q->where('sender_id', $user->id)->orWhere('receiver_id', $user->id))
                ->update(['status' => TradeStatus::Cancelled->value]);

            Product::where('user_id', $user->id)->each(fn (Product $p) => $p->delete());

            $user->notifications()->delete();
            $user->tokens()->delete();
            \App\Models\SavedSearch::where('user_id', $user->id)->delete();

            $user->forceFill([
                'name' => 'Silinmiş Kullanıcı',
                'email' => 'silinmis-' . $user->id . '@deleted.invalid',
                'phone_number' => '',
                'profile_photo_path' => null,
                'address_title' => 'Ev',
                'city' => null,
                'district' => null,
                'password' => Str::random(40),
                'email_notifications' => false,
                'suspended_at' => now(),
            ])->save();
        });

        return response()->json(['message' => 'Hesabın silindi.']);
    }
}
