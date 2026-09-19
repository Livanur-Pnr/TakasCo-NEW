export interface InfoSection { title?: string; body: string }
export interface InfoPageContent { title: string; description: string; sections: InfoSection[] }

// İletişim e-postası yalnızca EXPO_PUBLIC_CONTACT_EMAIL tanımlıysa gösterilir (uydurma adres yazılmaz).
export const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL ?? '';

export const INFO_PAGES: Record<string, InfoPageContent> = {
  hakkimizda: {
    title: 'Hakkımızda',
    description: 'TakasCo, kullanmadığın eşyaları takas ederek yeniden değerlendirmeni sağlayan bir platformdur.',
    sections: [
      { body: 'TakasCo, insanların kullanmadıkları eşyaları başka kullanıcıların eşyalarıyla değiştirebildiği (takas) bir platformdur. Amacımız, ihtiyaç duymadığın bir ürünün başkası için değerli olabileceği fikrinden yola çıkarak eşyaların ikinci bir hayat bulmasını kolaylaştırmaktır.' },
      { title: 'Neye inanıyoruz?', body: 'Yeni bir şey almak yerine var olanı değiştirmek hem bütçeni hem de doğayı korur. Bu yüzden takası platformun merkezine koyduk: ilan verir, teklif alır, teklif gönderir ve anlaşırsın.' },
      { title: 'Güven', body: 'Kullanıcılar birbirini şikayet edebilir ve engelleyebilir, ilanlar moderasyon ekibi tarafından incelenebilir. Ayrıntılar için Güvenli Takas sayfasına bakabilirsin.' },
    ],
  },
  'nasil-calisir': {
    title: 'Nasıl Çalışır?',
    description: "TakasCo'da ilan verme, teklif gönderme ve takası tamamlama adımları.",
    sections: [
      { title: '1. İlan ver', body: 'Fotoğraflarını yükle, ürünü anlat ve karşılığında ne istediğini yaz. İlanın yayına girer.' },
      { title: '2. Keşfet ve teklif gönder', body: 'Beğendiğin bir ilan bulduğunda kendi ilanlarından birini teklif et. İstersen satıcıya önce mesaj yazarak sorularını sorabilirsin.' },
      { title: '3. Teklifi yönet', body: 'Gelen teklifleri Takaslarım sayfasından kabul edebilir veya reddedebilirsin. Gönderdiğin bekleyen teklifi geri çekebilirsin. Her gelişmede bildirim alırsın.' },
      { title: '4. Buluş ve teslim et', body: 'Teklif kabul edildiğinde iki ürün de "takaslandı" durumuna geçer ve tarafların iletişim bilgileri paylaşılır. Teslimatı taraflar kendi aralarında planlar.' },
    ],
  },
  'guvenli-takas': {
    title: 'Güvenli Takas',
    description: "Takas yaparken kendini korumak için öneriler ve TakasCo'nun güvenlik araçları.",
    sections: [
      { title: 'Buluşurken', body: 'Kalabalık ve herkese açık yerleri tercih et, mümkünse gündüz saatlerinde buluş. Ürünü teslim almadan önce çalışır durumda olduğunu ve ilandaki gibi olduğunu kontrol et.' },
      { title: 'Ödeme ve kişisel bilgi', body: 'Takas için ön ödeme, kapora veya banka bilgisi isteyen kullanıcılara karşı dikkatli ol. Kişisel bilgilerini yalnızca takası tamamlamak için gerektiği kadar paylaş.' },
      { title: 'Platform araçları', body: 'Şüpheli bir ilan veya kullanıcı gördüğünde "Şikayet Et" ile bildir. İstemediğin kullanıcıyı engelleyebilirsin; engellenen kullanıcılarla mesajlaşma ve takas kapanır. Kurallara aykırı ilanlar kaldırılabilir, hesaplar askıya alınabilir.' },
      { title: 'Önemli', body: 'TakasCo tarafların birbirine karşı yükümlülüklerinden sorumlu değildir; bu yüzden kendi güvenliğin için yukarıdaki önerilere uymanı öneririz.' },
    ],
  },
  sss: {
    title: 'Sık Sorulan Sorular',
    description: 'TakasCo hakkında sık sorulan sorular ve yanıtları.',
    sections: [
      { title: 'TakasCo ücretli mi?', body: 'İlan vermek ve takas teklifi göndermek için şu anda herhangi bir ücret alınmamaktadır.' },
      { title: 'Bir teklif kabul edilince ne olur?', body: 'Takasa konu iki ürün de "takaslandı" olur, ürünlere gelen diğer bekleyen teklifler otomatik reddedilir ve iki tarafa iletişim bilgileri gösterilir.' },
      { title: 'Gönderdiğim teklifi geri alabilir miyim?', body: 'Evet. Karşı taraf yanıt vermediği sürece Takaslarım sayfasından teklifi iptal edebilirsin.' },
      { title: 'İlanımı düzenleyebilir miyim?', body: 'Evet. İlan sayfasındaki kalem simgesinden başlık, açıklama, kategori ve fotoğrafları değiştirebilirsin. Takaslanmış veya kaldırılmış ilanlar düzenlenemez.' },
      { title: 'Bir kullanıcıyı nasıl şikayet eder veya engellerim?', body: 'İlan sayfasındaki bayrak simgesiyle ilanı, sohbet ekranından ya da kullanıcının profilinden kullanıcıyı şikayet edebilirsin. Sohbet ekranındaki "Engelle" düğmesiyle mesajlaşmayı ve takası kapatabilirsin.' },
      { title: 'E-posta bildirimlerini kapatabilir miyim?', body: 'Evet. Ayarlar sayfasındaki "E-posta bildirimleri" anahtarından kapatabilirsin.' },
    ],
  },
  'topluluk-kurallari': {
    title: 'Topluluk Kuralları',
    description: "TakasCo'da ilan verirken ve iletişim kurarken uyulması gereken kurallar.",
    sections: [
      { title: 'İlanlar', body: 'Yalnızca sana ait ve yasal olarak devredilebilir ürünleri ilan et. Fotoğraf ve açıklama ürünü doğru yansıtmalı; başkasına ait fotoğrafları izinsiz kullanma. Sahte, çalıntı, tehlikeli veya yasaklı ürünler, canlı hayvan, silah ve benzeri araçlar yasaktır.' },
      { title: 'İletişim', body: 'Diğer kullanıcılara saygılı davran. Taciz, hakaret, tehdit ve spam kabul edilmez.' },
      { title: 'Güvenlik', body: 'Dolandırıcılık girişimleri, sahte hesaplar ve platformu kötüye kullanmaya yönelik otomatik araçlar yasaktır.' },
      { title: 'Yaptırımlar', body: 'Kurallara aykırı ilanlar kaldırılabilir, tekrarlayan veya ağır ihlallerde hesap askıya alınabilir.' },
    ],
  },
  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    description: 'Kişisel verilerin işlenmesine ilişkin aydınlatma metni.',
    sections: [
      { title: 'Veri sorumlusu', body: 'Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında TakasCo platformunu işleten veri sorumlusu tarafından yayımlanmıştır.' },
      { title: 'İşlenen veriler', body: 'Ad, e-posta, telefon numarası, şehir/ilçe/adres bilgisi, profil fotoğrafı, ilan içerikleri, mesajlar, takas teklifleri ve platform kullanım kayıtları.' },
      { title: 'İşleme amaçları', body: 'Üyelik ve giriş işlemlerinin yürütülmesi, ilan ve takas hizmetinin sunulması, kullanıcılar arasında iletişimin sağlanması, güvenliğin ve kötüye kullanımın önlenmesi, yasal yükümlülüklerin yerine getirilmesi.' },
      { title: 'Aktarım', body: 'Telefon ve e-posta bilgin yalnızca bir takas teklifi kabul edildiğinde takasın diğer tarafıyla paylaşılır. Verilerin yasal zorunluluk dışında üçüncü taraflara satılması söz konusu değildir.' },
      { title: 'Haklarınız', body: "KVKK'nın 11. maddesi uyarınca verilerinin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme haklarına sahipsin. Hesabını Ayarlar sayfasından silebilirsin; silinen hesabın kişisel verileri sistemden kaldırılır." },
    ],
  },
  iletisim: {
    title: 'İletişim',
    description: 'TakasCo ile iletişime geçme yolları.',
    sections: [
      { body: 'Bir ilan veya kullanıcıyla ilgili sorunlar için en hızlı yol, ilgili ilanda veya sohbette yer alan "Şikayet Et" düğmesidir; şikayetler yönetim ekibinin moderasyon kuyruğuna düşer.' },
    ],
  },
};
