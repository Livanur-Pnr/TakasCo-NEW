<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// askıya alınmış hesaplar mevcut tokenlarla bile API'yi kullanamaz
class NotSuspended
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->suspended_at) {
            return response()->json(['message' => 'Hesabın askıya alındı.'], 403);
        }

        return $next($request);
    }
}
