# TakasCo — Repository Audit

Tarih: 2026-09-19
Kapsam: `backend/` (Laravel 13, PHP 8.3+), `mobile/` (Expo 54 / React Native 0.81 / React Native Web, tek codebase — hem mobil hem web bu uygulamadan render ediliyor).

Bu doküman gerçek kod okunarak hazırlandı (README/eski dokümantasyon değil). Mimari karar netleşti: **ayrı bir Next.js uygulaması oluşturulmayacak** — mevcut Expo/RN/RN-Web tek codebase korunacak, web deneyimi bu mimari içinde `*.web.tsx` / responsive bileşenlerle güçlendirilecek.

## 1. Mimari

```
Laravel API (backend/, Sanctum Bearer token, SQLite dev)
        |
  Expo Router app (mobile/) — TEK codebase
        |            \
   React Native      React Native Web
   (iOS/Android)      (Platform.OS==='web')
```

- Auth: Sanctum **Bearer token** (SPA cookie modu değil). `mobile/utils/api.ts` her istekte `Authorization: Bearer <token>` ekliyor. Web tarafı da aynı token mekanizmasını kullanıyor (localStorage üzerinden, `utils/storage.ts` wrapper'ı ile) — bu iyi bir seçim, CSRF/cookie karmaşasından kaçınıyor.
- `backend/config/cors.php` **publish edilmemiş** → Laravel'in default CORS ayarı (`api/*` path'leri için tüm origin'lere açık) geçerli. Bearer-token modeli kullanıldığı için risk düşük, ama production'a çıkmadan önce origin whitelist'i publish edilip daraltılmalı (bkz. Güvenlik Bulguları #3).

## 2. Backend — Gerçek Durum

**Modeller:** `User`, `Product` (SoftDeletes), `Category`, `ProductImage`, `Favorite`, `Trade`.

**Controller'lar:** `ProductController`, `TradeController`, `AuthController`, `CategoryController`, `UserController`.

**Routes (`routes/api.php`):**
- Public: `GET /categories`, `GET /products` (sayfalı+filtreli+aranabilir), `GET /products/{id}` (benzer ürünlerle), `GET /users/{id}`, `GET /users/{id}/products`, `POST /register`, `POST /login`
- Auth gerekli (`auth:sanctum`): profil/adres/şifre güncelleme, ürün CRUD, favori toggle, `GET /my-products`, `GET /favorites`, trade `index/store/accept`
- Admin: `POST /products/{id}/approve` → `IsAdmin` middleware ile korunuyor (tek admin middleware, başka admin route yok)

**Product sistemi:** Sayfalama (`per_page` max 50), kategori/durum/şehir/arama filtreleri, sıralama (newest/oldest) bu oturumda eklendi ve çalışıyor. `withCount('favoritedBy')` ile favori sayısı geliyor. Ownership kontrolleri (`update`/`destroy`/`deleteImage`) `(int)` cast ile doğru yapılmış.

**Favorite sistemi:** `favorites` tablosunda **DB seviyesinde `unique(['user_id','product_id'])` zaten var** (migration'da doğrulandı) → çift favori DB seviyesinde zaten engelli. Ek işlem gerekmiyor.

**Trade sistemi — en kritik bulgu:**
- `status` düz bir `string` kolon (`beklemede` / `onaylandı` / `reddedildi`), default `beklemede`.
- `TradeController::accept()`:
  - **Race condition var**: iki farklı trade aynı ürünler için aynı anda accept edilirse, transaction/lock olmadığı için her ikisi de "başarılı" dönebilir, ürün durumu tutarsızlaşabilir.
  - **State transition kontrolü yok**: zaten `reddedildi` veya `onaylandı` olmuş bir trade tekrar accept edilebilir (mantıksız geçiş engellenmiyor).
  - Sequential update'ler (`$trade->update()`, iki `$product->update()`, sonra diğer trade'leri toplu reddetme) — hepsi ayrı ayrı sorgu, transaction içinde değil. Ortasında bir hata olursa DB tutarsız kalır.
  - `store()` içinde de aynı ürüne aynı kullanıcıdan tekrar tekrar teklif gönderilmesini engelleyen bir kontrol yok (duplicate pending trade).

**Image sistemi:** Intervention Image ile 800x800 `cover()`, tek boyut kaydediliyor (thumbnail/medium/large varyantı yok). `products/{id}/approve` dışında moderasyon yok.

**API response kalitesi:** Response'lar `response()->json(...)` ile döndürülüyor, API Resource/transformer kullanılmıyor — bu nedenle `Product`'ın `$with = ['images']` her yerde otomatik yükleniyor (bazı endpoint'lerde gereksiz payload büyütüyor, örn. `myProducts()`).

## 3. Mobile/Web — Gerçek Durum

- `mobile/hooks/use-is-desktop-web.ts` ile `Platform.OS==='web' && width>=900` responsive ayrımı zaten kurulu ve `(tabs)/index.tsx`, `(tabs)/search.tsx`, `web-storefront.tsx` içinde kullanılıyor.
- `mobile/utils/api.ts`: API host'u dev'de otomatik LAN IP'sinden çözüyor (Expo `hostUri`), hardcoded değil — iyi pratik. Ama `API_BASE_URL` production için env-var'a bağlı değil (`.env`/`app.config` üzerinden `EXPO_PUBLIC_API_URL` gibi bir değişken yok) — bu, production build alırken sorun çıkarır (bkz. Bulgular #7).
- `expo-secure-store`'un web karşılığı olmadığı için `utils/storage.ts` custom wrapper zaten yazılmış ve 8 dosyada kullanılıyor.
- Accessibility etiketleri (`accessibilityLabel/Role/State`) ikon-only butonlarda bu oturumda eklendi.

## 4. Güvenlik Bulguları (öncelik sırasıyla)

1. **[KRİTİK] Trade accept — race condition + geçersiz state transition** → Phase 1'de düzeltiliyor (DB transaction + row lock + state guard).
2. **[ORTA] Trade store — duplicate pending teklif engeli yok** → aynı kullanıcı aynı iki ürün için tekrar tekrar teklif oluşturabiliyor. Phase 1'de düzeltiliyor.
3. **[DÜŞÜK] CORS origin whitelist publish edilmemiş** → dev için sorun değil, production öncesi `php artisan config:publish cors` ile daraltılmalı. Şimdilik dokunmuyoruz (mevcut web erişimini bozma riski).
4. **[DÜŞÜK] `approve` dışında admin moderasyon endpoint'i yok** (ürün reddetme, kullanıcı yönetimi vb.) — Phase kapsamı dışına not düşülüyor (Phase "Admin" ileride ele alınacak).
5. **Password/hidden alanlar** zaten `#[Hidden(['password','remember_token'])]` ile korunuyor — sorun yok.
6. **PII (email/phone)** genel ürün listelerinde zaten `select` ile sınırlanmış (`user:id,name,city,district,profile_photo_path`) — sorun yok, bu oturumda düzeltilmişti.
7. **API_BASE_URL env-var'a bağlı değil** — production build'de düzeltilmesi gerekiyor, bu turda dokunulmuyor (mobile davranışını riske atmamak için ayrı, izole bir adım olarak planlanmalı).

## 5. Performans Bulguları

- `Product::$with = ['images']` her sorguda otomatik eager-load ediliyor — `myProducts()` ve `favorites()` endpoint'lerinde `category`/`images` ile beraber `user` bilgisi taşınmıyor olması aslında iyi (gereksiz büyümüyor).
- İndex sorgularında `category_id`, `status`, `city` üzerinde DB index'i yok (migration'larda `->index()` çağrısı yok) — veri büyüdükçe `WHERE` filtreleri yavaşlayacak. Düşük öncelik (dev veri hacminde sorun yaratmıyor), ama not düşüldü.
- Görsel tek boyutta (800x800) saklanıyor — grid'de küçük kart gösterirken tam boyut indiriliyor. Ayrı bir "Image sistemi" fazında ele alınmalı.

## 6. Bu Turda Yapılan (Phase 1 — Backend Security & Stability)

Aşağıdaki değişiklikler bu audit'in hemen ardından uygulandı:
- `TradeController::accept()` → `DB::transaction()` + `lockForUpdate()` ile race condition kapatıldı, geçersiz state transition (`beklemede` dışından accept) engellendi.
- `TradeController::store()` → aynı gönderen/alıcı/ürün çifti için zaten bekleyen bir teklif varsa engelleniyor.

## 7. Sıradaki Öneri

Mevcut mimariyi bozmadan devam edilecek gerçekçi sıradaki adımlar (kullanıcı onayı ile):
- Trade status'unu backward-compatible bir state-guard katmanıyla daha da sağlamlaştırmak (Phase 2)
- Loading/empty/error state metinlerinin ekran ekran gözden geçirilmesi (hızlı, yüksek görsel etki)
- Görsel varyantları (thumbnail/medium) — image performansı
- API Resource katmanı ile response payload'larını küçültme
