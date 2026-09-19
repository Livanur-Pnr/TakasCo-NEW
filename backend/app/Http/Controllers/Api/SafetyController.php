<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use App\Models\UserBlock;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Güvenlik: şikayet etme ve kullanıcı engelleme
class SafetyController extends Controller
{
    public function report(Request $request)
    {
        $data = $request->validate([
            'target_type' => ['required', Rule::in(Report::TYPES)],
            'target_id' => 'required|integer',
            'reason' => ['required', Rule::in(Report::REASONS)],
            'details' => 'nullable|string|max:1000',
        ], [
            'reason.in' => 'Lütfen geçerli bir şikayet nedeni seçin.',
            'target_type.in' => 'Geçersiz şikayet hedefi.',
        ]);

        $me = (int) $request->user()->id;
        $ownerId = $data['target_type'] === 'product'
            ? Product::whereKey($data['target_id'])->value('user_id')
            : User::whereKey($data['target_id'])->value('id');

        abort_if($ownerId === null, 404);

        if ((int) $ownerId === $me) {
            return response()->json(['message' => 'Kendi hesabını veya ilanını şikayet edemezsin.'], 422);
        }

        if (Report::where(['reporter_id' => $me, 'target_type' => $data['target_type'], 'target_id' => $data['target_id']])->exists()) {
            return response()->json(['message' => 'Bunu zaten şikayet ettin. İncelemeye alındı.'], 409);
        }

        Report::create($data + ['reporter_id' => $me]);

        return response()->json(['message' => 'Şikayetin alındı. İnceleyeceğiz, teşekkürler.'], 201);
    }

    public function block(Request $request, $id)
    {
        $me = (int) $request->user()->id;
        User::findOrFail($id);

        if ((int) $id === $me) {
            return response()->json(['message' => 'Kendini engelleyemezsin.'], 422);
        }

        UserBlock::firstOrCreate(['blocker_id' => $me, 'blocked_id' => (int) $id]);

        return response()->json(['message' => 'Kullanıcı engellendi.']);
    }

    // engellediğim kullanıcılar (Ayarlar > Engellenen Kullanıcılar)
    public function blocked(Request $request)
    {
        $rows = UserBlock::where('blocker_id', $request->user()->id)->with('blocked:id,name')->latest()->get();

        return response()->json(['data' => $rows->filter(fn ($b) => $b->blocked)->map(fn ($b) => ['id' => $b->blocked->id, 'name' => $b->blocked->name])->values()]);
    }

    public function unblock(Request $request, $id)
    {
        UserBlock::where(['blocker_id' => $request->user()->id, 'blocked_id' => (int) $id])->delete();

        return response()->json(['message' => 'Engel kaldırıldı.']);
    }
}
