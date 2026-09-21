import { ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleProp, TextInputProps, View, ViewStyle } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useReducedMotion } from '@/components/ui/motion';
import { TouchableOpacity } from '@/components/ui/touchable';
import { Brand, Radius, Spacing } from '@/constants/theme';
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

// Ana eylem düğmesi: boşta → yükleniyor (iğne ucu boyutu değişmez) → başarılı (kısa onay işareti). Devre dışıyken hover/basma hareketi yoktur.
// Düğmenin yüksekliği/genişliği içerik değişse de sabit kalır (layout kayması olmaz).
export function ActionButton({ label, status = 'idle', onPress, disabled, variant = 'primary', style, icon }: { label: string; status?: ActionStatus; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; style?: StyleProp<ViewStyle>; icon?: ReactNode }) {
  const theme = useTheme();
  const busy = status === 'loading';
  const bg = variant === 'primary' ? Brand.accent : variant === 'danger' ? Brand.danger : theme.backgroundSelected;
  const fg = variant === 'secondary' ? theme.text : '#fff';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy || status === 'success'}
      onPress={onPress}
      style={[{ backgroundColor: status === 'success' ? Brand.success : bg, minHeight: 52, paddingHorizontal: Spacing.five, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        {busy ? <ActivityIndicator color={fg} /> : status === 'success' ? <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" /> : icon}
        {!busy && <ThemedText style={{ color: fg, fontWeight: 'bold', fontSize: 16 }}>{status === 'success' ? 'Tamamlandı' : label}</ThemedText>}
      </View>
    </TouchableOpacity>
  );
}

// Şifre alanı: göster/gizle düğmeli metin girişi (ikon geçişi anlık; düğme klavye ile de erişilebilir)
export function PasswordInput({ value, onChangeText, placeholder, error, style, ...rest }: Omit<TextInputProps, 'secureTextEntry'> & { error?: boolean }) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ justifyContent: 'center' }}>
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={!visible}
        autoCapitalize="none"
        error={error}
        style={[style, { paddingRight: 48 }]}
      />
      <TouchableOpacity
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        hitSlop={8}
        style={{ position: 'absolute', right: Spacing.three, padding: 4 }}
      >
        <IconSymbol name={visible ? 'eye.slash.fill' : 'eye.fill'} size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}
