<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SwapMatcher;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    // "Sana Uygun Takaslar": kullanıcının takasa açık ilanları için karşılıklı/tek yönlü eşleşen ilanlar
    public function index(Request $request)
    {
        return response()->json(['data' => SwapMatcher::forUser((int) $request->user()->id)]);
    }
}
