import { useEffect, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as SecureStore from '@/utils/storage';

const KEY = 'cookie_notice_ack';

// Yalnızca web: TakasCo yalnızca oturum ve tercih için zorunlu depolama kullanır (izleme/reklam çerezi yok);
// bu yüzden bant bilgilendiricidir ve tek bir "Anladım" eylemi sunar.
export function CookieBanner() {
  const theme = useTheme();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    SecureStore.getItemAsync(KEY).then((v) => setVisible(v !== '1')).catch(() => {});
  }, []);

  if (!visible) return null;

  const dismiss = async () => {
    await SecureStore.setItemAsync(KEY, '1');
    setVisible(false);
  };

  return (
    <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} accessibilityRole="alert">
      <ThemedText style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>
        TakasCo, oturumunu açık tutmak ve tercihlerini hatırlamak için yalnızca zorunlu tarayıcı depolamasını kullanır; reklam veya izleme çerezi kullanmaz.{' '}
        <ThemedText style={{ color: Brand.accent, fontWeight: '700', fontSize: 13 }} onPress={() => router.push('/kvkk')} accessibilityRole="link">
          KVKK Aydınlatma Metni
        </ThemedText>
      </ThemedText>
      <TouchableOpacity onPress={dismiss} accessibilityRole="button" style={[styles.btn, { backgroundColor: Brand.accent }]}>
        <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Anladım</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute' as any,
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    zIndex: 1000,
  },
  btn: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.sm },
});
