# TakasCo — Geliştirici Notları

## Günlük akış

```bash
# backend
cd backend && php artisan serve --host=0.0.0.0 --port=8000
php artisan test                      # her değişiklikte
# istemci
cd mobile && npx expo start --web
npx tsc --noEmit                      # her değişiklikte
```

Yeni bir ekran / özellik eklerken sıra: backend uç + **test** → istemci ekranı → tarayıcıda hem `1440px` hem `375px` doğrulama.

## Konvansiyonlar

- Kullanıcıya görünen tüm metin Türkçe; hata/boş/yükleme durumları ayrı ele alınır (`ErrorState`, `Skeleton`, boş durum metni).
- `Alert.alert` için **her zaman** `@/utils/alert` içe aktarılır (aşağıya bkz.).
- Masaüstü düzeni `useIsDesktopWeb()` ile ayrı dalda; ortak alt sayfalar için `components/ui/sub-page.tsx`, ızgara sayfaları için `components/ui/desktop-activity-styles.ts`.
- Yetki/doğrulama backend'de zorunludur; istemci kontrolleri yalnızca kullanıcı deneyimi içindir.
- Sahte/mock veri gösterilmez: istatistikler ve rozetler gerçek API verisinden hesaplanır.
- Veritabanı değişiklikleri **eklemeli** migration'larla yapılır; mevcut veri silinmez, mobil istemcinin JSON şekli bozulmaz.

## Test

- Backend: `tests/Feature/*` — `TradeSecurityTest`, `ProductApiTest`, `ProductImageTest`, `AuthApiTest`, `NotificationTest`, `MessagingTest`, `AdminTest` (+ Breeze'den kalan auth testleri; `TestCase` Vite'ı devre dışı bırakır).
- Testte `actingAs()` sonraki isteklere de taşınır; misafir isteği için oturum sıfırlanmalı (`$this->app['auth']->forgetGuards()`).
- Görsel testleri diske gerçek dosya yazar; `tearDown` içinde `ProductImageService::delete` ile temizlenmelidir.
- İstemci için otomatik test altyapısı yok; doğrulama tarayıcıda elle yapılır (bkz. `TAKASCO_PROGRESS.md`).

## Öğrenilmiş tuzaklar

| Tuzak | Çözüm |
|---|---|
| `react-native-web`'de `Alert.alert` **tamamen no-op** | `utils/alert.ts`: web'de toast + onay diyaloğu, native'de gerçek `Alert` |
| Tab navigator header'ında `useLocalSearchParams()` ekran parametrelerini görmez | `useGlobalSearchParams()` kullanın |
| `.expo/types/router.d.ts` yeni rota eklenince (eşzamanlı yazma) bozulabilir → `tsc` sözdizimi hatası | Dosyayı silin; Expo yeniden üretir |
| RN Web `TextInput`'ta Enter ile gönderim `onSubmitEditing` ile güvenilir değil | `onKeyPress` ile açıkça yakalayın + çift gönderim koruması |
| JS `toUpperCase()` Türkçe `i/İ`'yi bozar ("REDDEDILDI") | `toLocaleUpperCase('tr-TR')` |
| `is_admin !== 1` gibi katı karşılaştırmalar sürücüye göre kilitler | Modelde `boolean` cast |
| Otomasyon ortamında native JS diyalogları bastırılır | Uygulama içi diyalog kullanıldığı için sorun değil |

## Yeni bir API ucu eklerken kontrol listesi

1. Route `auth:sanctum` ve gerekiyorsa `IsAdmin`/`throttle` arkasında mı?
2. Sahiplik/katılımcılık kontrolü backend'de mi? (Başkasının kaydı için `403`/`404`)
3. Girdi doğrulaması (`validate`) ve Türkçe hata mesajları
4. Yanıtta gereksiz/özel alan var mı? (şifre, e-posta, telefon)
5. Liste uçları sayfalı mı ve `per_page` sınırlı mı? N+1 var mı (`with`/`withCount`)?
6. Hata durumunda `getMessage()` istemciye dönmüyor mu (`report($e)` + genel mesaj)?
7. Test: başarı, yetkisiz, yanlış kullanıcı, doğrulama hatası

## Düğme animasyonları
Yeni ortak bileşenler: metin girişi için `@/components/ui/text-input` (RN `TextInput` yerine), modal için `@/components/ui/animated-modal` (RN `Modal` yerine), formlarda `@/components/ui/form` (`FormError`, `ActionButton`, `PasswordInput`), süre/eğri/mesafe için `@/constants/motion`. Yalnızca `transform`/`opacity` animasyonu; zıplama, dönme, parlama yok.
Tüm düğmeler `TouchableOpacity`'yi **`react-native`'den değil `@/components/ui/touchable`'dan** içe aktarmalıdır (aynı özellikleri kabul eder). Bileşen boyuta göre hareket seçer: ikon düğmeleri (≤ 48 px) belirgin büyür, geniş satır/kartlar çok ince, ekran boyutlu alanlar (> 600×480) yalnızca opaklık değiştirir. Kartlar için `hoverLift` ver. Hero gibi özel durumlar için `AnimatedPressable` (`components/ui/motion.tsx`) ve giriş animasyonu için `FadeInUp` vardır. Web'de kalan `role="button"/"link"` öğeler ve renk geçişleri `utils/web-motion.ts` ile yönetilir.
