import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SubPage } from '@/components/ui/sub-page';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Hizmetin Tanımı',
    body: 'TakasCo, kullanıcıların kullanmadıkları eşyaları ilan olarak yayınlayıp başka kullanıcıların eşyalarıyla değiştirebildiği (takas) bir platformdur. TakasCo yalnızca kullanıcıları bir araya getiren aracı bir hizmettir; takas edilen ürünlerin tarafı değildir ve ürünlerin satıcısı ya da alıcısı konumunda bulunmaz.',
  },
  {
    title: '2. Üyelik ve Hesap Güvenliği',
    body: 'Üyelik için doğru ve güncel bilgi vermeniz gerekir. Hesabınızın ve şifrenizin güvenliğinden siz sorumlusunuz; şifrenizi başkalarıyla paylaşmamalısınız. Hesabınız üzerinden yapılan işlemler sizin tarafınızdan yapılmış sayılır. Hesabınızın yetkisiz kullanıldığından şüphelenirseniz şifrenizi hemen değiştirmelisiniz.',
  },
  {
    title: '3. İlan Verme Kuralları',
    body: 'Yalnızca kendinize ait ve yasal olarak takas edilebilir ürünleri ilan edebilirsiniz. İlan başlığı, açıklaması ve fotoğrafları ürünü doğru yansıtmalıdır. Yasa dışı, çalıntı, sahte (taklit), tehlikeli veya yürürlükteki mevzuatla satışı ya da devri yasaklanmış ürünlerin, canlı hayvanların, silah ve benzeri araçların ilanı yasaktır. Başkalarına ait fotoğrafları izinsiz kullanamazsınız.',
  },
  {
    title: '4. Takas Süreci',
    body: 'Bir takas teklifi karşı tarafça kabul edildiğinde iki ürün de “takaslandı” durumuna geçer ve tarafların iletişim bilgileri paylaşılır. Ürünün teslimi, buluşma yeri ve zamanı taraflar arasında kararlaştırılır. Ürünü teslim almadan önce durumunu kontrol etmenizi, buluşmalarda güvenliğinizi gözetmenizi ve kalabalık, herkese açık yerleri tercih etmenizi öneririz. TakasCo, tarafların birbirine karşı yükümlülüklerinden veya ürünlerin ayıplı çıkmasından sorumlu değildir.',
  },
  {
    title: '5. Yasaklı Davranışlar',
    body: 'Diğer kullanıcıları yanıltmak, dolandırmak, rahatsız etmek veya taciz etmek; platformun işleyişini bozmaya yönelik otomatik araçlar kullanmak; başkasının hesabına izinsiz erişmeye çalışmak ve sahte hesap açmak yasaktır. Bu kuralların ihlali halinde ilan kaldırılabilir veya hesap askıya alınabilir ya da kapatılabilir.',
  },
  {
    title: '6. Kişisel Veriler',
    body: 'Kişisel verilerinizin nasıl işlendiği Gizlilik Politikası’nda açıklanmıştır. Platformu kullanarak bu politikayı okuduğunuzu kabul etmiş olursunuz.',
  },
  {
    title: '7. Sorumluluğun Sınırlandırılması',
    body: 'TakasCo hizmeti “olduğu gibi” sunulur; kesintisiz veya hatasız çalışacağı garanti edilmez. Kullanıcılar arasındaki uyuşmazlıklardan, ilan içeriklerinin doğruluğundan ve takas edilen ürünlerden kaynaklanan zararlardan, kanunen sorumlu tutulabileceğimiz haller dışında sorumluluk kabul edilmez.',
  },
  {
    title: '8. Değişiklikler',
    body: 'Bu koşullar zaman zaman güncellenebilir. Güncel metin her zaman bu sayfada yayınlanır; önemli değişiklikler uygulama üzerinden duyurulur. Değişiklikten sonra platformu kullanmaya devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir.',
  },
];

export default function TermsScreen() {
  const theme = useTheme();

  return (
    <SubPage title="Kullanım Koşulları" gap={Spacing.four}>
      <ThemedText style={[styles.paragraph, { color: theme.textSecondary }]}>
        TakasCo’yu kullanarak aşağıdaki koşulları kabul etmiş olursunuz. Lütfen platformu kullanmadan önce dikkatle okuyun.
      </ThemedText>
      {SECTIONS.map((section) => (
        <View key={section.title} style={{ gap: Spacing.two }}>
          <ThemedText style={styles.title}>{section.title}</ThemedText>
          <ThemedText style={[styles.paragraph, { color: theme.textSecondary }]}>{section.body}</ThemedText>
        </View>
      ))}
      <View style={{ height: Spacing.eight }} />
    </SubPage>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: 'bold', marginTop: Spacing.two },
  paragraph: { fontSize: 14, lineHeight: 22 },
});
