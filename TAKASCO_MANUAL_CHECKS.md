# TakasCo — Elle Doğrulama Listesi

> Durum: Bu listedeki adımlar kullanıcı tarafından denendi; hata bildirilmedi (yalnızca `/categories` önbellek hatası bulundu ve düzeltildi). Yayına çıkmadan önceki `.env` maddeleri hâlâ yapılacak.

Otomatik testlerin (backend 104 test, `tsc`, `expo lint`) kapsamadığı, tarayıcıda/cihazda gözle denenmesi gereken adımlar.
Hazırlık: `cd backend && php artisan serve`, `cd mobile && npx expo start --web`. İki tarayıcı profili (A ve B kullanıcısı) ve bir admin hesabı kullan.

## Genel (masaüstü web, ≥ 900 px)
- [ ] Ana sayfa: header, kategori çubuğu, "Popüler İlanlar", şehri kayıtlı kullanıcıda "<şehir> Şehrindeki İlanlar" satırı görünüyor; şehirsiz kullanıcıda görünmüyor.
- [ ] İlan detayı: **Bağlantıyı kopyala** düğmesi panoya kopyalıyor ve "Bağlantı panoya kopyalandı" bildirimi çıkıyor (gerçek tıklama gerekir).
- [ ] Sohbet: gerçek klavyede **Enter** mesaj gönderiyor, Shift+Enter göndermiyor.

## Mobil genişlik (< 900 px) ve cihaz
- [ ] Ana sayfa, Keşfet, İlan detayı, Mesajlar, Bildirimler, Ayarlar, Kayıtlı Aramalar, İlanı Düzenle, Yönetim ekranları taşma/kesilme olmadan görünüyor.
- [ ] Expo Go (iOS/Android): giriş, ilan verme (fotoğraf seçici), takas teklifi, mesajlaşma çalışıyor.

## Yeni özellikler
- [ ] **Şikayet:** B kullanıcısı A'nın ilanında "Şikayet Et" → sebep seç → gönder. Aynı ilanı tekrar şikayet edince uyarı çıkıyor. Admin > Şikayetler'de kayıt görünüyor; "Çözüldü" ile kuyruktan düşüyor.
- [ ] **Engelleme:** Sohbette "Engelle" → onay → mesaj kutusu kapanıyor; karşı tarafta "mesaj gönderemezsin" yazısı. "Engeli Kaldır" ile açılıyor.
- [ ] **İlan düzenleme:** İlan sahibinde kalem simgesi görünüyor; başlık/kategori değişince ilan sayfasında yansıyor. Fotoğraf ekle/sil çalışıyor, son fotoğrafta silme düğmesi yok. Takaslanmış ilanda kalem yok.
- [ ] **Kayıtlı arama:** Keşfet'te bir filtre seç → "Bu aramayı kaydet". Başka kullanıcı uyan ilan yayınlayınca bildirim geliyor, tıklayınca ilana gidiyor. Profil > Kayıtlı Aramalarım'dan silinebiliyor.
- [ ] **E-posta:** `.env`'ye SMTP yazılırsa teklif geldiğinde e-posta gidiyor; Ayarlar'da anahtar kapatılınca gitmiyor. (Varsayılan `MAIL_MAILER=log` → `storage/logs/laravel.log`.)
- [ ] **Askıya alma:** Admin > Kullanıcılar'da bir kullanıcıyı askıya al → o kullanıcı giriş yapamıyor, ilanları Keşfet'ten kayboluyor; askıyı kaldırınca geri geliyor.
- [ ] **Polling:** Sekme arka plandayken ağ isteği atılmıyor (DevTools > Network); öne gelince hemen yenileniyor. Açık sohbette karşı tarafın mesajı ≤ 5 sn'de görünüyor.

## Yeni prompt özellikleri (K grubu)
- [ ] **Bilgi sayfaları:** footer ve Ayarlar > Yardım ve Bilgi bağlantıları açılıyor; çerez bandı ilk ziyarette çıkıyor, "Anladım" sonrası çıkmıyor.
- [ ] **Hesap:** Ayarlar > Engellenen Kullanıcılar listesi/engel kaldırma; Hesabı Sil (yanlış şifre reddediliyor, doğru şifreyle çıkış yapılıyor, tekrar giriş yapılamıyor).
- [ ] **İlan türü/fiyat:** İlan ver ve Düzenle'de Satmak / Takas / İkisi seçimi; satılık ilanda takas alanı gizli, kartta fiyat ve rozet; satılık ilanda "Takas Teklifi" yok, "Satıcıya Mesaj Gönder" var. Keşfet'te ilan türü, fiyat aralığı ve fiyat sıralaması çalışıyor.
- [ ] **Nakit farkı/karşı teklif:** teklife para farkı ekle; alıcı "Karşı Teklif" ile ürünü/tutarı değiştirip gönderiyor; ilk gönderen karşı teklifi kabul edince iki ürün de takaslandı oluyor.
- [ ] **Değerlendirme:** kabul edilen takasta "Karşı tarafı değerlendir" → yıldız + yorum; ikinci kez değerlendirilemiyor; profilde yorum ve ortalama, satıcı kartında rozetler görünüyor.
- [ ] **Görüntülenme:** ilan sayfası başka kullanıcıyla açılınca sayı artıyor, yenilemede artmıyor, kendi ilanında artmıyor.
- [ ] **Arama önerileri:** masaüstü başlık arama kutusunda 2+ harf yazınca öneri listesi açılıyor (başlık/kategori/marka), boşken son aramalar; liste sayfa içeriğinin altında kalmıyor.
- [ ] **Şifre sıfırlama:** Giriş > Şifremi unuttum → e-posta (log'da bağlantı) → bağlantı yeni şifre ekranını açıyor; bağlantı ikinci kez çalışmıyor. Giriş yapmamış kullanıcıda `/reset-password` bağlantısı doğrudan açılıyor (yönlendirme engellemiyor).
- [ ] **SEO:** `/sitemap.xml` ve `/robots.txt` (Laravel adresinde) doğru alan adını gösteriyor; ilan sayfasında `<head>` içinde JSON-LD ve canonical var.

- [ ] **Takas eşleşmesi:** iki kullanıcıda karşılıklı tamamlayan ilanlar aç (A: "PlayStation", bekleyen "Steam Deck"; B: "Steam Deck", bekleyen "PlayStation"); A'nın Tekliflerim sayfasında "Sana Uygun Takaslar" ve "KARŞILIKLI" rozeti çıkıyor, karta dokununca teklif ekranı kendi ilanı seçili açılıyor; eşleşme yoksa bölüm hiç görünmüyor.

- [ ] **Sana Özel:** giriş yapmış ve bir ilanı favorilemiş kullanıcıda masaüstü ana sayfada "Sana Özel" satırı aynı kategoriden başka ilanlarla çıkıyor; hiç favorisi/kayıtlı araması olmayan yeni kullanıcıda ve misafirde görünmüyor (misafirde 401/yönlendirme olmamalı).

- [ ] **Onboarding:** yeni kayıttan sonra `/onboarding` açılıyor; kategori seçip "Kaydet ve Devam Et" → ana sayfa, "Sana Özel" seçilen kategorilerden ilan gösteriyor; "Şimdi değil" atlıyor; mevcut hesapla girişte gösterilmiyor.
- [ ] **Galeri yakınlaştırma:** ilan fotoğrafına dokun → tam ekran → tekrar dokununca 2,5x yakınlaşıyor, iki yönde kaydırılıyor; yakınlaşmışken fotoğraflar arası geçiş kilitli, uzaklaşınca açılıyor; galeri kapatılıp açılınca sıfırlanıyor.
- [ ] **Mobil arama önerileri:** Keşfet ekranında arama kutusuna dokun → son aramalar; 2+ harf → öneriler; öneriye dokunma çalışıyor ve liste klavye/blur sonrası kapanıyor.

- [ ] **Çoklu ürün teklifi:** teklif ekranında birden fazla kendi ilanını seç (en fazla 4, beşincide uyarı), gönder; alıcı Tekliflerim'de "(+N)" ve "Ayrıca teklife dahil: ..." görüyor; kabul edilince tüm ürünler takaslandı oluyor.
- [ ] **E-posta doğrulama:** yeni kayıtta log'da doğrulama bağlantısı var; bağlantı açılınca `/email-verified` sayfası çıkıyor ve Ayarlar'da "doğrulandı", profilde rozet görünüyor; profilde e-posta değiştirince doğrulama sıfırlanıyor; Ayarlar > "Bağlantı Gönder" çalışıyor.

- [ ] **Gerçek zamanlı mesaj:** iki tarayıcıda iki kullanıcıyla sohbet aç (Reverb çalışırken); bir taraf yazınca diğerinde ≤ 1-2 sn'de görünüyor, header rozeti ve sohbet listesi anında güncelleniyor. Reverb penceresini kapatınca mesajlar yine ≤ 5 sn'de geliyor (polling yedeği). Başka bir kullanıcının konuşma kanalına abone olunamıyor (DevTools > Network'te `broadcasting/auth` 403).

## Üretime çıkmadan
- [ ] `.env`: `APP_ENV=production`, `APP_DEBUG=false`, gerçek `APP_URL`, SMTP, `EXPO_PUBLIC_API_URL`.
- [ ] İlk admin hesabı veritabanında elle `is_admin=1` yapılır.
- [ ] `php artisan images:thumbnails` eski ilanlar için bir kez çalıştırılır.
