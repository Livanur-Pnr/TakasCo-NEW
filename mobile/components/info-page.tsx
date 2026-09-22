import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ContactForm } from '@/components/contact-form';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SubPage } from '@/components/ui/sub-page';
import { INFO_PAGES } from '@/content/info-pages';
import { usePageTitle } from '@/utils/use-page-title';

// Statik bilgi sayfaları için ortak iskelet (metinler content/info-pages.ts içinde)
export function InfoPage({ slug }: { slug: string }) {
  const theme = useTheme();
  const page = INFO_PAGES[slug];
  usePageTitle(page.title, page.description);

  return (
    <SubPage title={page.title}>
      {page.sections.map((s, i) => (
        <View key={i} style={styles.section}>
          {!!s.title && <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>{s.title}</ThemedText>}
          <ThemedText style={{ color: theme.textSecondary, lineHeight: 22 }}>{s.body}</ThemedText>
        </View>
      ))}
      {slug === 'iletisim' && <ContactForm />}
    </SubPage>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
});
