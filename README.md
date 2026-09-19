# TakasCo

**Değiştir. Keşfet. Yeniden değerlendir.**
İkinci el eşyaların takas edildiği bir pazar yeri. Tek kod tabanı hem mobil (iOS/Android) hem web'de çalışır.

| Katman | Teknoloji |
|---|---|
| Backend | Laravel 13 (PHP ≥ 8.3), Laravel Sanctum (Bearer token), Intervention Image (GD), SQLite (geliştirme) / MySQL (üretim) |
| İstemci | Expo SDK 54, React Native 0.81, Expo Router, React Native Web (masaüstünde `≥ 900px` ayrı, "mağaza" düzeni) |

Ayrıntılar: [`TAKASCO_ARCHITECTURE.md`](./TAKASCO_ARCHITECTURE.md) · Geliştirici notları: [`TAKASCO_DEVELOPMENT.md`](./TAKASCO_DEVELOPMENT.md) · Yapılacaklar: [`TAKASCO_TODO.md`](./TAKASCO_TODO.md) · Denetim ve ilerleme: [`TAKASCO_AUDIT.md`](./TAKASCO_AUDIT.md), [`TAKASCO_PROGRESS.md`](./TAKASCO_PROGRESS.md)

## Özellikler

- İlan verme (en fazla 8 fotoğraf, otomatik küçük görsel üretimi), arama, kategori/durum/şehir filtresi, sıralama (yeni / en çok favorilenen / eski), URL ile paylaşılabilir filtreler
- Favoriler, satıcı profili, ürün detayı (benzer ilanlar, satıcının diğer ilanları)
- Takas teklifi gönderme, kabul / red / geri çekme (eşzamanlılığa karşı DB kilitli, geçersiz durum geçişleri engelli)
- Uygulama içi bildirimler, ilan bazlı mesajlaşma (okundu bilgisi, hız sınırı)
- İlan/kullanıcı şikayeti, kullanıcı engelleme (mesaj ve takas iki yönlü kapanır), admin şikayet kuyruğu
- Kayıt sonrası onboarding (ilgi alanı/şehir), galeride yakınlaştırma, mobil arama önerileri
- Ana sayfada kişiselleştirilmiş "Sana Özel" (kullanıcının kendi etkinliğinden)
- Takas eşleşmesi ("Sana Uygun Takaslar"): takas beklentisi ile gerçek ilanların karşılıklı eşleşmesi
- Şifremi unuttum (e-posta ile sıfırlama), sitemap.xml/robots.txt, ürün structured data
- İlan görüntülenme sayısı, arama önerileri ve son aramalar
- Değerlendirmeler (tamamlanan takas sonrası) ve gerçek verilerden güven rozetleri
- Aynı teklifte çoklu ürün (en fazla 4), e-posta doğrulama ve "E-posta Doğrulandı" rozeti
- Takasta para farkı ve karşı teklif
- İlan türü (satılık / takasa açık / ikisi), fiyat, marka, teslimat; fiyat/tür filtresi ve fiyat sıralaması
- Bilgi sayfaları (SSS, KVKK, Güvenli Takas…), çerez bilgilendirmesi, hesap silme, engellenen kullanıcılar
- E-posta bildirimi (teklif geldi/kabul; Ayarlar'dan kapatılır, üretimde SMTP gerekir)
- Kayıtlı aramalar (uyan yeni ilanda bildirim), admin'de hesap askıya alma
- İlan düzenleme, kullanıcının şehrine göre "Şehrindeki İlanlar"
- Yönetim paneli: genel bakış, ilan moderasyonu (kaldır / geri yükle), kullanıcı listesi
- Türkçe hata / boş / yükleme durumları, erişilebilirlik (klavye odağı, ARIA, azaltılmış hareket)

## Hızlı başlangıç (Windows)

Önkoşullar: PHP 8.3+ (GD eklentisi açık), Composer, Node 20+.

```bash
# 1) Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed        # örnek (yapay) veri; yalnızca geliştirme içindir
php artisan storage:link
php artisan images:thumbnails     # seed'deki görseller için küçük görselleri üretir
php artisan serve --host=0.0.0.0 --port=8000

# 2) İstemci (yeni terminal)
cd mobile
npm install
npx expo start --web              # web için; telefon için `npx expo start`
```

Tek komutla ikisini birden açmak için kök dizindeki `start-takasco.bat` kullanılabilir.

Örnek hesaplar (yalnızca seed ile gelen geliştirme verisi): `ahmet@example.com`, `merve@example.com` … parola `qwer1234`. **Bu hesaplar üretimde bulunmamalıdır.**

## Ortam değişkenleri

**backend/.env** (bkz. `.env.example`)

| Değişken | Not |
|---|---|
| `APP_ENV`, `APP_DEBUG` | Üretimde `production` / `false` — aksi halde hata ayrıntıları sızar |
| `APP_KEY` | `php artisan key:generate` |
| `DB_*` | Varsayılan SQLite (`database/database.sqlite`); üretimde MySQL önerilir (satır kilitleri gerçek `SELECT … FOR UPDATE` olur) |

**mobile/.env** (bkz. `mobile/.env.example`)

| Değişken | Not |
|---|---|
| `EXPO_PUBLIC_API_URL` | Üretim API adresi (örn. `https://api.takasco.com`). Boşsa geliştirmede Metro'nun LAN IP'si / localhost:8000 kullanılır |

Gizli anahtarlar depoya girmez: `.env`, SQLite dosyası ve yüklenen görseller `.gitignore` altındadır.

## Test

```bash
cd backend && php artisan test        # 146 test (takas güvenliği, yetkilendirme, bildirim, mesajlaşma, admin, görsel, auth…)
cd mobile  && npx tsc --noEmit        # tip kontrolü
```

## Üretime alma kontrol listesi

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, HTTPS
- [ ] MySQL'e geçiş (`DB_CONNECTION=mysql`), `php artisan migrate --force` (seed **çalıştırmayın**)
- [ ] `php artisan storage:link`, `php artisan images:thumbnails`, `php artisan config:cache route:cache`
- [ ] CORS: `config/cors.php` yayınlanıp yalnızca kendi web origin'lerinize izin verilmeli (şu an Laravel varsayılanı: tüm origin'ler)
- [ ] PHP `upload_max_filesize` / `post_max_size` en az `8 × 5MB` görsel yüklemeye yetecek şekilde ayarlanmalı
- [ ] Web build: `EXPO_PUBLIC_API_URL=… npx expo export --platform web`
- [ ] `.env`: `FRONTEND_URL` (sitemap/robots/şifre sıfırlama bağlantıları ön yüzün herkese açık adresine göre üretilir)
- [ ] İlk yönetici hesabı veritabanında elle oluşturulur (`is_admin=1`); kayıt üzerinden admin olunamaz

## Bilinen sınırlamalar

- Mesajlaşma ve bildirimler WebSocket yerine polling kullanır (sohbet 5 sn, artımlı `after` isteğiyle; liste 15 sn, rozet 20 sn, bildirim 30 sn). Uygulama/sekme arka plandayken polling durur. Gerçek zamanlı için Laravel Reverb kurulabilir (bkz. `TAKASCO_ARCHITECTURE.md`)
- Kullanıcı engelleme / şikayet (raporlama) sistemi henüz yok
- E-posta doğrulama ve parola sıfırlama API tarafında yok
- Şehir/ilçe metin olarak tutulur; konum bazlı "yakınımdaki ilanlar" yok
