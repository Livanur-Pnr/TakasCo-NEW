<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use App\Services\UserStats;

class UserController extends Controller
{
    // bir kullanıcının herkese açık profil bilgileri (e-posta/telefon gibi gizli veriler hariç)
    public function show($id)
    {
        $user = User::select('id', 'name', 'city', 'district', 'profile_photo_path', 'bio', 'created_at')->whereNull('suspended_at')->findOrFail($id);
        return response()->json(array_merge($user->toArray(), UserStats::for($user->id, $user->created_at)));
    }

    // bir kullanıcının yayında olan ilanları (profil sayfasında gösterilmek üzere)
    public function products($id)
    {
        User::select('id')->whereNull('suspended_at')->findOrFail($id);

        // ?status=traded → bu kullanıcının takas ettiği (tamamlanmış) ilanlar; herkese açık profilde "Takaslananlar" sekmesi
        $query = request('status') === 'traded'
            ? Product::where('user_id', $id)->where('status', 3)
            : Product::where('user_id', $id)->published();

        $products = $query
            ->with(['category', 'images'])
            ->latest()
            ->limit(300) // sınırsız büyümeye karşı güvenlik sınırı
            ->get();

        return response()->json($products);
    }
}
