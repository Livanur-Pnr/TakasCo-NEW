import { ComponentProps, forwardRef, useState } from 'react';
import { Platform, StyleSheet, TextInput as RNTextInput, TextInputProps, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { Shadow } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

type Props = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  icon: ComponentProps<typeof IconSymbol>['name'];
  invalid?: boolean;
  secure?: boolean;
};

// Kimlik doğrulama formu alanı: üstte etiket, solda ikon, gerçek girişi saran tek kenarlıklı kapsayıcı.
// Durumlar: normal → hover (kenarlık tonu) → odak (marka rengi kenarlık + halka + ikon rengi) → hata (kırmızı kenarlık).
// `secure`: sağda göster/gizle düğmesi (44px dokunma alanı; yerleşim değişmez).
export const AuthField = forwardRef<RNTextInput, Props>(function AuthField({ label, icon, invalid, secure, onFocus, onBlur, ...rest }, ref) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const web = Platform.OS === 'web';
  const state = invalid ? 'error' : focused ? 'focus' : 'idle';
  const iconColor = invalid ? Brand.danger : focused ? Brand.accent : theme.textSecondary;

  return (
    <View style={styles.wrap}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View
        {...({ dataSet: { field: 'true', state } } as any)}
        style={[
          styles.box,
          { backgroundColor: theme.inputBg, borderColor: invalid ? Brand.danger : focused ? Brand.accent : '#d9e1dc' },
          web && focused ? ({ boxShadow: invalid ? Shadow.ringDanger : Shadow.ring } as any) : null,
        ]}
      >
        <View {...({ dataSet: { fieldicon: 'true' } } as any)}>
          <IconSymbol name={icon} size={20} color={iconColor} />
        </View>
        <TextInput
          {...rest}
          ref={ref}
          bare
          accessibilityLabel={label}
          aria-invalid={invalid ? true : undefined}
          secureTextEntry={secure && !visible}
          placeholderTextColor={theme.textSecondary}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[styles.input, { color: theme.text }]}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
            {...({ dataSet: { iconbtn: 'true' } } as any)}
            style={styles.toggle}
          >
            <IconSymbol name={visible ? 'eye.slash.fill' : 'eye.fill'} size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: Radius.md, borderWidth: 1, paddingLeft: 14, paddingRight: 4, gap: Spacing.three },
  input: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 14 },
  toggle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
