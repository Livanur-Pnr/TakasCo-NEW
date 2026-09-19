<?php
//admin kontrolü
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    //gelen isteği işleme
    public function handle(Request $request, Closure $next): Response
    {
        // is_admin modelde boolean'a cast edilir; sürücüye göre 1 / "1" / true gelse de doğru çalışır
        if (!$request->user() || !$request->user()->is_admin) {
            return response()->json(['message' => 'Yetkisiz erişim. Sadece adminler bu işlemi yapabilir.'], 403);
        }//adminse geçişe izin ver
        return $next($request);
    }
}
