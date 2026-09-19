<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;

// Arama kutusu için otomatik tamamlama: yalnızca herkese açık, gerçek ilan/kategori/marka verisi
class SearchController extends Controller
{
    public function suggestions(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['products' => [], 'categories' => [], 'brands' => []]);
        }
        $q = mb_substr($q, 0, 60);
        $like = '%' . addcslashes($q, '%_\\') . '%';

        $products = Product::published()->where('title', 'like', $like)->latest()->limit(5)->get(['id', 'title']);
        $categories = Category::where('name', 'like', $like)->limit(3)->get(['id', 'name']);
        $brands = Product::published()->whereNotNull('brand')->where('brand', 'like', $like)->distinct()->orderBy('brand')->limit(3)->pluck('brand');

        return response()->json(['products' => $products, 'categories' => $categories, 'brands' => $brands]);
    }
}
