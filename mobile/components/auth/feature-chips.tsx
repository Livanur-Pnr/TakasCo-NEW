import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Radius, Spacing } from '@/constants/theme';

const POINTS = [
  { label: 'Takas et', icon: 'arrow.left.arrow.right' },
  { label: 'Keşfet', icon: 'magnifyingglass' },
  { label: 'İsrafı önle', icon: 'checkmark.circle.fill' },
] as const;

// "Takas et · Keşfet · İsrafı önle" çipleri. `dark`: koyu yeşil marka paneli üstünde, `light`: açık zeminde.
// Hover (yalnızca fareli cihazlarda, utils/web-motion.ts): 1px yükselme, zemin/kenarlık geçişi, ikonda küçük büyüme.
export function FeatureChips({ tone = 'light', align = 'center' }: { tone?: 'light' | 'dark'; align?: 'center' | 'flex-start' }) {
  const dark = tone === 'dark';
  return (
    <View style={[styles.row, { justifyContent: align }]} accessibilityRole="list">
      {POINTS.map((p) => (
        <View
          key={p.label}
          accessibilityRole="text"
          {...({ dataSet: { chip: tone } } as any)}
          style={[styles.chip, dark ? styles.dark : styles.light]}
        >
          <View {...({ dataSet: { chipicon: 'true' } } as any)}>
            <IconSymbol name={p.icon} size={14} color={dark ? '#a7f3d0' : Brand.accent} />
          </View>
          <ThemedText style={[styles.label, { color: dark ? '#ffffff' : Brand.wordmark }]}>{p.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.three, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1 },
  dark: { backgroundColor: 'rgba(255, 255, 255, 0.10)', borderColor: 'rgba(255, 255, 255, 0.22)' },
  light: { backgroundColor: 'rgba(255, 255, 255, 0.85)', borderColor: 'rgba(27, 122, 67, 0.22)' },
  label: { fontSize: 13, fontWeight: '600' },
});
