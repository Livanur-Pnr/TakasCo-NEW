<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\SeoController;
use App\Http\Controllers\CaptchaController;
use Illuminate\Support\Facades\Route;

Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])->middleware(['signed', 'throttle:20,1'])->name('email.verify');
Route::get('/robots.txt', [SeoController::class, 'robots']);
Route::get('/sitemap.xml', [SeoController::class, 'sitemap']);
// mobil uygulamanın uygulama içi tarayıcıda açtığı "Ben robot değilim" sayfası
Route::get('/captcha', [CaptchaController::class, 'show'])->middleware('throttle:30,1');

Route::get('/', function () {
    return view('welcome');
});

Route::get('/dashboard', function () {
    return view('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Projenin web tabanlı giriş, kayıt, şifre sıfırlama rotalarını barındıran 'auth.php' dosyasını buraya dahil et (Enjekte et)
require __DIR__.'/auth.php';
