import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import * as SecureStore from '@/utils/storage';
import { usePageTitle } from '@/utils/use-page-title';

const MAX_INTERESTS = 10; // backend ile aynı

// Kayıttan hemen sonra tek seferlik kişiselleştirme: ilgi alanları + şehir. "Şimdi değil" ile atlanabilir.
export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Hoş Geldin');

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    api.get('/cities').then((r) => setCities(r.data)).catch(() => {});
  }, []);

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_INTERESTS ? prev : [...prev, id]));

  const finish = async (skip: boolean) => {
    setBusy(true);
    try {
      const res = await api.post('/user/onboarding', skip ? {} : { category_ids: selected, city: city.trim() || undefined });
      if (res.data.user) await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
      router.replace('/(tabs)');
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      Alert.alert('Hata', errors ? Object.values(errors).flat().join(' ') : e.response?.data?.message || 'Tercihlerin kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <Image source={require('@/assets/images/takasco-logo.png')} style={{ width: 36, height: 36 }} />
          <ThemedText type="title" style={{ color: Brand.wordmark, fontSize: 26 }}>TakasCo</ThemedText>
        </View>
        <ThemedText type="title" style={{ fontSize: 24 }}>Hoş geldin!</ThemedText>
        <ThemedText style={{ color: theme.textSecondary }}>Sana uygun ilanları öne çıkarabilmemiz için ilgi alanlarını seç. İstediğin zaman atlayabilirsin.</ThemedText>

        <View style={{ gap: Spacing.two }}>
          <ThemedText style={styles.label}>İlgi alanların <ThemedText style={{ fontWeight: '400', color: theme.textSecondary, fontSize: 12 }}>(en fazla {MAX_INTERESTS})</ThemedText></ThemedText>
          <View style={styles.chips}>
            {categories.map((c) => {
              const active = selected.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => toggle(c.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, { backgroundColor: active ? Brand.accent : theme.backgroundSelected }]}
                >
                  <ThemedText style={{ color: active ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>{c.name}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ gap: Spacing.two }}>
          <ThemedText style={styles.label}>Şehrin <ThemedText style={{ fontWeight: '400', color: theme.textSecondary, fontSize: 12 }}>(isteğe bağlı)</ThemedText></ThemedText>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Örn. İzmir"
            placeholderTextColor={theme.textSecondary}
            maxLength={255}
            accessibilityLabel="Şehir"
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
          />
          {cities.length > 0 && (
            <View style={styles.chips}>
              {cities.slice(0, 8).map((c) => (
                <TouchableOpacity key={c} onPress={() => setCity(c)} accessibilityRole="button" style={[styles.chip, { backgroundColor: city === c ? Brand.accent : theme.backgroundSelected }]}>
                  <ThemedText style={{ color: city === c ? '#fff' : theme.text, fontSize: 12 }}>{c}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity onPress={() => finish(false)} disabled={busy} accessibilityRole="button" style={[styles.button, { backgroundColor: Brand.accent, opacity: busy ? 0.6 : 1 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Kaydet ve Devam Et</ThemedText>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => finish(true)} disabled={busy} accessibilityRole="button" style={{ alignSelf: 'center', padding: Spacing.two }}>
          <ThemedText style={{ color: theme.textSecondary, fontWeight: '600' }}>Şimdi değil</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.six, paddingTop: Spacing.eight, gap: Spacing.five, width: '100%', maxWidth: 560, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { fontWeight: '600', fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
