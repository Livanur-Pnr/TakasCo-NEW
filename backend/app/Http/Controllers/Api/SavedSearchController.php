<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedSearch;
use Illuminate\Http\Request;

class SavedSearchController extends Controller
{
    private const LIMIT = 10;

    private function present(SavedSearch $s): array
    {
        return [
            'id' => $s->id, 'q' => $s->q, 'category_id' => $s->category_id, 'category_name' => $s->category?->name,
            'city' => $s->city, 'condition' => $s->condition, 'label' => $s->label(),
        ];
    }

    public function index(Request $request)
    {
        $items = SavedSearch::with('category')->where('user_id', $request->user()->id)->latest()->get();

        return response()->json(['data' => $items->map(fn ($s) => $this->present($s))]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'q' => 'nullable|string|max:100',
            'category_id' => 'nullable|integer|exists:categories,id',
            'city' => 'nullable|string|max:255',
            'condition' => 'nullable|in:Sıfır,Az Kullanılmış,Eskimiş',
        ]);
        $data = array_map(fn ($v) => is_string($v) ? (trim($v) ?: null) : $v, $data);

        if (!array_filter($data)) {
            return response()->json(['message' => 'Kaydetmek için en az bir arama ölçütü seçmelisin.'], 422);
        }

        $userId = $request->user()->id;
        $existing = SavedSearch::where('user_id', $userId)->where($data)->first();
        if ($existing) {
            return response()->json($this->present($existing->load('category')), 200);
        }
        if (SavedSearch::where('user_id', $userId)->count() >= self::LIMIT) {
            return response()->json(['message' => 'En fazla ' . self::LIMIT . ' arama kaydedebilirsin.'], 422);
        }

        $search = SavedSearch::create($data + ['user_id' => $userId]);

        return response()->json($this->present($search->load('category')), 201);
    }

    // yalnızca kendi kaydını silebilir (başkasınınki 404)
    public function destroy(Request $request, $id)
    {
        SavedSearch::where('user_id', $request->user()->id)->where('id', $id)->firstOrFail()->delete();

        return response()->json(['message' => 'Kayıtlı arama silindi.']);
    }
}
