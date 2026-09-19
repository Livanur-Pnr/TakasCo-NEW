import { StyleSheet } from 'react-native';
import { Spacing, Radius } from '@/constants/theme';

// "Favorilerim" / "İlanlarım" / "Takaslarım" gibi hesap alt sayfalarının
// masaüstü web görünümünde ortak kullandığı stiller.
export const desktopActivityStyles = StyleSheet.create({
  page: { paddingHorizontal: Spacing.seven, paddingVertical: Spacing.six, maxWidth: 1200, width: '100%', alignSelf: 'center', gap: Spacing.five },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  emptyState: { alignItems: 'center', padding: Spacing.eight },
  ctaButton: { marginTop: Spacing.four, paddingHorizontal: Spacing.six, paddingVertical: Spacing.three, borderRadius: Radius.full },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  gridCard: { width: 220, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  gridImageWrap: { height: 160, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  removeBadge: { position: 'absolute', top: Spacing.two, right: Spacing.two, borderRadius: Radius.full, padding: 7, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  cardGridItem: { flexBasis: 420, flexGrow: 1 },
});
