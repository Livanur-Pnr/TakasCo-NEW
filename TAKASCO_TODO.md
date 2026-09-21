# TakasCo — Yapılacaklar Listesi (ana prompt'a göre)

Kaynak: master prompt'taki 27 faz + teknik kurallar. Durum: `[x]` bitti, `[ ]` yapılacak. Sıra = uygulama sırası.
Bitmiş olanlar burada tekrarlanmaz (bkz. TAKASCO_PROGRESS.md).

## A. Güvenlik / Backend kalitesi (Faz 1-4, 24-26, teknik kurallar)
- [x] A1. Hata mesajı sızıntısı: `ProductController` catch bloklarında `$e->getMessage()` istemciye dönüyor → genel mesaj + log.
- [x] A2. Backend testleri: auth (register/login), ürün sahipliği (update/delete başkasına yasak), favori tekilliği, ürün listesi filtre/sıralama.
- [x] A3. `.env` / `.gitignore` / gizli anahtar kontrolü; `APP_DEBUG`; mobil `API_BASE_URL` için env değişkeni (`EXPO_PUBLIC_API_URL`).
- [x] A4. Merkezi ağ/hata yönetimi (axios interceptor): 403/404/429/500/ağ yok için kullanıcıya anlamlı Türkçe mesaj (Faz 25).

## B. Web tasarım sistemi / UX (Faz 6, 16, 17)
- [x] B1. **Toast sistemi** — web'de `window.alert` kullanımı profesyonel değil; global Toast + onay diyaloğu bileşeni, `utils/alert.ts` bunun üstüne taşınır (Faz 17).
- [x] B2. Skeleton yükleme bileşeni (ürün grid'i için) — spinner yerine (Faz 16).
- [x] B3. 404 / bulunamadı ekranı (Faz 16, 22).

## C. Kalan ekranların masaüstü düzeni (Faz 20, 27)
- [x] C1. `(settings)` grubu: settings, profile-settings, address, change-password, privacy-policy.
- [x] C2. `user/[id].tsx` satıcı herkese açık profili.
- [x] C3. Auth ekranları (welcome/login/register) masaüstü düzeni.

## D. Ana sayfa / keşfet / ürün (Faz 8-11)
- [x] D1. Site footer'ı (masaüstü) — gerçek yasal sayfa linkleriyle.
- [x] D2. Ana sayfa bölümleri: "Nasıl Çalışır", "Döngüsel ekonomi" bandı, "Popüler ilanlar" (favori sayısına göre, gerçek veri).
- [x] D3. Ürün kartı ortak bileşeni + konum + göreli tarih ("2 gün önce") + durum rozeti (Faz 10).
- [x] D4. Keşfet: şehir filtresi + filtrelerin URL ile senkronu (yenilemede kaybolmaması) (Faz 9).
- [x] D5. Ürün detay: breadcrumb, paylaş (link kopyala), aynı satıcının diğer ilanları (Faz 11).

## E. Görsel sistemi (Faz 5, 24)
- [x] E1. Backend: thumbnail (400px) + medium varyantı üretimi, listelerde thumbnail kullanımı.
- [x] E2. Kırık görsel fallback + lazy loading.

## F. SEO / Erişilebilirlik (Faz 22, 23)
- [x] F1. Sayfa başlıkları (`<title>`) ve meta description — ürün/kategori/arama sayfaları.
- [x] F2. Klavye/odak: modal ESC ile kapanma, görünür focus halkası.

## G. Yeni büyük özellikler (Faz 17-21)
- [x] G1. Bildirimler: backend (tablo, trade olaylarında üretim, okundu işaretleme) + header zil ikonu/dropdown.
- [x] G2. (blok/şikayet hariç) Mesajlaşma: konuşma/mesaj tabloları, API, masaüstü sohbet ekranı.
- [x] G3. (özet, ilan moderasyonu, kullanıcı listesi; şikayet/rapor sistemi yok) Admin paneli: özet, ilan moderasyonu, kullanıcılar (mevcut `IsAdmin` middleware üzerinden).

## H. Dokümantasyon (Faz 26 / teknik kurallar)
- [x] H1. README.md güncelleme, TAKASCO_ARCHITECTURE.md, TAKASCO_DEVELOPMENT.md.

## Kapsam dışı / bilinçli olarak yapılmayacaklar
- Next.js'e geçiş (prompt açıkça yasakladı).
- Sahte istatistik/mock veri gösterimi.

## I. İkinci tur — prompt'ta olup hâlâ eksik kalanlar (sıra = uygulama sırası)
- [x] I1. Şikayet (rapor) sistemi + kullanıcı engelleme: backend (tablolar, API, mesajlaşma/teklifte engel kontrolü, admin şikayet kuyruğu, genel bakışta "bekleyen şikayet") + arayüz (ilan şikayet et, sohbette engelle, admin sekmesi).
- [x] I2. İlan düzenleme ekranı (`product/[id]/edit`; metin alanları + kategori. Fotoğraf değiştirme yok; takaslanmış/kaldırılmış ilan backend'de 409).
- [x] I3. Ana sayfada kural tabanlı "Şehrindeki İlanlar" (kullanıcının şehrine göre, gerçek veri).
- [x] I4. Performans: kategori/şehir listelerini önbellekleme (Cache::remember).
- [x] I5. Lint temizliği (`expo lint`) ve backend/istemci kod hijyeni.

## J. Üçüncü tur
- [x] J1. İlan düzenlemede fotoğraf ekleme/silme (`POST /products/{id}/images`; son fotoğraf silinemez, kapak silinirse sıradaki kapak olur; toplam en fazla 8).
- [x] J2. Admin'de kullanıcı askıya alma (`users.suspended_at`, `NotSuspended` middleware, giriş 403, tokenlar silinir; yönetici/kendi hesap askıya alınamaz). (İlan gizleme: J5.)
- [x] J3. Kayıtlı aramalar (`saved_searches`, `/api/saved-searches`, kullanıcı başı en fazla 10; uyan yeni ilan yayınlanınca uygulama içi bildirim, ilan sahibine gitmez, kişi başı tek bildirim). Arayüz: Keşfet'te "Bu aramayı kaydet", `/saved-searches` sayfası, bildirime tıklayınca ilana gider.
- [x] J4. E-posta bildirimi: teklif geldi / kabul edildi olaylarında (`users.email_notifications`, Ayarlar'dan kapatılır; e-postada iletişim bilgisi yok). Varsayılan `MAIL_MAILER=log`: gerçek gönderim için `.env`'de SMTP ayarı gerekir. Gönderim eşzamanlı; hata takas akışını bozmaz, kuyruğa alma yapılmadı.
- [x] J5. Askıdaki kullanıcının ilanları/profili herkese açık listelerden gizlenir (`Product::published()` kapsamı; ilan detayı ve profil 404, yalnızca sahibi/admin görür; teklif verilemez). Veri silinmez, askı kalkınca ilanlar geri gelir.
- [x] J6. Mesajlaşma gerçek zamanlılığı: WebSocket paketi kurulmadı (üçüncü taraf paket kurulumu kullanıcıya bırakıldı); bunun yerine artımlı polling (`?after=`) + arka planda duran `usePolling`. Reverb geçiş adımları `TAKASCO_ARCHITECTURE.md`'de.
- [x] J7. Elle doğrulama listesi hazırlandı: `TAKASCO_MANUAL_CHECKS.md` (tarayıcı/cihazda denenmesi gereken adımlar; bu turda kullanıcı talebiyle çalıştırılmadı).

## K. Yeni prompt boşlukları (yığın korunur: Expo/RN Web + Laravel; sahte veri yok)
Yeni "Full Responsive Web App" prompt'undaki, projede henüz olmayan maddeler. Next.js/Supabase/mock-veri istekleri mimari kararımız gereği uygulanmaz.
- [x] K1. Bilgi sayfaları: Hakkımızda, Nasıl Çalışır?, Güvenli Takas, SSS, İletişim, KVKK, Topluluk Kuralları (+ footer bağlantıları).
- [x] K2. Çerez onay bandı, engellenen kullanıcılar listesi, hesabı silme akışı (KVKK).
- [x] K3. İlan modeli: fiyat, satış/takas türü (satılık · takaslık · ikisi), marka, teslimat (kargo/elden); ilan ver + düzenle + kart/detay + filtre (fiyat, tür) + fiyat sıralaması.
- [x] K4. Takas: nakit farkı (ben öderim / karşı taraftan isterim), karşı teklif.
- [x] K5. Değerlendirmeler (tamamlanan takas sonrası) + satıcı kartında gerçek puan/istatistik + güven rozetleri (gerçek verilerden).
- [x] K6. İlan görüntülenme sayısı.
- [x] K7. Arama önerileri (`/api/search/suggestions`: gerçek ilan/kategori/marka) + son aramalar (tarayıcıda saklanır); yalnızca masaüstü başlık arama kutusunda.
- [x] K8. Şifremi unuttum (`/api/forgot-password`, `/api/reset-password`; e-posta için SMTP gerekir) ve SEO (`/sitemap.xml`, `/robots.txt` Laravel'den, ürün JSON-LD/canonical/og:image istemcide). Sınır: uygulama istemci taraflı render eder; arama motorları JS çalıştırmazsa ilan meta/JSON-LD'sini görmez (tam çözüm sunucu tarafı render/prerender gerektirir).
Bilinçli olarak yapılmayacaklar: Cüzdan/para çekme (gerçek ödeme altyapısı yok, sahte bakiye göstermeyiz), kimlik doğrulama rozeti (doğrulama süreci yok), Google/Apple girişi (üçüncü taraf OAuth kurulumu), çoklu ürünle teklif (K4 sonrası ayrıca değerlendirilir).
- [x] K9. Takas Eşleşmesi ("Sana Uygun Takaslar"): kullanıcının ilanlarındaki "takas beklentisi" ile başkalarının ilanlarını gerçek verilerle eşleştir (karşılıklı eşleşme öncelikli); Tekliflerim sayfasında göster, tek dokunuşla teklif ekranına git.
- [x] K10. Ana sayfada "Sana Özel" (gerçek sinyallerden: favoriler, kendi ilanların, kayıtlı aramalar; sinyal yoksa görünmez). Yalnızca masaüstü ana sayfada.
- [x] K11. Mobil arama ekranında öneriler + son aramalar (ortak `SearchSuggestions` bileşeni, `utils/recent-searches.ts`).
- [x] K12. İlan galerisinde yakınlaştırma: tam ekran galeride dokun-yakınlaştır (iki yönde kaydırma; iOS'ta ayrıca sıkıştırma).
- [x] K13. Onboarding: kayıttan sonra ilgi alanı (≤ 10 kategori) + şehir sorusu, "Şimdi değil" ile atlanabilir (`POST /api/user/onboarding`); ilgi alanları "Sana Özel" önerilerine +2 sinyal olarak girer. Yalnızca yeni kayıtta gösterilir, mevcut kullanıcılara sorulmaz.

## L. "Bilinçli yapılmayanlar" listesinden yapılabilenler
- [x] L1. Aynı teklifte çoklu ürün (en fazla 4 ürün: `trade_items`).
- [x] L2. E-posta doğrulama (Laravel doğrulama bağlantısı, `email_verified_at`) + "E-posta Doğrulandı" rozeti.
Hâlâ yapılmayanlar: WebSocket/Reverb ve Google-Apple girişi (üçüncü taraf paket kurulumu kullanıcıya bırakıldı), cüzdan (gerçek ödeme altyapısı yok), kimlik ve telefon doğrulama (belge/SMS süreci yok).
- [x] L3. Gerçek zamanlı mesajlaşma (Laravel Reverb / WebSocket): `MessageSent` olayı, `conversation.{id}` ve kişisel kanallar, Bearer token ile kanal yetkisi (`/api/broadcasting/auth`), istemcide Echo. Reverb kapalıysa ya da anahtar tanımsızsa polling aynen çalışır.
- [x] L4. Google ile giriş/kayıt (yalnızca web: Google Identity Services + backend'de yerel ID token doğrulaması, ek paket yok). Native (Expo Go/iOS/Android) Google girişi ve Apple girişi yapılmadı.
- [x] L5. Yayın hazırlığı: CORS yapılandırması (`config/cors.php`, `CORS_ALLOWED_ORIGINS`), güvenlik güncellemeleri (composer/npm), statik web derlemesi doğrulandı (`expo export -p web`), `TAKASCO_DEPLOYMENT.md` yayın rehberi. Canlı ortamda yapılacaklar rehberdeki kontrol listesinde.

## M. Profesyonelleştirme turu
- [x] M1. Mesajlaşma cilası: zil bildirimleri gerçek zamanlı, "yazıyor…", okundu işareti (✓/✓✓), eski mesajları yükleme.
- [x] M2. Mobil ana sayfa: Sana Özel / Popüler / Şehrindeki İlanlar (masaüstü ile eşitlik).
- [x] M3. İlan verme: fotoğraf küçültme (web), sıralama/kapak yap, yükleme ilerlemesi, taslak saklama.
- [x] M4. Profil: "hakkında" yazısı ve herkese açık profilde Aktif / Takaslananlar / Değerlendirmeler sekmeleri.
- [x] M5. Yönetim: değerlendirme silme, yönetici işlem kaydı.
- [x] M6. İlan yaşam döngüsü: Rezerve, süre dolumu + yenileme.
- [x] N1. Hareket/animasyon: ana sayfa karşılama bölümü (sıralı giriş, dönen takas oku, yayılan halkalar, süzülen noktalar, yaylı animasyonlu düğmeler + hover'da kayan ok), tüm web sitesinde ortak düğme/kart hareketi (`utils/web-motion.ts`: hover büyüme, basınca küçülme, kartlarda yükselme). "Hareketi azalt" ayarında kapanır. Ek paket yok (React Native `Animated`).
- [x] N2. Tüm düğmelerde animasyon: `components/ui/touchable.tsx` (46 dosyada 204 düğme; `TouchableOpacity`'nin yerine geçer, yaylı ölçek + opaklık, boyuta göre ayarlanan hareket, kartlarda yükselme, "hareketi azalt" desteği), favori kalbi "pat" animasyonu (`heart-icon.tsx`), web'de yumuşak renk geçişleri. Yeni düğmeler `@/components/ui/touchable`'dan içe aktarılmalı.
- [x] N3. Premium hareket revizyonu: merkezi hareket ölçüleri (`constants/motion.ts`); düğme hover/basma (`touchable.tsx`, zıplama/dönme yok, en fazla 1–2px yükselme, 0.97–0.99 basma); `AppTextInput` (`components/ui/text-input.tsx`, 40 alan: hover/odak halkası/hata/başarılı); `AnimatedModal` (rapor, değerlendirme, karşı teklif, zil paneli, fotoğraf menüsü, onay diyaloğu); animasyonlu bildirim kartları (sağdan giriş, kalan süre çizgisi, tür ikonları); vitrin hero karuseli (`hero-carousel.tsx`: çapraz geçiş, otomatik oynatma, hover'da duraklama, ilerleme çubuğu, gerçek ilanlar); giriş/kayıt (giriş animasyonu, `FormError`, `ActionButton` yükleniyor→başarılı, şifre göster/gizle); ana sayfa/keşfet ızgarasında sıralı giriş (en fazla 6 kart), teklifler sekmesinde kayan gösterge ve içerik geçişi, yeni mesaj girişi, boş/hata durumu girişi, daha yumuşak iskelet, galeri/önizleme görsellerinde `FadeImage`, ilan düzenlemede kaydet yükleniyor→başarılı; karşılama ekranı (logo→başlık→açıklama→çipler→düğmeler sıralı giriş); tüm sayfalarda sayfa girişi (`SubPage`, etkinlik/profil/teklif/ilan ekle/ilan detay/onboarding/şifre ekranları), `Stagger` ile liste girişi (favoriler, ilanlarım, takaslarım, bildirimler, konuşmalar), `Collapsible` dönen ok, çerez şeridi girişi; sekme geçişi (fade), menü alt çizgisi, alt bilgi bağlantıları, ürün kartı görsel yakınlaşma + yüklenince belirme; "hareketi azalt" desteği.
- [x] N4. Giriş/kimlik doğrulama premium yeniden tasarımı: `components/auth/` (`AuthShell`: masaüstünde bölünmüş marka paneli + form kartı, tablette ortalanmış kart, telefonda kompakt kartsız form; `AuthField`: etiket + ikon + tek kenarlıklı alan, hover/odak/hata, şifre göster/gizle; `FeatureChips`), premium `ActionButton` (marka gradyanı, hover gölge/yükselme, ok kayması, yükleniyor metni, `outline` varyantı), gradyan/gölge token'ları (`Gradient`, `Shadow.authCard`), çok yavaş ortam hareketi (yalnızca transform, hareket azaltmada kapalı); masaüstü marka paneli sahnesi (`brand-scene.tsx`: telefon içinde TakasCo arayüzü, 12 sn'lik döngüde bildirim → mesaj → takas teklifi → "Takas tamamlandı", yavaş dönen takas halkası, ızgara + ışık lekeleri). Karşılama, giriş, kayıt, şifre unuttum/sıfırla ekranları aynı iskeleti kullanır; giriş/kayıt arasında ve karşılamaya geri dönüş bağlantıları eklendi. API/doğrulama/yönlendirme mantığı değişmedi.
