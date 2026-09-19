<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(Cache::remember('categories.all', 600, fn () => Category::all()->toArray()));
    }
}
