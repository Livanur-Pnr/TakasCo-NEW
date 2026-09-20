# TakasCo — Mimari

## Genel bakış

```
            Laravel API (backend/)  ── SQLite/MySQL, storage/app/public
                      │  JSON + Bearer token (Sanctum)
        ┌─────────────┴─────────────┐
   Expo / React Native         React Native Web
   (iOS · Android)             (tarayıcı; ≥ 900px = masaüstü "mağaza" düzeni)
              └────────── mobile/ (TEK kod tabanı) ──────────┘
```

Ayrı bir Next.js uygulaması **kasıtlı olarak yoktur**: tek kod tabanı, tek backend, iki ayrı frontend bakımı gerekmez.

## Kimlik doğrulama ve yetki

- Sanctum **Bearer token** (çerez/SPA modu değil). Token istemcide `utils/storage.ts` (native: SecureStore, web: localStorage) içinde tutulur.
- **Yetki kararı yalnızca backend'de verilir.** İstemcideki "Yönetim" bağlantısı sadece kolaylıktır; `/api/admin/*` uçları `IsAdmin` middleware'i arkasındadır (`is_admin` modelde `boolean` cast'lidir, kayıt/profil isteğiyle atanamaz — testli).
- `POST /register` ve `/login` IP başına dakikada 10 istekle sınırlıdır (brute-force koruması). Mesaj gönderme dakikada 30.
- Kişisel veri: herkese açık listelerde kullanıcı için yalnızca `id, name, city, district, profile_photo_path` seçilir; e-posta/telefon ancak teklif **kabul edilince** karşı tarafa döner.
- Hata gövdeleri standarttır ve iç ayrıntı sızdırmaz: `{"message": "..."}` (422'de ayrıca `errors`). Yakalanmamış hatalar sunucu loguna yazılır (`report($e)`).

## Veri modeli (özet)

`users` · `categories` · `products` (+ `product_images`, SoftDeletes) · `favorites` (unique `user_id+product_id`) · `trades` · `notifications` (Laravel yerleşik) · `conversations` (unique çift+ilan; `user_one_id` her zaman küçük id) · `messages`

`products.status`: `1` yayında · `2` onaylı (yayında) · `3` takaslandı · `4` moderasyonla kaldırıldı. Herkese açık liste yalnızca `1,2` gösterir; `4` yalnızca sahibi ve adminlere görünür.

`products.image_path` eski kayıtlarda JSON dizi (`["products/a.jpg"]`) olabilir; `ProductImageService` ve istemci bunu tanır.

## Takas durum makinesi

`TradeStatus` enum'u: `beklemede → onaylandı | reddedildi | iptal edildi` (DB'de Türkçe string'ler korunur; JSON çıktısı değişmez).

- `accept/reject/cancel` tek `DB::transaction()` içinde `lockForUpdate()` ile çalışır; durum `beklemede` değilse `409`.
- `accept` iki ürünü de kilitler, `takaslandı` yapar ve aynı ürünlere gelen diğer bekleyen teklifleri reddeder.
- Aynı çift için bekleyen ikinci teklif, takaslanmış/kaldırılmış ürüne teklif → `409`.
- SQLite'ta satır kilidi yoktur (dosya seviyesinde yazma kilidi transaction'ı serileştirir); MySQL'de gerçek `FOR UPDATE` olur.

## Görseller

`ProductImageService`: yüklenen dosya yeniden kodlanır (GD) → 800px JPEG ana görsel + 400px WebP küçük görsel (`products/thumbs/`). Dosya adı/uzantısı sunucudan üretilir. API `thumb_path` döndürür (küçük görsel yoksa orijinal); ızgaralar küçük görseli, detay sayfası ana görseli kullanır. Mevcut görseller için: `php artisan images:thumbnails`.

## Şikayet ve engelleme
- Askıdaki hesabın ilanları `Product::published()` kapsamıyla herkese açık liste/şehir/benzer ilan sorgularından çıkar; ilan detayı ve profili 404 döner (sahibi/admin hariç), ona teklif verilemez. Askı kalkınca hepsi geri gelir.
- Hesap askıya alma: admin `POST /api/admin/users/{id}/(un)suspend`; askıdaki hesap giriş yapamaz, mevcut tokenları silinir ve `NotSuspended` middleware'i tüm oturum gerektiren uçlarda `403` döner.
- `POST /api/reports` (ilan veya kullanıcı; sebepler: spam, yaniltici, uygunsuz, sahte, diger; aynı hedef için tek şikayet, `throttle:10,1`). Admin `GET /api/admin/reports` kuyruğunu görür, `POST /api/admin/reports/{id}/resolve` ile çözüldü/reddedildi yapar.
- `POST|DELETE /api/users/{id}/block`: engel iki yönlü etki eder; mesaj gönderme, yeni konuşma ve takas teklifi `403` döner. Konuşma yanıtlarında `blocked` / `blocked_by_me` bayrakları vardır.
- `/api/categories` (10 dk) ve `/api/cities` (5 dk) `Cache::remember` ile önbelleklenir.

## E-posta bildirimleri
`TradeEventNotification` yalnızca `offer_received` ve `offer_accepted` için `mail` kanalını da kullanır; `users.email_notifications=false` ise gitmez (`POST /api/user/preferences`). E-posta metni takas ortağının telefon/e-postasını içermez. `MAIL_MAILER` varsayılanı `log`; üretimde SMTP tanımlanmalı. Gönderim eşzamanlıdır ve `notifyUser` içinde try/catch ile sarılıdır.

## Onboarding
`POST /api/user/onboarding` (giriş gerekir): `category_ids` (≤ 10, geçerli kategori), isteğe bağlı `city`/`district`. `users.interest_category_ids` (JSON) ve `onboarded_at` yazılır; boş gövde "şimdi değil" sayılır. Kayıt ekranı başarıyla bittiğinde `/onboarding`'e yönlendirir; giriş yapan mevcut kullanıcılara gösterilmez. İlgi alanları `RecommendationController` içinde +2 puanlık sinyaldir ve tek başına öneri üretmeye yeter.

## Sana Özel önerileri
`GET /api/recommendations` (giriş gerekir): favori kategorileri (+3, en fazla 3 kat), kayıtlı aramaya uyan ilan (+4), kendi ilanlarının kategorisi (+1..2), şehir eşleşmesi (+1, yalnızca puanı olan ilanda) ile en yeni 200 herkese açık ilan puanlanır; kendi/favorilenmiş/engelli/askıdaki/takaslanmış ilanlar hariç, en fazla 12 sonuç ve `reason` ("Favorilerine benzer" vb.). Hiç sinyal yoksa boş döner, uydurma öneri yoktur. Bu bir içerik tabanlı sıralamadır; görüntüleme geçmişi tutulmadığı için kullanılmaz.

## Takas eşleşmesi
`GET /api/matches` (giriş gerekir): `App\Services\SwapMatcher`, kullanıcının yayındaki takasa açık (≤ 20) ilanının `swap_expectation` metnini başkalarının en yeni 300 takasa açık ilanının başlık/marka/kategori kelimeleriyle karşılaştırır; ekler kabaca kök eşleşmesiyle (≥ 4 harflik kök) yakalanır, gereksiz kelimeler (stopwords) atılır. Karşı ilanın beklentisi de benim ilanımı tarif ediyorsa `mutual=true` olur ve öne çıkar; skor ortak kelime sayısıdır (uydurma yüzde yok). Kendi/satılık/engelli/askıdaki/takaslanmış ilanlar ve zaten bekleyen teklifi olan çiftler hariçtir. Anlamsal/yapay zekâ eşleşmesi değil, anahtar kelime eşleşmesidir; ölçek büyürse ön hesaplama/indeks gerekir.

## Şifre sıfırlama ve SEO
`POST /api/forgot-password` (`throttle:5,1`) her zaman aynı yanıtı verir (hesap var mı sızdırılmaz), Laravel'in şifre broker'ı e-postayla `FRONTEND_URL/reset-password?token=&email=` bağlantısı gönderir (`AppServiceProvider`). `POST /api/reset-password` tokenı tek kullanımlıktır, şifre en az 8 karakter + onay ister ve kullanıcının tüm API tokenlarını siler. `GET /sitemap.xml` ve `GET /robots.txt` Laravel web rotalarıdır: yalnızca herkese açık ilanları (askıdakiler/kaldırılmışlar/takaslananlar hariç, en fazla 5000) ve statik sayfaları listeler, özel alanları `Disallow` eder. Ürün sayfası istemcide `schema.org/Product` JSON-LD, canonical ve `og:image` yazar; fiyat yalnızca `satilik`/`ikisi` ilanlarda `Offer` olarak eklenir. Uygulama istemci taraflı render edildiği için JS çalıştırmayan tarayıcılar bu meta verileri görmez; tam çözüm için prerender/SSR gerekir.

## Görüntülenme ve arama önerileri
`products.views`: ilan detayı açıldığında artar; ilan sahibi sayılmaz, aynı ziyaretçi (giriş yapmışsa kullanıcı, değilse IP) 30 dakikada bir kez sayılır (`Cache::add`, cache sürücüsü paylaşımlı olmalı). `GET /api/search/suggestions?q=` (≥ 2 karakter, `throttle:60,1`): yalnızca herkese açık ilan başlıkları, kategoriler ve markalar. Son aramalar sunucuda değil tarayıcı depolamasında tutulur.

## Değerlendirmeler ve güven göstergeleri
`POST /api/trades/{id}/review` (1-5 puan, isteğe bağlı 500 karakter yorum): yalnızca kabul edilmiş takasın iki tarafı, her taraf bir kez; katılımcı olmayana 404. `GET /api/users/{id}/reviews` herkese açıktır (askıdaki hesap 404). `App\Services\UserStats` puan ortalaması, değerlendirme sayısı, tamamlanan takas sayısı ve rozetleri yalnızca gerçek kayıtlardan hesaplar; `GET /users/{id}` ve ilan detayındaki `user.stats` bunu kullanır. Rozetler: `new_member` (üyelik < 30 gün), `trusted_swapper` (≥ 3 tamamlanan takas), `highly_rated` (≥ 3 değerlendirme ve ortalama ≥ 4,5); eşikler `UserStats` içindedir. Telefon/kimlik doğrulama rozetleri yoktur çünkü doğrulama süreci yoktur. Değerlendirme moderasyonu (admin silme) henüz yok. `GET /trades` her teklife `reviewed` bayrağı ekler.

## Çoklu ürün teklifi
`POST /api/trades` isteğine `extra_offered_product_ids` (≤ 3, hepsi göndericinin, takasa açık ve müsait ürünleri) eklenebilir; birincil ürün `offered_product_id`'de kalır, ekler `trade_items` tablosuna yazılır (`Trade::extraProducts()`). Kabul edildiğinde verilen tüm ürünler + istenen ürün tek transaction'da kilitlenip "takaslandı" olur; bu ürünlerden herhangi birine (ek ürün dahil) gelen diğer bekleyen teklifler reddedilir; ek ürünlerden biri o sırada müsait değilse kabul 409 döner. Admin bir ilanı kaldırırsa ek ürün olduğu bekleyen teklifler de reddedilir. Karşı teklif yalnızca birincil ürünle çalışır (ek ürünler karşı teklife taşınmaz).

## E-posta doğrulama
`User` `MustVerifyEmail` uygular. Kayıtta ve e-posta adresi değişince doğrulama bağlantısı gider (60 dk imzalı, `GET /email/verify/{id}/{hash}` web rotası: imza/süre + `sha1(email)` doğrulanır, sonra `FRONTEND_URL/email-verified`'e yönlendirilir). `POST /api/email/verification-notification` (`throttle:3,1`) yeniden gönderir. `UserStats` `email_verified` rozetini yalnızca `email_verified_at` doluysa üretir. Mevcut kullanıcılar doğrulanmamış sayılır (e-posta göndermek için SMTP gerekir). Telefon/kimlik doğrulama yoktur.

## Nakit farkı ve karşı teklif
`trades.cash_amount` + `cash_direction` (`sender_pays` | `receiver_pays`, teklifi gönderen kişiye göre; ikisi birlikte verilir). `POST /api/trades/{id}/counter`: yalnızca alıcı, yalnızca `beklemede` teklife; ilk teklif `karşı teklif` durumuna geçer ve roller ters çevrilmiş yeni bir teklif açılır (`parent_trade_id`): gönderen = ilk alıcı (kendi ürününü verir), alıcı = ilk gönderen, istenen ürün ilk göndericinin başka bir ilanı olabilir. Karşı teklifi ilk gönderen mevcut `accept/reject` akışıyla yanıtlar; bu yüzden takas durum makinesi değişmedi. Karşı teklifte `cash_direction` karşı teklifi yapana göredir. `GET /api/trades` karşı tarafın yalnızca `id,name,profile_photo_path` alanlarını döner (telefon/e-posta yalnızca kabul yanıtında paylaşılır). Nakit yalnızca bilgi/anlaşma amaçlıdır; uygulama içinde ödeme alınmaz.

## İlan türü, fiyat ve teslimat
`products.listing_type`: `satilik` | `takas` | `ikisi` (mevcut ilanlar `takas`, eski istemciler tür göndermezse `takas` kalır). `price` yalnızca `satilik`/`ikisi` için zorunlu; `takas` ilanda fiyat yok sayılır. `swap_expectation` yalnızca `satilik` ilanda boş kalabilir. `satilik` ilan takas teklifine konu olamaz ve teklif gönderemez (409). `/api/products` filtreleri: `listing_type` (`takas` = takas+ikisi, `satilik` = satilik+ikisi), `min_price`, `max_price`, `brand`; sıralama: `price_asc`, `price_desc`. Ödeme altyapısı yoktur: "satın alma" satıcıyla mesajlaşma ve elden/kargo anlaşmasıdır. Kayıtlı aramalar fiyat/tür ölçütü içermez.

## Hesap silme ve engel listesi
`POST /api/user/delete` (şifre onaylı, `throttle:5,1`): satır silinmez, kişisel veriler anonimleştirilir (`Silinmiş Kullanıcı`, `silinmis-{id}@deleted.invalid`), ilanlar soft-delete edilir, bekleyen teklifler iptal edilir, tokenlar/bildirimler/kayıtlı aramalar silinir, hesap askıya alınır (giriş imkansız). Yönetici hesabı bu uçtan silinemez. `GET /api/blocks` engellediğin kullanıcıları listeler.

## Kayıtlı aramalar
`GET/POST /api/saved-searches`, `DELETE /api/saved-searches/{id}` (kullanıcı başı 10, aynı ölçüt tekrar kaydedilmez, başkasının kaydı 404). Yeni ilan `ProductController::store` içinde kayıtlı aramalarla eşleştirilir; eşleşen kullanıcılara (ilan sahibi hariç, kişi başı bir) `SavedSearchMatchNotification` gider. Eşleştirme hatası ilan oluşturmayı bozmaz. Eşleştirme kayıt sayısıyla doğrusal büyür; ölçek gerekirse kuyruğa alınmalıdır.

## Bildirimler ve mesajlaşma

- Bildirimler Laravel `database` kanalıyla üretilir (`TradeEventNotification`: teklif geldi / kabul / red / geri çekme). Bildirim üretimi hata verirse takas akışı bozulmaz (loglanır).
- Mesajlaşma: konuşma katılımcıları dışında erişim `404` döner (varlığı sızdırmaz). Alınan mesajlar konuşma açılınca okundu olur.
- Gerçek zamanlılık **polling** ile sağlanır. `GET /conversations/{id}/messages?after={son_id}` yalnızca yeni mesajları döner; istemcide ortak `usePolling` hook'u uygulama/sekme arka plandayken durur, öne gelince hemen yeniler.
- **WebSocket (Laravel Reverb) kuruldur.** `App\Events\MessageSent` (`ShouldBroadcastNow`, kuyruk işçisi gerekmez) mesaj gönderilince `private-conversation.{id}` ve alıcının `private-App.Models.User.{id}` kanallarına `message.sent` olayını yayınlar; yükte metin yoktur (`id`, `conversation_id`, `sender_id`), istemci olayı alınca `?after=` ile yeni mesajları API'den okur (yetki ve okundu bilgisi tek yerde kalır). Kanal yetkisi `routes/channels.php`'dedir (konuşma yalnızca iki katılımcıya, kişisel kanal yalnızca sahibine açık) ve mobil istemci için Bearer token ile `POST /api/broadcasting/auth` üzerinden verilir. Yayın hatası mesaj göndermeyi asla bozmaz (`report`). İstemci `utils/realtime.ts`: `EXPO_PUBLIC_REVERB_KEY` yoksa devre dışı; abone olununca polling seyrekleşir (sohbet 5→30 sn, liste 15→60 sn, rozet 20→90 sn), bağlantı yoksa eski sıklığa döner. Yerelde `php artisan reverb:start` ayrı süreç olarak çalışmalıdır (`start-takasco.ps1` bunu da açar); üretimde süreç yöneticisi (Supervisor vb.) ve `wss://` (TLS) arkasında yayın gerekir, `REVERB_*` değerleri üretime göre ayarlanmalıdır. Bildirimler (`/notifications`) hâlâ polling'dir.

## Frontend yapısı (`mobile/`)

```
app/            Expo Router ekranları — (tabs) sekmeler, (activity) favori/ilan/takas, (settings), (auth), product/[id], user/[id], messages, notifications, admin
components/     web-storefront.tsx (masaüstü header/footer/ana sayfa bölümleri), product-card, notification-list, ui/* (toast, skeleton, error-state, sub-page…)
hooks/          use-is-desktop-web, use-favorites, use-notifications, use-unread-messages
utils/          api (axios + hata normalizasyonu), alert (web'de toast/onay), storage, date, use-page-title, web-a11y
```

**Masaüstü/mobil ayrımı:** `useIsDesktopWeb()` (`Platform.OS==='web' && width ≥ 900`). Ekranlar masaüstü için ayrı bir dal render eder; mobil düzen dokunulmadan kalır. `(tabs)` içindeki ekranlar masaüstü header'ını `_layout.tsx` üzerinden otomatik alır; `(tabs)` dışındakiler `StorefrontHeader`'ı kendisi render eder (`SubPage` bunu yapar).
