# TakasCo — İlerleme Durumu

Bu dosya gerçek, doğrulanmış ilerlemeyi takip eder. Sahte "tamamlandı" işaretleri konulmaz — bir madde ancak kod yazılmış, çalıştırılmış ve test edilmişse işaretlenir.

> **Güncel durum notu:** Bu dosya kronolojik bir günlüktür; eski maddeler sonraki adımlarla geçersiz kalmış olabilir. Örn. `Alert` çözümü artık `window.alert/confirm` değil uygulama içi toast/onay diyaloğudur; `API_BASE_URL` env desteği (`EXPO_PUBLIC_API_URL`) eklenmiştir; Breeze testleri artık geçmektedir (Vite testte devre dışı). Güncel yapı için bkz. `README.md` ve `TAKASCO_ARCHITECTURE.md`; kalan işler için `TAKASCO_TODO.md`.

Mimari karar: **ayrı Next.js uygulaması yok.** Mevcut Expo/React Native + React Native Web tek codebase korunuyor, web deneyimi bu mimari içinde geliştiriliyor.

## PHASE 0 — Repository Audit
- [x] Tamamlandı. Bkz. [`TAKASCO_AUDIT.md`](./TAKASCO_AUDIT.md).

## PHASE 1 — Backend Security & Stability
- [x] **Trade concurrency protection (CRITICAL)** — `TradeController::accept()` artık `DB::transaction()` + `lockForUpdate()` (trade + her iki ürün satırı kilitleniyor) kullanıyor. Aynı trade'e art arda/eşzamanlı iki accept isteği geldiğinde ikincisi state guard tarafından `409` ile reddediliyor.
- [x] **Geçersiz state transition engeli** — sadece `status === 'beklemede'` olan bir trade accept edilebiliyor; `onaylandı`/`reddedildi` bir trade tekrar accept edilemez.
- [x] **Duplicate pending trade engeli** — aynı gönderen aynı ürün çifti için art arda birden fazla bekleyen teklif oluşturamıyor (`409`).
- [x] **Takaslanmış ürün için teklif engeli** — `status=3` (Takaslandı) bir ürüne yeni teklif oluşturulamıyor.
- [x] Favorite integrity — zaten DB seviyesinde `unique(user_id, product_id)` mevcuttu, doğrulandı, ek işlem gerekmedi.
- [x] Product/Trade authorization (ownership) — zaten doğru uygulanmıştı (`(int)` cast'lerle), doğrulandı.
- [x] PII / hidden alanlar — zaten korunuyordu (`#[Hidden]`, scoped `select`), doğrulandı.
- [x] Test coverage — `backend/tests/Feature/TradeSecurityTest.php` (5 test, 14 assertion, hepsi geçiyor): accept başarı akışı, yetkisiz accept, tekrar accept engeli, rakip tekliflerin otomatik reddi, duplicate teklif engeli.
- [x] Regresyon kontrolü — tam test suite çalıştırıldı: yeni testler dahil 23 test geçiyor. 7 test başarısız ama bunlar **önceden var olan, bu değişiklikle ilgisiz** Laravel Breeze scaffolding testleri (`ProfileTest`, `Auth/*` — "screen can be rendered" testleri, `public/build/manifest.json` (Vite) hiç build edilmediği için başarısız oluyorlar; bu backend API-only kullanılıyor, Breeze blade view'ları hiç kullanılmıyor). Trade/Product ile ilgili hiçbir test bozulmadı.
- [ ] CORS whitelist daraltma — dev ortamında sorun değil, production öncesi ayrı bir adım olarak ele alınmalı (mevcut web erişimini riske atmamak için bu turda dokunulmadı).
- [ ] `API_BASE_URL` env-var discipline (mobile) — production build için ayrı, izole bir adım gerektiriyor.

## PHASE 2 — Trade State Consistency & Trade UX
- [x] **`App\Enums\TradeStatus`** eklendi (backward-compatible: DB'de hâlâ aynı Türkçe string'ler saklanıyor, `Trade` modelinde native enum cast var; JSON çıktısı doğrulandı — `{"status":"beklemede"}` şeklinde, mobil/web client'ta hiçbir değişiklik gerekmedi).
- [x] `TradeController` tüm state karşılaştırmaları enum üzerinden yapıyor artık (magic string yok).
- [x] **Eksik fonksiyonellik tamamlandı: `reject()` ve `cancel()` endpoint'leri.** Daha önce sadece `accept` vardı — alıcının bir teklifi reddetmesinin veya gönderenin kendi teklifini geri çekmesinin hiçbir yolu yoktu. Artık `POST /trades/{id}/reject` (sadece alıcı, sadece `beklemede`) ve `POST /trades/{id}/cancel` (sadece gönderen, sadece `beklemede`) var — ikisi de `DB::transaction()+lockForUpdate()` ile aynı race-condition korumasına sahip.
- [x] Mobile: `offers.tsx`'e "Reddet" (gelen teklifler) ve "Teklifi İptal Et" (giden teklifler) butonları eklendi, yeni `iptal edildi` durumu için rozet rengi eklendi.
- [x] Test coverage: `TradeSecurityTest.php` 10 teste çıkarıldı (26 assertion), hepsi geçiyor.

## PHASE 2.5 — Kritik web uyumluluk hatası bulundu ve düzeltildi (kapsam dışı ama zorunlu)
Reddet butonunu tarayıcıda test ederken **`react-native-web`'in `Alert.alert()` fonksiyonunun tamamen no-op olduğu** ortaya çıktı (`node_modules/react-native-web/dist/exports/Alert/index.js`: `static alert() {}`). Bu, projedeki **36 `Alert.alert` çağrısının, 9 dosyanın tamamında**, web'de sessizce hiçbir şey yapmadığı anlamına geliyordu — hem onay diyalogları (İlanı Sil, Teklifi Reddet/İptal) hem de bilgilendirme mesajları (Profil güncellendi, Teklif gönderildi, hata mesajları vb.) web'de tamamen çalışmıyordu, buton tıklanıyor ama hiçbir şey olmuyordu.
- [x] `mobile/utils/alert.ts` oluşturuldu: `Alert.alert(title, message, buttons)` ile birebir aynı imzayı koruyan bir drop-in modül. Native'de gerçek `Alert.alert`'e devrediyor, web'de `window.confirm`/`window.alert` ile aynı davranışı üretiyor.
- [x] Etkilenen 9 dosyanın tamamında import değiştirildi (`react-native`'den değil `@/utils/alert`'ten): `offers.tsx`, `product/[id].tsx` (İlanı Sil), `product/[id]/offer.tsx`, `(tabs)/add.tsx`, `(auth)/login.tsx`, `(auth)/register.tsx`, `(settings)/address.tsx`, `(settings)/change-password.tsx`, `(settings)/profile-settings.tsx`.
- [x] `npx tsc --noEmit` temiz (tek kalan hata önceden var olan, ilgisiz `collapsible.tsx` dark-theme hatası).
- [x] Canlı doğrulama: tarayıcıda "Reddet"e tıklandığında artık doğru başlık/mesajla `window.confirm()` tetikleniyor (otomasyon ortamı native dialog'ları bastırdığı için "confirm() returned false" logu görüldü — bu otomasyon ortamının kısıtı, kod hatası değil). "Kabul Et" (confirm gerektirmeyen buton) uçtan uca test edildi: `POST /trades/1/accept → 200`, UI "ONAYLANDI" rozetine güncellendi, her iki ürünün `status`'u backend'de gerçekten `3`'e (Takaslandı) döndü.

## PHASE 3 — API Quality & Performans Temeli
- [x] **DB index'leri** eklendi (yeni, tamamen additive migration — hiçbir veri değişmedi): `products(status, category_id)` composite, `products(city)`, `trades(status)`. `GET /products` filtreleri (kategori/durum/şehir) ve trade'lerin "beklemede" sorguları artık index kullanıyor. SQLite'ta index'lerin gerçekten oluştuğu doğrulandı.
- [x] **Ölü route temizlendi**: `GET /my-products` (routes/api.php'de kullanılmayan bir closure route — mobil hiçbir yerde çağırmıyordu, doğrulandı) kaldırıldı. Gerçek kullanılan `/user/products` (ProductController::myProducts) dokunulmadan kaldı.
- [x] **Sınırsız büyümeye karşı güvenlik limitleri**: `myProducts()`, `favorites()`, `UserController::products()` — hiçbiri sayfalı değildi (mobil client düz array bekliyor, response şeklini değiştirmeden kırılmaz bir önlem olarak `->limit(300)` eklendi). Gerçek sayfalama gerektiren bir ihtiyaç ortaya çıkarsa (kullanıcı 300+ ilan/favoriye ulaşırsa) ayrı bir fazda response şekli mobil ile birlikte güncellenmeli.
- [x] Regresyon kontrolü: tam test suite (28/28 ilgili test geçiyor), canlı sunucuda `/user/products`, `/favorites`, `/users/{id}/products`, `/products` filtreleri ve kaldırılan `/my-products` (artık doğru şekilde 404) curl ile doğrulandı.

## PHASE 16 — Loading / Empty / Error States
Audit'te not edilen "hata durumları boş durum gibi görünüyor" sorunu ele alındı.
- [x] Yeni paylaşımlı **`components/ui/error-state.tsx`** — ikon + Türkçe mesaj + "Tekrar Dene" butonu.
- [x] Şu ekranlara **gerçek bir `error` state** eklendi (önceden network/sunucu hatası sessizce "sonuç yok" empty state'iyle karışıyordu, kullanıcı gerçek sebebi hiç göremiyordu): `(tabs)/index.tsx` (Ana Sayfa), `(tabs)/search.tsx` (Keşfet), `(tabs)/offers.tsx` (Tekliflerim), `(activity)/favorites.tsx`, `(activity)/my-listings.tsx`.
- [x] `search.tsx`'te boş sonuç mesajı zenginleştirildi: "Sonuç bulunamadı." → "Aramana uygun bir ilan bulamadık."
- [x] **Prodüksiyon temizliği**: `my-listings.tsx`'teki unutulmuş debug `console.log` satırları (`console.log("bu ekran")`, `console.log("ashdjhasdsad", ...)`) kaldırıldı.
- [x] `npx tsc --noEmit` temiz, canlı tarayıcıda favorites/my-listings ekranları gerçek veriyle doğrulandı (my-listings artık "Takaslandı" rozetini de doğru gösteriyor, konsol debug çıktısı yok).
- Not: `product/[id].tsx`'in mevcut "ürün bulunamadı → uyar + geri dön" akışı zaten yeterliydi, dokunulmadı (artık `Alert` düzeltmesi sayesinde web'de de doğru çalışıyor).

## PHASE 11 — Ürün Detay Sayfası (masaüstü web premium redesign)
Kullanıcının "öğrenci projesi gibi görünmesin, profesyonel bir web app olsun" talebi üzerine en çok "gerilmiş mobil uygulama" hissi veren ekran ele alındı: `product/[id].tsx`.
- [x] `useIsDesktopWeb()` ile tamamen ayrı bir masaüstü dalı eklendi (mevcut mobil JSX'e hiç dokunulmadı — `isDesktopWeb` false'sa eski kod aynen çalışıyor).
- [x] **İki kolonlu düzen** (max-width 1200px, ortalanmış): sol tarafta büyük ana görsel + tıklanabilir küçük resim (thumbnail) şeridi, sağ tarafta kategori/başlık/durum-konum chip'leri/favori sayısı/takas beklentisi kutusu/CTA/satıcı güven kartı.
- [x] **Satıcı güven kartı gerçek veriyle**: isim, şehir, "Eylül 2026'dan beri üye" (backend'den `user.created_at` eklendi), "4 aktif ilan" (backend'den `user.products_count` — gerçek, canlı sorgu; sahte istatistik değil). Backend: `ProductController::show()`'a `created_at` select'e eklendi + `loadCount(['products' => whereIn(status,[1,2])])`.
- [x] **"Benzer İlanlar" grid'i** artık gerçekten render ediliyor (backend zaten `similar_products` döndürüyordu, önceden hiç kullanılmıyordu) — resim, favori rozeti (tıklanabilir), başlık, takas beklentisi ile kart grid'i.
- [x] Tam ekran görsel galerisi modalı (`imageModal`) tek yerde tanımlanıp hem masaüstü hem mobil dalında paylaşıldı (kod tekrarı yok).
- [x] `npx tsc --noEmit` temiz, `php artisan test` regresyonsuz (28/28).
- [x] **Canlı doğrulama** (1440×900): sahibi olunan ürün → sil/favori ikonları + CTA yok; başkasının ürünü → "Bu Ürün İçin Takas Teklifi Gönder" CTA var ve `/product/{id}/offer`'a doğru yönlendiriyor; "Benzer İlanlar" gerçek verilerle render oluyor. **Mobil (375px) görünüm bire bir korunmuş** — regresyon yok, ayrıca doğrulandı.

## PHASE 9 — Discover/Search: masaüstü sidebar filtre paneli
`search.tsx` masaüstünde artık gerçek bir marketplace deneyimi: sol sabit sidebar (Kategori + Ürün Durumu, radyo-görünümlü, URL/state senkronize), sağda "Sırala" pill'leri (En Yeni / En Çok Favorilenen / En Eski) + ürün ızgarası.
- [x] Backend: `ProductController::index()`'e **`sort=popular`** eklendi (`favorited_by_count` DESC) — gerçek, sahte olmayan bir sıralama; canlı curl ile doğru sırayla döndüğü doğrulandı.
- [x] Sidebar: kategori listesi `/categories`'ten çekiliyor, "Tümü" + her kategori radyo seçenek; Ürün Durumu aynı desenle; "Temizle" (aktif filtre varsa görünür) tüm filtreleri (kategori/durum/sıralama) tek tıkla sıfırlıyor.
- [x] Kod tekrarını önlemek için ürün kartı (`renderProductItem`) ve boş/hata durumu (`emptyOrErrorState`) tek yerde tanımlanıp hem masaüstü hem mobil `FlatList`'inde paylaşıldı.
- [x] Masaüstü ızgara sütun sayısı artık sidebar genişliği (~260px) düşülerek hesaplanıyor (`gridWidth = width - 260`), böylece kartlar sıkışmıyor.
- [x] Mobil dal artık her zaman `isDesktopWeb === false` olduğundan gereksiz `isDesktopWeb &&` / `!isDesktopWeb &&` dallanmaları temizlendi (ölü kod bırakılmadı).
- [x] `npx tsc --noEmit` temiz, `php artisan test` regresyonsuz (28/28).
- [x] **Canlı doğrulama** (1440×900): "Elektronik" kategorisine tıklanınca grid anında filtreleniyor, başlık "Elektronik" oluyor, "Temizle" çıkıyor; "En Çok Favorilenen" sıralaması favori sayısı en yüksek ürünü (AirPods Pro) doğru şekilde başa alıyor; "Temizle" tüm filtreleri sıfırlıyor. **Mobil (375px) görünüm bire bir korunmuş**, ayrıca doğrulandı.

## PHASE 14 — Profil sayfası (masaüstü web dashboard redesign)
Önceden masaüstünde de mobildeki gibi dar, tek sütun bir menü listesiydi ("gerilmiş mobil uygulama" hissi). Artık gerçek bir hesap paneli:
- [x] **Sol**: profil kartı (avatar, isim, şehir, "Eylül 2026'dan beri üye" — `user.created_at`'ten), "Profili Düzenle" butonu + altında hesap navigasyon kartı (Profil Ayarlarım/İlanlarım/Takaslarım/Favorilerim/Ayarlar/Çıkış Yap).
- [x] **Sağ**: "Hesabım" başlığı altında **3 gerçek, canlı istatistik kartı** — Aktif İlan (`/user/products` sayısı), Favori (`/favorites` sayısı), Tamamlanan Takas (`/trades`'ten `status==='onaylandı'` filtrelenmiş sayı, `my-trades.tsx`'teki mevcut mantıkla birebir aynı). **Sahte/mock istatistik yok** — her sayı gerçek API çağrısıyla hesaplanıyor. Kartlara tıklamak ilgili sayfaya götürüyor.
- [x] Bu ek istatistik çağrıları (`Promise.all` ile 3 paralel istek) sadece `isDesktopWeb` true iken tetikleniyor — mobil davranış ve ağ trafiği hiç değişmedi.
- [x] `npx tsc --noEmit` temiz (route tip hatası `href: any` ile düzeltildi), `php artisan test` regresyonsuz (28/28).
- [x] **Canlı doğrulama** (1440×900): "Ahmet Teknoloji · İzmir · Eylül 2026'dan beri üye", gerçek sayılarla "5 Aktif İlan / 1 Favori / 1 Tamamlanan Takas" doğru render oluyor; stat kartına tıklamak `/my-listings`'e doğru yönlendiriyor. **Mobil (375px) görünüm bire bir korunmuş.**

## PHASE 7 — Header/Navigasyon cilası
Kullanıcı sordu: "ana sayfa header navigasyonun cilasını yaptın mı" — hayır yapılmamıştı, bu turda yapıldı (`components/web-storefront.tsx`, `WebHeader` + `CategoryNav`):
- [x] **Giriş yapmış kullanıcı kimliği header'da gerçekten gösteriliyor**: jenerik "person" ikonu yerine artık kullanıcının profil fotoğrafı (varsa) + adı ("Ahmet") görünüyor. `SecureStore`'daki önbelleklenmiş `user` kaydından okunuyor (login/register/profile-settings zaten bunu güncel tutuyordu), sayfa değiştikçe tazeleniyor.
- [x] **Aktif sayfa vurgusu**: Favoriler/Teklifler/Profil ikonları, o sayfadayken hafif yeşil arka planla; kategori menüsünde seçili kategori kalın+yeşil+alt çizgili gösteriliyor (Dolap/Trendyol'daki gibi).
- [x] **Tıklanabilirlik hissi**: tüm header/nav/hero/banner/CTA butonlarına `cursor: pointer` eklendi (öncesinde web'de fare imleci değişmiyordu, "tıklanabilir" hissi zayıftı).
- [x] **Bug bulundu ve düzeltildi**: aktif kategori vurgusu ilk yazımda çalışmıyordu — sebebi `CategoryNav`'ın `useLocalSearchParams()` kullanması; bu bileşen paylaşılan Tab Navigator header'ı içinde render edildiği için o hook ekranın query param'larını görmüyor (React Navigation mimarisinin bir sonucu). `useGlobalSearchParams()`'a geçilerek düzeltildi ve canlı doğrulandı.
- [x] Not: header zaten React Navigation'ın kendi header slotunda render olduğu için (ScrollView içine gömülü değil) **zaten sticky/sabit davranıyordu** — ayrı bir "sticky" düzeltmesi gerekmedi.
- [x] `npx tsc --noEmit` temiz. Mobil hiç etkilenmedi (bu header sadece `isDesktopWeb` iken render ediliyor).

## PHASE 13 — Hesap alt sayfaları (Favorilerim / İlanlarım / Takaslarım) masaüstü redesign
Bu üç ekran `(activity)` route grubunda, `(tabs)` navigator'ının dışında olduğu için masaüstü header/nav'ı hiç almıyordu — dar, tek sütun mobil liste olarak kalıyordu. Üçü de aynı desenle düzeltildi:
- [x] Her üçüne de `<StorefrontHeader />` (aynı arama/kategori/hesap header'ı, zaten `web-storefront.tsx`'te bağımsız export edilmişti) eklendi — artık bu sayfalarda da tam navigasyon var ve ilgili ikon (Favoriler/Teklifler) doğru şekilde aktif vurgulanıyor.
- [x] **Favorilerim**: dar liste → gerçek ürün kartı grid'i (resim + kaldır rozeti + başlık + takas beklentisi), üstte "N ürün" sayacı.
- [x] **İlanlarım**: aynı grid deseni + durum rozeti (Yayında/Takaslandı/Onay Bekliyor), boş durumda "İlan Ekle" CTA'sı.
- [x] **Gerçekleşen Takaslarım**: takas kartları artık 2 sütunlu grid'de (`renderTradeCard` ortak fonksiyona çıkarıldı, mobil/masaüstü aynı kartı kullanıyor — kod tekrarı yok); ayrıca bu ekranda hiç olmayan **hata durumu** (`ErrorState` + "Tekrar Dene") eklendi.
- [x] Üç ekranın ortak masaüstü stilleri `components/ui/desktop-activity-styles.ts`'e çıkarıldı (tekrar önlendi).
- [x] Geliştirme sırasında Expo'nun otomatik ürettiği `.expo/types/router.d.ts` dosyası bozulmuş bulundu (eşzamanlı dosya yazımlarından kaynaklanan bir yarış durumu, kaynak kodla ilgisi yok) — silinip Expo'nun temiz yeniden üretmesine bırakıldı, `tsc` tekrar temiz.
- [x] `npx tsc --noEmit` temiz, `php artisan test` regresyonsuz (28/28).
- [x] **Canlı doğrulama** (1440×900): Favorilerim "1 ürün" + kart grid; İlanlarım "5 ilan" + durum rozetleriyle grid; Gerçekleşen Takaslarım "1 takas" + kart. Header'da ilgili ikonlar doğru aktif. **Mobil (375px) görünüm bire bir korunmuş.**

## PHASE 12 — "İlan Ver" masaüstü redesign + canlı önizleme
`add.tsx` masaüstünde tek sütun, dar bir mobil form olarak kalıyordu. Artık:
- [x] **İki sütunlu düzen**: solda form (fotoğraf/başlık/kategori/durum/açıklama/takas beklentisi/yayınla), sağda **canlı önizleme kartı** — kullanıcı yazarken/seçim yaparken (başlık, kategori, durum, ilk fotoğraf) gerçek zamanlı güncelleniyor. Önizleme kartı diğer ekranlardaki gerçek ürün kartı görünümüyle birebir aynı.
- [x] Form alanları (`renderImageUploader/renderTitleField/renderCategoryField/...`) fonksiyonlara çıkarıldı — mobil ve masaüstü aynı input mantığını/state'i paylaşıyor, kod ikilenmesi yok.
- [x] İlk fotoğrafın kapak olduğunu gösteren "KAPAK" rozeti eklendi (hem mobil hem masaüstü).
- [x] **Bulunup düzeltilen bir hata**: ilk yazımda `add.tsx` kendi `<StorefrontHeader />`'ını render ediyordu, ama bu ekran zaten `(tabs)` grubunun içinde olduğu için `_layout.tsx` üzerinden otomatik header alıyor — çift header oluşuyordu. Kaldırıldı (favorites/my-listings/my-trades'ten farklı olarak `add.tsx`'in kendi header'ı render etmesine gerek yok, çünkü onlar `(tabs)` dışında, bu `(tabs)` içinde).
- [x] `npx tsc --noEmit` temiz.
- [x] **Canlı doğrulama** (1440×900): başlık yazıldıkça ("Vintage Deri Çanta") ve kategori seçildikçe ("Elektronik") önizleme kartı anında güncellendi. Mobil (375px) form bire bir korunmuş.

## Görsel QA turu — "Tekliflerim" (offers.tsx) atlanmış bulundu
Şimdiye kadar redesign edilen ekranları tek tek gözden geçirirken **`(tabs)/offers.tsx`'in hiç masaüstü düzeni almadığı** ortaya çıktı — `(tabs)` grubunda olduğu için header'ı otomatik alıyordu ama kendi içeriği hâlâ tam-genişlik, tek sütun mobil kart listesiydi (kabul et/reddet/iptal et aksiyonları olan, önem taşıyan bir ekran).
- [x] Masaüstünde kendi "Tekliflerim" başlığı `StorefrontHeader`'ınkiyle çakışmasın diye gizlendi, sayfa `desktopActivityStyles.page` ile ortalandı (max 1200px).
- [x] Gelen/Giden teklif kartları artık `desktopActivityStyles.cardGrid` ile 2 sütunlu grid'de (my-trades.tsx'teki aynı desen); Kabul Et/Reddet/İptal Et aksiyonları değişmedi.
- [x] `npx tsc --noEmit` temiz.
- [x] **Canlı doğrulama**: masaüstünde tek header, ortalanmış içerik, "ONAYLANDI" durumlu teklif kartı doğru boyutta render oluyor; "Giden Teklifler" boş durumu da doğru. Mobil (375px) görünüm bire bir korunmuş.

## Görsel QA turu (devam) — "Teklif Gönder" (product/[id]/offer.tsx)
- [x] Masaüstünde `StorefrontHeader` + ortalanmış sayfa + seçilebilir ürün kartı grid'i (seçili kart yeşil çerçeve + onay rozeti); "Teklifi Gönder" butonu mobildeki sabit alt bar yerine grid'in altında.
- [x] **Hata düzeltmesi**: takaslanmış (status 3) ürünler teklif seçicisinde hâlâ listeleniyordu (backend 409 ile reddediyordu ama kullanıcı yine de seçebiliyordu) — artık istemcide filtreleniyor (hem mobil hem masaüstü).
- [x] `tsc` temiz; masaüstü ve mobil (375px) canlı doğrulandı.
- [ ] **Henüz kontrol edilmeyen** masaüstü düzeni olmayan ekranlar: `(settings)` grubu (`settings`, `profile-settings`, `address`, `change-password`, `privacy-policy`) ve `user/[id].tsx` (satıcı herkese açık profili).

## Sıradaki Fazlar (henüz başlanmadı)
PHASE 4/5 (görsel varyantları/optimizasyon), PHASE 17-20 (bildirimler, mesajlaşma, admin panel), PHASE 21-26 (SEO, accessibility, performans, test, görsel QA, dokümantasyon) — kapsam çok büyük, her biri ayrı ayrı analiz→uygula→test edilerek ilerlenecek.

## Doğrulama notu
`components/` altında `Alert.alert` kullanımı olup olmadığı ayrıca kontrol edildi — yok, sweep tam kapsamlı.

## TODO listesine göre ilerleme (TAKASCO_TODO.md) — A, B, C, D grupları
- **A (güvenlik/backend)**: `ProductController` 500 yanıtlarında `$e->getMessage()` sızıntısı kapatıldı (log'a yazılıyor), update/deleteImage'de eksik-kayıt 500 yerine 404; kayıt/giriş uçlarına `throttle:10,1` (brute-force koruması, testli); API için Türkçe standart 401/404/429 JSON gövdeleri (`bootstrap/app.php`); ilan oluşturmada `category_id exists` + `condition in:` doğrulaması; `.gitignore`'a `.vs/`; mobil `EXPO_PUBLIC_API_URL` desteği + `mobile/.env.example`; `APP_DEBUG` prod uyarısı; axios interceptor ağ/429/5xx için Türkçe mesaj. **Backend testleri 28 → 51+ (ProductApiTest, AuthApiTest eklendi).**
- **B (UX sistemi)**: Toast + onay diyaloğu sistemi (`components/ui/toast-provider.tsx`; `utils/alert.ts` artık web'de `window.alert/confirm` yerine bunları kullanır; ESC ile kapanır, `role=alert`); ürün ızgarası iskelet yükleme (`skeleton.tsx`, azaltılmış hareket desteğiyle); `+not-found.tsx` 404 sayfası. Yol boyunca: teklif rozetlerinde "REDDEDILDI" Türkçe büyük harf hatası düzeltildi.
- **C (masaüstü düzeni)**: `SubPage` ortak bileşeni ile `(settings)` 5 ekranı + `user/[id]`; `(auth)/_layout.tsx` ile giriş/kayıt/karşılama masaüstünde ortalanmış kart.
- **D (ana sayfa/keşfet/ürün)**: `SiteFooter` (gerçek linkler) + yeni **Kullanım Koşulları** sayfası (`terms.tsx`); ana sayfada "TakasCo nasıl çalışır?" ve gerçek veriyle "Popüler İlanlar"; güven rozetindeki teknik jargon düzeltildi; ortak `ProductCard` (durum · şehir · "2 gün önce") ve `utils/date.ts`; keşfette **şehir filtresi** (`GET /api/cities`, gerçek verilerden) ve tüm filtrelerin **URL ile senkronu**; ürün detayda breadcrumb, "bağlantıyı kopyala", "Satıcının Diğer İlanları" (`seller_products`).
- Bilinen not: `settings.tsx`'teki "Bildirimler" anahtarı şimdilik yerel durumdan ibaret (backend bildirim sistemi G1'de gelecek).

## İkinci tur (Grup I)
- [x] Şikayet + engelleme (backend + arayüz: ilan şikayeti, sohbette engelle/şikayet, admin "Şikayetler" sekmesi), ilan düzenleme ekranı, "Şehrindeki İlanlar", kategori/şehir önbelleği, lint temizliği (0 uyarı).
- Doğrulama: backend 94 test geçiyor, `tsc --noEmit` ve `expo lint` temiz. Bu turdaki yeni arayüzler tarayıcıda elle denenmedi (kullanıcı talebiyle).
