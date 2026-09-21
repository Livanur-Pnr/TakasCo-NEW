<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\SavedSearch;
use App\Models\User;
use App\Services\UserStats;
use Illuminate\Support\Facades\Cache;
use App\Notifications\SavedSearchMatchNotification;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use App\Services\ProductImageService;
use Illuminate\Support\Facades\DB;


class ProductController extends Controller
{
    //aktif tüm ilanları sayfalı, filtrelenebilir ve sıralanabilir şekilde listeleme
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 20), 50); // asiri buyuk sayfa istegi engellenir

        //1=aktif, 2=onaylı ürün tamamıyla gelir
        //user için sadece herkese açık gösterilecek alanlar seçilir (e-posta/telefon gibi gizli veriler dahil edilmez)
        $query = Product::published()
            ->with(['user:id,name,city,district,profile_photo_path', 'category', 'images'])
            ->withCount('favoritedBy');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('condition')) {
            $query->where('condition', $request->input('condition'));
        }

        if ($request->filled('city')) {
            $query->where('city', $request->input('city'));
        }

        if ($request->filled('listing_type')) {
            // 'takas' → takasa açık olanlar (takas + ikisi), 'satilik' → satışa açık olanlar (satilik + ikisi)
            $type = $request->input('listing_type');
            if ($type === 'takas') {
                $query->whereIn('listing_type', ['takas', 'ikisi']);
            } elseif ($type === 'satilik') {
                $query->whereIn('listing_type', ['satilik', 'ikisi']);
            }
        }
        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->input('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->input('max_price'));
        }
        if ($request->filled('brand')) {
            $query->where('brand', $request->input('brand'));
        }

        if ($request->filled('q')) {
            $search = $request->input('q');
            $query->where(function ($sub) use ($search) {
                $sub->where('title', 'like', "%{$search}%")
                    ->orWhere('swap_expectation', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sort = $request->input('sort', 'newest');
        match ($sort) {
            'oldest' => $query->oldest(),
            'price_asc' => $query->whereNotNull('price')->orderBy('price')->latest(),
            'price_desc' => $query->whereNotNull('price')->orderByDesc('price')->latest(),
            'popular' => $query->orderBy('favorited_by_count', 'desc')->latest(),
            default => $query->latest(),
        };

        $products = $query->paginate($perPage)->withQueryString();

        return response()->json($products);
    }
    // filtre kenar çubuğu için: yayındaki ilanlarda gerçekten bulunan şehirler
    public function cities()
    {
        $cities = \Illuminate\Support\Facades\Cache::remember('cities.active', 300, fn () => Product::published()
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
            ->all()); // düz dizi: veritabanı önbelleği nesne sınıflarını geri yüklemez

        return response()->json($cities);
    }

    //yeni ilan
    public function store(Request $request)
{
    try { //doğrulama
        $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|integer|exists:categories,id',
            'description' => 'required|string|max:5000',
            'condition' => 'required|in:Sıfır,Az Kullanılmış,Eskimiş', //ürün durumu
            'listing_type' => 'sometimes|in:satilik,takas,ikisi',
            'price' => 'required_if:listing_type,satilik,ikisi|nullable|numeric|min:1|max:10000000',
            'swap_expectation' => 'required_unless:listing_type,satilik|nullable|string|max:500',
            'brand' => 'nullable|string|max:100',
            'shipping_enabled' => 'sometimes|boolean',
            'meetup_enabled' => 'sometimes|boolean',
            'city' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
            'images' => 'required|array|min:1|max:8',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120', //resim max 5MB olmalı
        ], [ //hata alma
            'title.required' => 'Lütfen başlık girin.',
            'category_id.required' => 'Lütfen kategori seçin.',
            'category_id.exists' => 'Seçtiğiniz kategori geçerli değil.',
            'condition.in' => 'Ürün durumu geçerli değil.',
            'price.required_if' => 'Geçerli bir fiyat girin.',
            'price.numeric' => 'Geçerli bir fiyat girin.',
            'price.min' => 'Geçerli bir fiyat girin.',
            'swap_expectation.required_unless' => 'Takas beklentisini yazın.',
            'images.required' => 'Lütfen en az bir fotoğraf yükleyin.',
            'images.max' => 'En fazla 8 fotoğraf yükleyebilirsiniz.',
            'images.*.max' => 'Her fotoğraf en fazla 5 MB olabilir.',
            'images.*.image' => 'Yalnızca görsel dosyaları yükleyebilirsiniz.',
        ]);

        $paths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $paths[] = ProductImageService::store($file);
            }
        }

        // 1. ürünü bilgisi kaydetme
        $product = Product::create([
            'user_id' => $request->user()->id,
            'category_id' => $request->category_id,
            'title' => $request->title,
            'description' => $request->description,
            'condition' => $request->condition,
            'swap_expectation' => $request->swap_expectation ?? '', // yalnızca satılık ilanda boş kalabilir
            'listing_type' => $request->input('listing_type', 'takas'),
            'price' => $request->input('listing_type', 'takas') === 'takas' ? null : $request->price,
            'brand' => $request->brand,
            'shipping_enabled' => $request->boolean('shipping_enabled'),
            'meetup_enabled' => $request->boolean('meetup_enabled', true),
            'city' => $request->city ?? $request->user()->city,
            'district' => $request->district ?? $request->user()->district,
            'status' => 1, //ilan durumu aktif
            'expires_at' => now()->addDays(Product::LISTING_DAYS),
            'image_path' => $paths[0], // products.image_path NOT NULL olduğu için kapak resmi burada da tutulur
        ]);

        // 2. resimleri product_images a kaydet 
        if (count($paths) > 0) {
            foreach ($paths as $index => $path) {
                $product->images()->create([
                    'image_path' => $path,
                    'is_primary' => ($index === 0), // ilk resim otomatik kapak olur
                    'sort_order' => $index
                ]);
            }
        }

        $this->notifySavedSearchMatches($product);

        return response()->json([
            'message' => 'İlanınız başarıyla oluşturuldu!',
            'product' => $product->load('images') // Yeni resimlerle beraber döndür
        ], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json(['errors' => $e->errors()], 422);//doğrulama
    } catch (\Exception $e) {
        report($e); // ayrıntı sadece sunucu logunda kalır, istemciye sızmaz
        return response()->json(['message' => 'İlan oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.'], 500);
    }
}
    // kayıtlı aramaya uyan kullanıcılara (ilan sahibi hariç) kişi başı en fazla bir bildirim; hata ilan oluşturmayı bozmaz
    private function notifySavedSearchMatches(Product $product): void
    {
        try {
            SavedSearch::with('category')->where('user_id', '!=', $product->user_id)->get()
                ->filter(fn ($s) => $s->matches($product))
                ->unique('user_id')
                ->each(function ($s) use ($product) {
                    User::find($s->user_id)?->notify(new SavedSearchMatchNotification($product, $s));
                });
        } catch (\Throwable $e) {
            report($e);
        }
    }

    // Görüntülenme: ilan sahibi sayılmaz; aynı ziyaretçi (giriş yapmışsa kullanıcı, değilse IP) 30 dakikada bir kez sayılır.
    private function countView(Product $product): void
    {
        $viewer = auth('sanctum')->user();
        if ($viewer && (int) $viewer->id === (int) $product->user_id) {
            return;
        }
        $who = $viewer ? 'u' . $viewer->id : 'ip' . request()->ip();
        if (Cache::add("product-view:{$product->id}:{$who}", 1, now()->addMinutes(30))) {
            Product::whereKey($product->id)->increment('views');
            $product->views = (int) $product->views + 1;
        }
    }

    // rezerve et / rezerveyi kaldır: rezerve ilan görünür kalır ama yeni takas teklifi alamaz
    public function reserve(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        if ((int) $product->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Bu ilanı güncelleme yetkiniz bulunmamaktadır.'], 403);
        }
        if (in_array((int) $product->status, [3, AdminController::STATUS_REMOVED], true)) {
            return response()->json(['message' => 'Bu ilan artık rezerve edilemez.'], 409);
        }

        $reserve = (int) $product->status !== Product::STATUS_RESERVED;
        $product->update(['status' => $reserve ? Product::STATUS_RESERVED : 1]);

        return response()->json(['message' => $reserve ? 'İlan rezerve edildi.' : 'İlan yeniden aktif.', 'status' => (int) $product->status]);
    }

    // ilanın yayın süresini bugünden itibaren yeniden başlatır (süresi dolmuş ilan için de)
    public function renew(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        if ((int) $product->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Bu ilanı güncelleme yetkiniz bulunmamaktadır.'], 403);
        }
        if (in_array((int) $product->status, [3, AdminController::STATUS_REMOVED], true)) {
            return response()->json(['message' => 'Bu ilan yenilenemez.'], 409);
        }

        $product->update(['expires_at' => now()->addDays(Product::LISTING_DAYS)]);

        return response()->json(['message' => 'İlanın yayın süresi yenilendi.', 'expires_at' => $product->expires_at]);
    }

    //admin onayı
    public function approve($id)
    {
        $product = Product::findOrFail($id);
        $product->update(['status' => 1]);
        return response()->json(['message' => 'İlan onaylandı.']);
    }

    public function show($id)
    {
        // seller trust card için created_at da eklendi (üyelik tarihi) — başka hiçbir gizli alan yok
        $product = Product::with(['user:id,name,city,district,profile_photo_path,created_at', 'category', 'images'])
            ->withCount('favoritedBy')
            ->findOrFail($id);

        // moderasyonla kaldırılmış veya sahibi askıdaki ilanı yalnızca sahibi ve adminler görebilir (route herkese açık olduğundan token elle çözülür)
        $ownerSuspended = User::whereKey($product->user_id)->whereNotNull('suspended_at')->exists();
        if ((int) $product->status === AdminController::STATUS_REMOVED || $ownerSuspended || $product->is_expired) {
            $viewer = auth('sanctum')->user();
            $allowed = $viewer && ($viewer->is_admin || (int) $viewer->id === (int) $product->user_id);
            abort_unless($allowed, 404);
        }

        $this->countView($product);

        // satıcının gerçek, canlı ilan sayısı ve güven göstergeleri (sahte/mock istatistik değil)
        if ($product->user) {
            $product->user->setAttribute('stats', UserStats::for($product->user->id, $product->user->created_at));
            $product->user->loadCount(['products' => function ($query) {
                $query->whereIn('status', [1, 2, Product::STATUS_RESERVED])->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
            }]);
        }

        // Dolap'taki "Benzer ürünler" gibi: aynı kategoriden, bu ürün hariç, en yeni 8 ilan
        $similar = Product::published()
            ->where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->with(['images'])
            ->withCount('favoritedBy')
            ->latest()
            ->limit(8)
            ->get();

        // aynı satıcının bu ürün dışındaki yayındaki ilanları
        $sellerProducts = Product::published()
            ->where('user_id', $product->user_id)
            ->where('id', '!=', $product->id)
            ->with(['images'])
            ->withCount('favoritedBy')
            ->latest()
            ->limit(6)
            ->get();

        $data = $product->toArray();
        $data['similar_products'] = $similar;
        $data['seller_products'] = $sellerProducts;

        return response()->json($data);
    }

    //kendi ilanlarını listele
    public function myProducts(Request $request)
    {
        // normal kullanımda bir kullanıcının birkaç yüz ilanı olmaz; sınırsız büyümeye karşı güvenlik sınırı
        $products = Product::where('user_id', $request->user()->id)->with('category')->latest()->limit(300)->get();
        return response()->json($products);
    }

    
    //favorilere ekleme veya çıkarma
    public function toggleFavorite(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $user = $request->user();

        //daha once eklenmis mi kontrol
        $exists = \Illuminate\Support\Facades\DB::table('favorites')
            ->where('user_id', $user->id)
            ->where('product_id', $product->id)
            ->first();

        if ($exists) { //favoriden cikarma
            \Illuminate\Support\Facades\DB::table('favorites')
                ->where('user_id', $user->id)
                ->where('product_id', $product->id)
                ->delete();
            return response()->json(['message' => 'Favorilerden çıkarıldı', 'is_favorite' => false]);
        } else {//ekleme
            \Illuminate\Support\Facades\DB::table('favorites')->insert([
                'user_id' => $user->id,
                'product_id' => $product->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            return response()->json(['message' => 'Favorilere eklendi', 'is_favorite' => true]);
        }
    }

    public function favorites(Request $request)
    {
        $favoriteProductIds = \Illuminate\Support\Facades\DB::table('favorites')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(300) // sınırsız büyümeye karşı güvenlik sınırı
            ->pluck('product_id');

        $products = Product::whereIn('id', $favoriteProductIds)->with('category')->get();
        return response()->json($products);
    }
    
    public function destroy(Request $request, $id)
    {
        try {
            // Ürünü bul, yoksa otomatik 404 döner
            $product = Product::findOrFail($id);
    
            //  giriş yapan kullanıcı ile ürün sahibi aynı mı ona dikkat et
            // $request->user()->id kullanmak Sanctum üzerinden gelen güvenli ID'yi verir.
            if ($product->user_id != $request->user()->id) {
                return response()->json(['message' => 'Bu ilanı silme yetkiniz bulunmamaktadır.'], 403);
            }
    
            $product->delete();
            return response()->json(['message' => 'İlan başarıyla silindi.'], 200);
    
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'İlan bulunamadı.'], 404);
        } catch (\Exception $e) {
            report($e);
            return response()->json(['message' => 'İlan silinirken bir hata oluştu. Lütfen tekrar deneyin.'], 500);
        }
    }

    //mevcut ilan güncelleme
    public function update(Request $request, $id)
    {
        try {
            // ürünü ve mevcut resimlerini bul
            $product = Product::with('images')->findOrFail($id);
    
            // erişim kontrolü
            if ($product->user_id != $request->user()->id) {
                return response()->json(['message' => 'Bu ilanı güncelleme yetkiniz bulunmamaktadır.'], 403);
            }
    
            // takaslanmış veya moderasyonla kaldırılmış ilan düzenlenemez
            if (in_array((int) $product->status, [3, AdminController::STATUS_REMOVED], true)) {
                return response()->json(['message' => 'Bu ilan artık düzenlenemez.'], 409);
            }

            $request->validate([
                'category_id' => 'sometimes|exists:categories,id',
                'title' => 'sometimes|string|max:255',
                'description' => 'sometimes|string|max:5000',
                'condition' => 'sometimes|in:Sıfır,Az Kullanılmış,Eskimiş',
                'swap_expectation' => 'sometimes|nullable|string|max:500',
                'listing_type' => 'sometimes|in:satilik,takas,ikisi',
                'price' => 'sometimes|nullable|numeric|min:1|max:10000000',
                'brand' => 'sometimes|nullable|string|max:100',
                'shipping_enabled' => 'sometimes|boolean',
                'meetup_enabled' => 'sometimes|boolean',
                'city' => 'sometimes|nullable|string|max:255',
                'district' => 'sometimes|nullable|string|max:255',
                'images' => 'sometimes|array|min:1|max:8',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);

            //  metin alanlarını güncelle
            // tür/fiyat/takas beklentisi tutarlılığı: nihai değerler üzerinden doğrulanır
            $type = $request->input('listing_type', $product->listing_type);
            $price = $request->exists('price') ? $request->input('price') : $product->price;
            $swap = $request->exists('swap_expectation') ? $request->input('swap_expectation') : $product->swap_expectation;
            if ($type !== 'takas' && !$price) {
                throw \Illuminate\Validation\ValidationException::withMessages(['price' => ['Geçerli bir fiyat girin.']]);
            }
            if ($type !== 'satilik' && !trim((string) $swap)) {
                throw \Illuminate\Validation\ValidationException::withMessages(['swap_expectation' => ['Takas beklentisini yazın.']]);
            }

            $product->update(array_merge(
                $request->only(['category_id', 'title', 'description', 'city', 'district', 'condition', 'brand']),
                [
                    'listing_type' => $type,
                    'price' => $type === 'takas' ? null : $price,
                    'swap_expectation' => $swap ?? '',
                ],
                $request->has('shipping_enabled') ? ['shipping_enabled' => $request->boolean('shipping_enabled')] : [],
                $request->has('meetup_enabled') ? ['meetup_enabled' => $request->boolean('meetup_enabled')] : [],
            ));
    
            // fotoğraf yönetimi (Gerçek Dosya Yükleme ve Yerel Kayıt)
            if ($request->hasFile('images')) {
                
                // eski dosyayı fiziksel olarak silme (Sunucu temizliği için kritik!)
                foreach ($product->images as $oldImage) {
                    ProductImageService::delete($oldImage->image_path);
                }
                
                // veritabanındaki eski resim kayıtlarını temizle
                $product->images()->delete();
    
                // yeni dosyaları işleme ve kaydetme 
                foreach ($request->file('images') as $index => $file) {
                    $dbPath = ProductImageService::store($file);
                    $product->images()->create([
                        'image_path' => $dbPath,
                        'is_primary' => ($index === 0),
                        'sort_order' => $index,
                    ]);
                    if ($index === 0) {
                        $product->update(['image_path' => $dbPath]);
                    }
                }
            }
    
            return response()->json([
                'message' => 'İlan ve fotoğraflar başarıyla güncellendi!',
                'product' => $product->load('images') // Güncel resimlerle birlikte geri döndür
            ], 200);
    
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'İlan bulunamadı.'], 404);
        } catch (\Exception $e) {
            report($e);
            return response()->json(['message' => 'İlan güncellenirken bir hata oluştu. Lütfen tekrar deneyin.'], 500);
        }
    }
    // mevcut ilana fotoğraf ekler (toplam en fazla 8)
    public function addImages(Request $request, $id)
    {
        $product = Product::with('images')->findOrFail($id);

        if ((int) $product->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Bu ilanı güncelleme yetkiniz bulunmamaktadır.'], 403);
        }

        $request->validate([
            'images' => 'required|array|min:1',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $existing = $product->images->count();
        if ($existing + count($request->file('images')) > 8) {
            return response()->json(['message' => 'Bir ilanda en fazla 8 fotoğraf olabilir.'], 422);
        }

        foreach ($request->file('images') as $i => $file) {
            $product->images()->create([
                'image_path' => ProductImageService::store($file),
                'is_primary' => $existing === 0 && $i === 0,
                'sort_order' => $existing + $i,
            ]);
        }

        return response()->json(['message' => 'Fotoğraflar eklendi.', 'images' => $product->images()->get()], 201);
    }

    // fotoğraf sırasını değiştirir: gövdedeki `ids`, ilanın tüm fotoğraf id'lerinin (tam olarak) yeni sıralamasıdır; ilki kapak olur
    public function reorderImages(Request $request, $id)
    {
        $product = Product::with('images')->findOrFail($id);

        if ((int) $product->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Bu ilanı güncelleme yetkiniz bulunmamaktadır.'], 403);
        }

        $data = $request->validate(['ids' => 'required|array|min:1|max:8', 'ids.*' => 'integer|distinct']);
        $existing = $product->images->pluck('id')->map(fn ($i) => (int) $i)->sort()->values()->all();
        $requested = collect($data['ids'])->map(fn ($i) => (int) $i);

        if ($requested->sort()->values()->all() !== $existing) {
            return response()->json(['message' => 'Sıralama, ilanın tüm fotoğraflarını içermelidir.'], 422);
        }

        DB::transaction(function () use ($product, $requested) {
            foreach ($requested->values() as $position => $imageId) {
                ProductImage::where('id', $imageId)->update(['sort_order' => $position, 'is_primary' => $position === 0]);
            }
            $cover = ProductImage::find($requested->first());
            $product->update(['image_path' => $cover->getRawOriginal('image_path')]);
        });

        return response()->json(['message' => 'Fotoğraf sırası güncellendi.', 'images' => $product->images()->orderBy('sort_order')->get()]);
    }

    public function deleteImage(Request $request, $imageId)
    {
        try {
            $image = ProductImage::findOrFail($imageId);
            $product = $image->product; // Resmin bağlı olduğu ürünü bul

            // sadece ürün sahibi resmini silebilir
            if ((int) $product->user_id !== (int) $request->user()->id) {
                return response()->json(['message' => 'Bu resmi silme yetkiniz yok.'], 403);
            }

            // ilan en az bir fotoğrafla kalmalı
            if ($product->images()->count() <= 1) {
                return response()->json(['message' => 'İlanın en az bir fotoğrafı olmalı.'], 409);
            }

            // fiziksel dosyayı storagedan sil
            ProductImageService::delete($image->image_path);

            $wasPrimary = (bool) $image->is_primary;
            $image->delete();

            // kapak silindiyse sıradaki fotoğraf kapak olur
            if ($wasPrimary) {
                $next = $product->images()->orderBy('sort_order')->orderBy('id')->first();
                $next->update(['is_primary' => true]);
                $product->update(['image_path' => $next->image_path]);
            }

            return response()->json(['message' => 'Resim başarıyla imha edildi.']);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Resim bulunamadı.'], 404);
        } catch (\Exception $e) {
            report($e);
            return response()->json(['message' => 'Resim silinemedi. Lütfen tekrar deneyin.'], 500);
        }
    }
    }



