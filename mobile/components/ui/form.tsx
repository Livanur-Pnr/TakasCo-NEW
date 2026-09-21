import { ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useReducedMotion } from '@/components/ui/motion';
import { TouchableOpacity } from '@/components/ui/touchable';
import { Brand, Gradient, Radius, Spacing } from '@/constants/theme';
import { Distance, Duration, Ease } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

// Form hata mesajı: görününce yumuşakça belirir ve yukarıdan kısa kayarak yerine oturur (sıçrama/sarsıntı yok).
export function FormError({ message }: { message?: string | null }) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) {
      value.setValue(0);
      return;
    }
    if (reduced) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    Animated.timing(value, { toValue: 1, duration: Duration.normal, easing: Ease.decelerate, useNativeDriver: true }).start();
  }, [message, reduced, value]);

  if (!message) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [-Distance.xs, 0] }) }] }}
    >
      <IconSymbol name="exclamationmark.triangle.fill" size={16} color={Brand.danger} />
      <ThemedText style={{ color: Brand.danger, fontSize: 13, flex: 1 }}>{message}</ThemedText>
    </Animated.View>
  );
}

export type ActionStatus = 'idle' | 'loading' | 'success';

// Ana eylem düğmesi: boşta → yükleniyor (boyut değişmez) → başarılı (kısa onay işareti). Devre dışıyken hover/basma hareketi yoktur.
// Varyantlar: primary (marka gradyanı, hover'da gölge + 1px yükselme), secondary, danger, outline (ikincil CTA: çerçeveli).
// `arrow`: sağda küçük ok; hover'da 3px sağa kayar. `loadingLabel`: yüklenirken iğnenin yanında gösterilen metin.
export function ActionButton({ label, status = 'idle', onPress, disabled, variant = 'primary', style, icon, arrow, loadingLabel }: { label: string; status?: ActionStatus; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger' | 'outline'; style?: StyleProp<ViewStyle>; icon?: ReactNode; arrow?: boolean; loadingLabel?: string }) {
  const theme = useTheme();
  const busy = status === 'loading';
  const done = status === 'success';
  const outline = variant === 'outline';
  const bg = outline ? '#ffffff' : variant === 'primary' ? Brand.accent : variant === 'danger' ? Brand.danger : theme.backgroundSelected;
  const fg = outline ? Brand.wordmark : variant === 'secondary' ? theme.text : '#fff';
  const gradient = Platform.OS === 'web' && variant === 'primary' && !done ? ({ backgroundImage: Gradient.cta } as any) : null;

  return (
    <TouchableOpacity
      motionKind="button"
      {...({ dataSet: { cta: variant } } as any)}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy || done}
      onPress={onPress}
      style={[
        { backgroundColor: done ? Brand.success : bg, minHeight: 52, paddingHorizontal: Spacing.five, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 },
        outline ? { borderWidth: 1, borderColor: 'rgba(27, 122, 67, 0.28)' } : null,
        gradient,
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        {busy ? <ActivityIndicator color={fg} /> : done ? <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" /> : icon}
        {(!busy || !!loadingLabel) && (
          <ThemedText style={{ color: fg, fontWeight: '700', fontSize: 16, letterSpacing: 0.1 }}>{done ? 'Tamamlandı' : busy ? loadingLabel : label}</ThemedText>
        )}
        {arrow && !busy && !done && (
          <View {...({ dataSet: { ctaarrow: 'true' } } as any)}>
            <IconSymbol name="chevron.right" size={18} color={fg} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
