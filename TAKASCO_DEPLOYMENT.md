# TakasCo — Yayına Alma Rehberi

Bu rehber, TakasCo'yu gerçek bir alan adında yayınlamak için gereken teknik adımları ve işletme/hukuk hazırlıklarını sıralar. Komutlar Ubuntu 24.04 sunucu içindir; farklı bir hizmet seçilirse karşılığı değişir.

## 1. Mimari (önerilen, başlangıç için en sade)

| Parça | Nerede çalışır | Adres (örnek) |
|---|---|---|
| Web arayüzü (Expo statik çıktı) | statik barındırma (nginx ya da Cloudflare Pages/Netlify) | `https://takasco.com` |
| API (Laravel) | sunucuda PHP-FPM + nginx | `https://api.takasco.com` |
| Gerçek zamanlı (Reverb) | aynı sunucuda Supervisor ile sürekli süreç, nginx arkasında `wss://` | `wss://ws.takasco.com` |
| Veritabanı | MySQL/MariaDB (ya da PostgreSQL) | sunucu içi |
| Görseller | sunucu diski (`storage/app/public`) — **kalıcı diskli sunucu şart** | `https://api.takasco.com/storage/...` |
| E-posta | SMTP sağlayıcı (Brevo, Mailgun, Resend, Gmail Workspace vb.) | — |

Neden tek sunucu: yönetimi kolaydır. Görseller diskte durduğu için, dosya sistemi geçici olan platformlarda (Render/Railway ücretsiz katman gibi) yüklenen fotoğraflar kaybolur; onlar seçilecekse görseller S3 uyumlu bir depolamaya taşınmalıdır (kod değişikliği gerekir).

## 2. Ortam değişkenleri (üretim)

Backend `.env`:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.takasco.com
FRONTEND_URL=https://takasco.com
CORS_ALLOWED_ORIGINS=https://takasco.com,https://www.takasco.com
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=takasco
DB_USERNAME=takasco
DB_PASSWORD=<güçlü parola>
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=sync
MAIL_MAILER=smtp
MAIL_HOST=<smtp adresi>
MAIL_PORT=587
MAIL_USERNAME=<...>
MAIL_PASSWORD=<...>
MAIL_FROM_ADDRESS=noreply@takasco.com
MAIL_FROM_NAME=TakasCo
BROADCAST_CONNECTION=reverb
REVERB_APP_ID / REVERB_APP_KEY / REVERB_APP_SECRET   (sunucuda `php artisan reverb:install` ile yeniden üretilir; gizli tutulur)
REVERB_HOST=ws.takasco.com
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
GOOGLE_CLIENT_ID=<Google Cloud web istemci kimliği>
```

Web derlemesi sırasında (bilgisayarında):

```
EXPO_PUBLIC_API_URL=https://api.takasco.com
EXPO_PUBLIC_REVERB_KEY=<REVERB_APP_KEY>
EXPO_PUBLIC_REVERB_HOST=ws.takasco.com
EXPO_PUBLIC_REVERB_PORT=443
EXPO_PUBLIC_REVERB_SCHEME=https
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<aynı istemci kimliği>
```

Notlar:
- `REVERB_APP_SECRET`, veritabanı ve SMTP parolaları **asla** git'e, web derlemesine ya da sohbete konmaz.
- `QUEUE_CONNECTION=sync`: şu an kuyruğa atılan iş yok (bildirim/e-posta/yayın eşzamanlı). Kuyruk kullanılacaksa Supervisor ile `php artisan queue:work` eklenmeli.

## 3. Sunucu kurulumu (özet)

1. Alan adının DNS kayıtları: `takasco.com`, `www`, `api`, `ws` → sunucu IP'si.
2. Paketler: `nginx`, `php8.4-fpm` (+ `mbstring xml curl mysql gd bcmath intl zip`), `composer`, `mysql-server`, `supervisor`, `certbot`.
3. Kod: `git clone` (private depo için deploy anahtarı), `cd backend && composer install --no-dev --optimize-autoloader`.
4. `.env` oluştur (yukarıdaki değerler), ardından:
   ```
   php artisan key:generate
   php artisan migrate --force
   php artisan storage:link
   php artisan config:cache && php artisan route:cache
   ```
5. nginx: `api.takasco.com` → `backend/public` (PHP-FPM). `ws.takasco.com` → `proxy_pass http://127.0.0.1:8080` (WebSocket için `Upgrade`/`Connection` başlıkları). Web için `takasco.com` → statik `dist` klasörü, bilinmeyen yollar `index.html`'e düşer.
5. HTTPS: `certbot --nginx -d takasco.com -d www.takasco.com -d api.takasco.com -d ws.takasco.com`.
6. Supervisor ile Reverb: `php artisan reverb:start --host=127.0.0.1 --port=8080` (çökerse yeniden başlar).
7. Web derlemesi (kendi bilgisayarında): `cd mobile && npx expo export -p web`, çıkan `dist` klasörünü sunucuya yükle.
8. İlk yönetici: kayıt ol, sonra `php artisan tinker` içinde `User::where('email','...')->update(['is_admin'=>true])` (kayıt üzerinden admin olunamaz).
9. Eski ilanlar varsa bir kez: `php artisan images:thumbnails`.
10. Google girişi: Google Cloud > Google Auth Platform > Clients > web istemcisine `https://takasco.com` (ve `www`) ekle; Branding sayfasını (ana sayfa, gizlilik ve koşullar bağlantıları) doldurup **Publish app**.

## 4. Yayın öncesi teknik kontrol listesi

- [ ] `APP_DEBUG=false`, `APP_ENV=production`, gerçek `APP_KEY`
- [ ] MySQL/PostgreSQL'de `php artisan migrate --force` hatasız (geliştirmede SQLite kullanıldı; **canlı veritabanında testleri/akışları ayrıca dene**)
- [ ] `CORS_ALLOWED_ORIGINS` yalnızca kendi alan adın
- [ ] HTTPS her yerde (API, web, `wss://`)
- [ ] SMTP ile doğrulama ve şifre sıfırlama e-postası gerçekten geliyor (gelen kutusu + spam)
- [ ] Yüklenen görseller `storage:link` ile görünüyor, disk yedeği var
- [ ] Veritabanı ve `storage/app/public` için otomatik yedek (günlük) ve **geri yükleme denemesi**
- [ ] Hata izleme (ör. Sentry) ve uptime izleme (ör. UptimeRobot); `storage/logs` döndürülüyor
- [ ] Sunucu güvenliği: SSH anahtarı, parola girişi kapalı, güvenlik duvarı (yalnızca 22/80/443), otomatik güvenlik güncellemeleri
- [ ] `composer audit` temiz
- [ ] `robots.txt` ve `sitemap.xml` alan adına göre doğru (Laravel `FRONTEND_URL`'i kullanır; web adresinde de bu dosyalara erişim sağlamak için nginx'te `api` adresine yönlendirilebilir)

## 5. İşletme ve hukuk (teknik değil ama yayından önce netleşmeli)

Bu bölüm hukuki tavsiye değildir; bir avukat ve mali müşavirle doğrulanmalıdır.

- [ ] **Kim işletiyor?** Şahıs mı, şirket mi? İletişim ve "veri sorumlusu" bilgisi buna göre yazılır (KVKK metnindeki "veri sorumlusu" alanı şu an genel).
- [ ] Gizlilik politikası, KVKK aydınlatma metni, kullanım koşulları ve topluluk kuralları metinlerinin **avukat incelemesi** (uygulamadaki metinler taslak niteliğindedir).
- [ ] Veri sorumlusu olarak yükümlülükler (ör. VERBİS kaydı gerekip gerekmediği) ve internet aracı hizmet sağlayıcı yükümlülükleri (ör. ETBİS) için danışmanlık.
- [ ] Destek ve şikayet için gerçek bir iletişim e-postası (`EXPO_PUBLIC_CONTACT_EMAIL`) ve bir moderasyon/yanıt süreci.
- [ ] Yasaklı ürün politikasının uygulanacağı kişi (admin) ve şikayetlere bakma düzeni.
- [ ] Ticari e-posta/bildirim göndermeden önce izin süreci (şu an yalnızca işlemsel e-postalar gidiyor).

## 6. Bakım

- Güncelleme: `git pull`, `composer install --no-dev`, `php artisan migrate --force`, `php artisan config:cache route:cache`, `php artisan reverb:restart`, web için yeniden `expo export`.
- Aylık: `composer audit`, `npm audit --omit=dev`, sunucu güncellemeleri.
- Yedek geri yükleme denemesi düzenli yapılmalıdır; denenmemiş yedek yedek sayılmaz.
