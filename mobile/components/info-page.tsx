import { Linking, StyleSheet, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SubPage } from '@/components/ui/sub-page';
import { CONTACT_EMAIL, INFO_PAGES } from '@/content/info-pages';
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
      {slug === 'iletisim' && !!CONTACT_EMAIL && (
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} accessibilityRole="link">
          <ThemedText style={{ color: Brand.accent, fontWeight: '700' }}>{CONTACT_EMAIL}</ThemedText>
        </TouchableOpacity>
      )}
    </SubPage>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
});
