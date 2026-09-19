<?php

namespace App\Http\Controllers\Api;

use App\Enums\TradeStatus;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

// Yönetim paneli API'si. Tüm uçlar `IsAdmin` middleware'i ile korunur (bkz. routes/api.php);
// yetki kararı yalnızca backend'de verilir, istemci arayüzü sadece kolaylık içindir.
class AdminController extends Controller
{
    public const STATUS_REMOVED = 4; // moderasyonla kaldırılmış ilan (herkese açık listelerde görünmez)

    public function overview()
    {
        return response()->json([
            'users' => User::count(),
            'active_products' => Product::published()->count(),
            'removed_products' => Product::where('status', self::STATUS_REMOVED)->count(),
            'active_trades' => Trade::where('status', TradeStatus::Pending->value)->count(),
            'completed_trades' => Trade::where('status', TradeStatus::Accepted->value)->count(),
            'conversations' => \App\Models\Conversation::count(),
            'pending_reports' => \App\Models\Report::where('status', 'beklemede')->count(),
        ]);
    }

    public function products(Request $request)
    {
        $query = Product::withTrashed()->with(['user:id,name,email', 'category:id,name'])->latest();

        if ($request->filled('status')) {
            $query->where('status', (int) $request->input('status'));
        }
        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where('title', 'like', "%{$search}%");
        }

        $page = $query->paginate(min((int) $request->input('per_page', 20), 50));

        return response()->json($page->through(fn (Product $p) => [
            'id' => $p->id,
            'title' => $p->title,
            'status' => $p->status,
            'thumb_path' => $p->thumb_path,
            'category' => $p->category?->name,
            'owner' => $p->user ? ['id' => $p->user->id, 'name' => $p->user->name, 'email' => $p->user->email] : null,
            'created_at' => $p->created_at,
            'deleted' => $p->trashed(),
        ]));
    }

    // ilanı yayından kaldırır ve üzerindeki bekleyen teklifleri reddeder (tek transaction)
    public function removeProduct($id)
    {
        $product = Product::findOrFail($id);

        DB::transaction(function () use ($product) {
            $product->update(['status' => self::STATUS_REMOVED]);

            Trade::where('status', TradeStatus::Pending->value)
                ->where(fn ($q) => $q->where('offered_product_id', $product->id)->orWhere('requested_product_id', $product->id)->orWhereHas('extraProducts', fn ($p) => $p->where('products.id', $product->id)))
                ->update(['status' => TradeStatus::Rejected->value]);
        });

        return response()->json(['message' => 'İlan yayından kaldırıldı.']);
    }

    public function restoreProduct($id)
    {
        $product = Product::findOrFail($id);

        if ((int) $product->status !== self::STATUS_REMOVED) {
            return response()->json(['message' => 'Yalnızca kaldırılmış ilanlar geri yüklenebilir.'], 409);
        }

        $product->update(['status' => 1]);

        return response()->json(['message' => 'İlan yeniden yayına alındı.']);
    }

    public function users(Request $request)
    {
        $query = User::withCount('products')->latest();

        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        $page = $query->paginate(min((int) $request->input('per_page', 20), 50));

        return response()->json($page->through(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'city' => $u->city,
            'is_admin' => $u->is_admin,
            'suspended' => $u->suspended_at !== null,
            'products_count' => $u->products_count,
            'created_at' => $u->created_at,
        ]));
    }

    // askıya alma: tokenlar silinir, giriş ve API erişimi kapanır (yönetici ve kendi hesabın askıya alınamaz)
    public function suspendUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->is_admin || (int) $user->id === (int) $request->user()->id) {
            return response()->json(['message' => 'Bu hesap askıya alınamaz.'], 422);
        }

        $user->forceFill(['suspended_at' => now()])->save();
        $user->tokens()->delete();
        Cache::forget('cities.active');

        return response()->json(['message' => 'Hesap askıya alındı.']);
    }

    public function unsuspendUser($id)
    {
        User::findOrFail($id)->forceFill(['suspended_at' => null])->save();
        Cache::forget('cities.active');

        return response()->json(['message' => 'Askı kaldırıldı.']);
    }

    // şikayet kuyruğu: hedef bilgisiyle birlikte
    public function reports(Request $request)
    {
        $query = \App\Models\Report::with('reporter:id,name')->latest();
        $query->where('status', $request->input('status', 'beklemede'));

        $page = $query->paginate(min((int) $request->input('per_page', 20), 50));

        return response()->json($page->through(function (\App\Models\Report $r) {
            $target = $r->target_type === 'product'
                ? Product::withTrashed()->find($r->target_id)?->title
                : User::find($r->target_id)?->name;

            return [
                'id' => $r->id,
                'target_type' => $r->target_type,
                'target_id' => $r->target_id,
                'target_label' => $target ?? '(silinmiş)',
                'reason' => $r->reason,
                'details' => $r->details,
                'status' => $r->status,
                'reporter' => $r->reporter?->name,
                'created_at' => $r->created_at,
            ];
        }));
    }

    public function resolveReport(Request $request, $id)
    {
        $data = $request->validate(['status' => 'required|in:çözüldü,reddedildi']);
        $report = \App\Models\Report::findOrFail($id);
        $report->update(['status' => $data['status'], 'resolved_by' => $request->user()->id, 'resolved_at' => now()]);

        return response()->json(['message' => 'Şikayet güncellendi.']);
    }
}
