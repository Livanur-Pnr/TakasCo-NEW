import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function prefersReducedMotion(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Yüklenirken içeriğin yerini tutan, nabız gibi atan gri blok (azaltılmış hareket tercihinde sabit kalır)
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: theme.backgroundSelected, opacity }, style]} />;
}

// Ana sayfa / keşfet ürün ızgarası için iskelet: gerçek kartla aynı ölçüde olduğundan içerik gelince zıplama olmaz
export function ProductGridSkeleton({ numColumns, horizontalPadding = Spacing.four, count }: { numColumns: number; horizontalPadding?: number; count?: number }) {
  const theme = useTheme();
  const total = count ?? numColumns * 3;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="İlanlar yükleniyor"
      style={[styles.grid, { paddingHorizontal: horizontalPadding - Spacing.two }]}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ width: `${100 / numColumns}%`, padding: Spacing.two }}>
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Skeleton style={styles.image} />
            <View style={styles.body}>
              <Skeleton style={[styles.line, { width: '70%' }]} />
              <Skeleton style={[styles.line, { width: '45%', height: 10 }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: Spacing.four },
  card: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  image: { height: 120 },
  body: { padding: Spacing.three, gap: Spacing.two },
  line: { height: 14, borderRadius: Radius.sm },
});
