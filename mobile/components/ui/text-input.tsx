import { forwardRef, useState } from 'react';
import { Platform, TextInput as RNTextInput, TextInputProps } from 'react-native';
import { Brand } from '@/constants/theme';
import { Shadow } from '@/constants/motion';

// Uygulamadaki tüm metin girişlerinin ortak hâli: `react-native`'in TextInput'u ile aynı özellikleri kabul eder.
// Durumlar: normal → hover (web, kenarlık tonu; bkz. utils/web-motion.ts) → odak (marka renkli kenarlık + yumuşak halka) →
// hata (`error`, kırmızı kenarlık) → başarılı (`success`, yeşil kenarlık). Kenarlık/halka geçişleri web'de CSS ile yumuşatılır.
// Odak göstergesi bu bileşenin kendisindedir; bu yüzden tarayıcının varsayılan odak çerçevesi gizlenir.
type Props = TextInputProps & { error?: boolean; success?: boolean };

export const TextInput = forwardRef<RNTextInput, Props>(function TextInput({ style, onFocus, onBlur, error, success, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  const web = Platform.OS === 'web';

  const state: any[] = [];
  if (success && !error) state.push({ borderColor: Brand.success });
  if (focused) state.push({ borderColor: Brand.accent }, web ? { boxShadow: Shadow.ring } : null);
  if (error) state.push({ borderColor: Brand.danger }, focused && web ? { boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.16)' } : null);

  return (
    <RNTextInput
      ref={ref}
      {...rest}
      {...(error ? ({ 'aria-invalid': true } as any) : null)}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={[style, web ? ({ outlineStyle: 'none' } as any) : null, ...state]}
    />
  );
});
