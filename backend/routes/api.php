<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\TradeController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\SafetyController;
use App\Http\Controllers\Api\SavedSearchController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Middleware\NotSuspended;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/cities', [ProductController::class, 'cities']);
Route::get('/search/suggestions', [\App\Http\Controllers\Api\SearchController::class, 'suggestions'])->middleware('throttle:60,1');
Route::get('/products/{id}', [ProductController::class, 'show']);

// bir ilanın sahibinin herkese açık profili ve diğer ilanları
Route::get('/users/{id}', [UserController::class, 'show']);
Route::get('/users/{id}/products', [UserController::class, 'products']);
Route::get('/users/{id}/reviews', [ReviewController::class, 'index']);

// kaba kuvvet (brute force) denemelerine karşı: IP başına dakikada en fazla 10 istek
Route::middleware('throttle:10,1')->controller(AuthController::class)->group(function () {
    Route::post('/register', 'register');
    Route::post('/login', 'login');
});
Route::post('/forgot-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'forgot'])->middleware('throttle:5,1');
Route::post('/reset-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'reset'])->middleware('throttle:10,1');


// WebSocket özel kanal yetkisi (Bearer token ile): POST /api/broadcasting/auth
Broadcast::routes(['middleware' => ['auth:sanctum', NotSuspended::class]]);

Route::middleware(['auth:sanctum', NotSuspended::class])->group(function () {
    Route::post('/user/profile', [AuthController::class, 'updateProfile']);
    Route::post('/user/password', [AuthController::class, 'updatePassword']);
    Route::post('/user/address', [AuthController::class, 'updateAddress']);
    Route::post('/user/preferences', [AuthController::class, 'updatePreferences']);
    Route::post('/user/onboarding', [AccountController::class, 'onboarding']);
    Route::post('/email/verification-notification', [\App\Http\Controllers\EmailVerificationController::class, 'resend'])->middleware('throttle:3,1');
    Route::delete('/products/images/{imageId}', [ProductController::class, 'deleteImage']);

    //// Aktif Kullanıcı Bilgisi Çekme Rotaları
    Route::get('/user', fn (Request $request) => $request->user());

    Route::controller(ProductController::class)->group(function () {
      
      
        Route::prefix('products')->group(function () {
            Route::post('/', 'store');
            Route::delete('/{id}', 'destroy');
            Route::put('/{id}', 'update');
            Route::post('/{id}/images', 'addImages');          
            Route::post('/{id}/favorite', 'toggleFavorite'); 
            
            // Admin Özel: Ürün Onaylama
            Route::middleware(\App\Http\Middleware\IsAdmin::class)
                ->post('/{id}/approve', 'approve');       // POST /products/{id}/approve
        });

        // Kullanıcıya Özel Ürün Listeleri
        Route::get('/user/products', 'myProducts');       // GET /user/products
        Route::get('/favorites', 'favorites');            // GET /favorites
    });

    
    // Yönetim paneli: yalnızca admin kullanıcılar (IsAdmin middleware, yetki backend'de doğrulanır)
    Route::middleware(\App\Http\Middleware\IsAdmin::class)->prefix('admin')->controller(AdminController::class)->group(function () {
        Route::get('/overview', 'overview');
        Route::get('/products', 'products');
        Route::post('/products/{id}/remove', 'removeProduct');
        Route::post('/products/{id}/restore', 'restoreProduct');
        Route::get('/users', 'users');
        Route::post('/users/{id}/suspend', 'suspendUser');
        Route::post('/users/{id}/unsuspend', 'unsuspendUser');
        Route::get('/reports', 'reports');
        Route::post('/reports/{id}/resolve', 'resolveReport');
    });

    Route::get('/recommendations', [\App\Http\Controllers\Api\RecommendationController::class, 'index']);
    Route::get('/matches', [\App\Http\Controllers\Api\MatchController::class, 'index']);
    Route::get('/saved-searches', [SavedSearchController::class, 'index']);
    Route::post('/saved-searches', [SavedSearchController::class, 'store']);
    Route::delete('/saved-searches/{id}', [SavedSearchController::class, 'destroy']);

    Route::post('/reports', [SafetyController::class, 'report'])->middleware('throttle:10,1');
    Route::get('/blocks', [SafetyController::class, 'blocked']);
    Route::post('/user/delete', [AccountController::class, 'destroy'])->middleware('throttle:5,1');
    Route::post('/users/{id}/block', [SafetyController::class, 'block']);
    Route::delete('/users/{id}/block', [SafetyController::class, 'unblock']);

    Route::controller(ConversationController::class)->prefix('conversations')->group(function () {
        Route::get('/', 'index');                                       // GET /conversations
        Route::get('/unread-count', 'unreadCount');                     // GET /conversations/unread-count
        Route::post('/', 'store');                                      // POST /conversations
        Route::get('/{id}/messages', 'messages');                       // GET /conversations/{id}/messages
        Route::post('/{id}/messages', 'send')->middleware('throttle:30,1'); // POST /conversations/{id}/messages (spam koruması)
    });

    Route::controller(NotificationController::class)->prefix('notifications')->group(function () {
        Route::get('/', 'index');                         // GET /notifications
        Route::post('/read-all', 'markAllAsRead');        // POST /notifications/read-all
        Route::post('/{id}/read', 'markAsRead');          // POST /notifications/{id}/read
    });

    Route::controller(TradeController::class)->prefix('trades')->group(function () {
        Route::get('/', 'index');                         // GET /trades
        Route::post('/', 'store');                        // POST /trades
        Route::post('/{id}/accept', 'accept');            // POST /trades/{id}/accept
        Route::post('/{id}/review', [ReviewController::class, 'store']); // POST /trades/{id}/review
        Route::post('/{id}/counter', 'counter');          // POST /trades/{id}/counter
        Route::post('/{id}/reject', 'reject');            // POST /trades/{id}/reject
        Route::post('/{id}/cancel', 'cancel');            // POST /trades/{id}/cancel
    });

});