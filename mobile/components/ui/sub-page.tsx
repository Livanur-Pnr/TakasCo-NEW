import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SiteFooter, StorefrontHeader } from '@/components/web-storefront';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { useTheme } from '@/hooks/use-theme';
import { usePageTitle } from '@/utils/use-page-title';

interface SubPageProps {
  title: string;
  children: ReactNode;
  // Mobilde sabit alt çubuk, masaüstünde formun altında satır içi gösterilen ana eylem (Kaydet vb.)
  footer?: ReactNode;
  // Modal gibi, ScrollView dışında render edilmesi gereken öğeler
  overlay?: ReactNode;
  gap?: number;
  wide?: boolean;
}

// Ayarlar gibi hesap alt sayfaları için ortak iskelet:
// mobil -> geri butonlu başlık + kaydırılabilir içerik + sabit alt çubuk,
// masaüstü -> site header'ı + ortalanmış dar sütun (max 720px).
export function SubPage({ title, children, footer, overlay, gap = Spacing.six, wide = false }: SubPageProps) {
  const router = useRouter();
  const theme = useTheme();
  const isDesktopWeb = useIsDesktopWeb();
  usePageTitle(title);

  if (isDesktopWeb) {
    return (
      <ThemedView style={styles.container}>
        <StorefrontHeader />
        <ScrollView contentContainerStyle={[styles.desktopContent, wide && { maxWidth: 1000 }]}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
            style={styles.backLink}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <IconSymbol name="chevron.left" size={16} color={theme.textSecondary} />
            <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>Geri dön</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>{title}</ThemedText>
          <View style={{ gap }}>{children}</View>
          {footer}
          <SiteFooter />
        </ScrollView>
        {overlay}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri">
          <IconSymbol name="chevron.right" size={24} color={theme.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <ThemedText type="title" style={{ fontSize: 20, color: Brand.wordmark }}>{title}</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.four, gap }}>{children}</ScrollView>

      {!!footer && (
        <View style={[styles.footer, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>{footer}</View>
      )}
      {overlay}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: { padding: Spacing.four, paddingBottom: Spacing.six, borderTopWidth: 1 },
  desktopContent: { paddingHorizontal: Spacing.seven, paddingVertical: Spacing.six, maxWidth: 720, width: '100%', alignSelf: 'center', gap: Spacing.five },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: Radius.sm },
});
