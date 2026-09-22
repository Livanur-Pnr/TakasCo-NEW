import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemePreference, useAppTheme } from '@/hooks/use-app-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SubPage } from '@/components/ui/sub-page';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import * as SecureStore from '@/utils/storage';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: 'sun.max.fill' | 'moon.fill' | 'circle.lefthalf.filled' }[] = [
  { value: 'light', label: 'Açık', icon: 'sun.max.fill' },
  { value: 'dark', label: 'Koyu', icon: 'moon.fill' },
  { value: 'system', label: 'Sistem', icon: 'circle.lefthalf.filled' },
];

const INFO_LINKS = [
  { label: 'Nasıl Çalışır?', href: '/nasil-calisir' },
  { label: 'Güvenli Takas', href: '/guvenli-takas' },
  { label: 'Sık Sorulan Sorular', href: '/sss' },
  { label: 'Topluluk Kuralları', href: '/topluluk-kurallari' },
  { label: 'KVKK Aydınlatma Metni', href: '/kvkk' },
  { label: 'Hakkımızda', href: '/hakkimizda' },
  { label: 'İletişim', href: '/iletisim' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { preference, setPreference } = useAppTheme();
  const [emailOn, setEmailOn] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    api.get('/user').then((r) => { setEmailOn(r.data.email_notifications !== false); setVerified(!!r.data.email_verified_at); }).catch(() => {});
  }, []);

  const sendVerification = async () => {
    setSendingLink(true);
    try {
      const r = await api.post('/email/verification-notification');
      Alert.alert('Gönderildi', r.data.message);
    } catch (e: any) {
      Alert.alert('Uyarı', e.response?.data?.message || 'Doğrulama e-postası gönderilemedi.');
    } finally {
      setSendingLink(false);
    }
  };

  const toggleEmail = async (value: boolean) => {
    setEmailOn(value);
    try {
      const r = await api.post('/user/preferences', { email_notifications: value });
      await SecureStore.setItemAsync('user', JSON.stringify(r.data.user));
    } catch (e: any) {
      setEmailOn(!value);
      Alert.alert('Hata', e.response?.data?.message || 'Tercih kaydedilemedi.');
    }
  };

  return (
    <SubPage title="Ayarlar">
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Görünüm</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: Spacing.three }]}>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = preference === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setPreference(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.themeOption, { backgroundColor: active ? Brand.accent : theme.backgroundSelected }]}
                >
                  <IconSymbol name={opt.icon} size={18} color={active ? '#fff' : theme.textSecondary} />
                  <ThemedText style={{ color: active ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>{opt.label}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Tercihler</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/notifications')}>
            <ThemedText>Bildirimlerim</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          {verified !== null && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: Spacing.three }}>
                  <ThemedText>E-posta doğrulaması</ThemedText>
                  <ThemedText style={{ color: verified ? Brand.success : theme.textSecondary, fontSize: 12 }}>
                    {verified ? 'E-posta adresin doğrulandı' : 'Henüz doğrulanmadı; profilinde rozet görünmez'}
                  </ThemedText>
                </View>
                {!verified && (
                  <TouchableOpacity onPress={sendVerification} disabled={sendingLink} accessibilityRole="button" style={{ opacity: sendingLink ? 0.5 : 1 }}>
                    <ThemedText style={{ color: Brand.accent, fontWeight: '700' }}>Bağlantı Gönder</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: Spacing.three }}>
              <ThemedText>E-posta bildirimleri</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>Teklif geldiğinde ve kabul edildiğinde e-posta al</ThemedText>
            </View>
            <Switch value={emailOn} onValueChange={toggleEmail} trackColor={{ true: Brand.accent }} accessibilityLabel="E-posta bildirimleri" />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Hesap</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => router.push('/change-password')}
          >
            <ThemedText>Şifre Değiştir</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => router.push('/address')}
          >
            <ThemedText>Adres Bilgilerim</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/blocked-users')}>
            <ThemedText>Engellenen Kullanıcılar</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => router.push('/privacy-policy')}
          >
            <ThemedText>Gizlilik Politikası</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/terms')}
          >
            <ThemedText>Kullanım Koşulları</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/delete-account')}>
            <ThemedText style={{ color: Brand.danger }}>Hesabı Sil</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Yardım ve Bilgi</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {INFO_LINKS.map((l, i) => (
            <View key={l.href}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <TouchableOpacity style={styles.settingRow} onPress={() => router.push(l.href as any)} accessibilityRole="link">
                <ThemedText>{l.label}</ThemedText>
                <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </SubPage>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { gap: Spacing.three },
  sectionTitle: { fontSize: 14, fontWeight: '600', opacity: 0.7, paddingHorizontal: Spacing.two },
  card: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.four },
  divider: { height: 1 },
  themeRow: { flexDirection: 'row', gap: Spacing.two },
  themeOption: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: Spacing.three, borderRadius: Radius.sm },
});
