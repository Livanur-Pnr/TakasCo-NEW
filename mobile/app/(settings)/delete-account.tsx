import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { SubPage } from '@/components/ui/sub-page';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import * as SecureStore from '@/utils/storage';

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmDelete = () => {
    if (!password) {
      Alert.alert('Uyarı', 'Devam etmek için şifreni gir.');
      return;
    }
    Alert.alert('Hesabı Kalıcı Sil', 'Bu işlem geri alınamaz. İlanların kaldırılır, bekleyen tekliflerin iptal edilir ve kişisel bilgilerin silinir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Hesabı Sil',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.post('/user/delete', { password });
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('user');
            Alert.alert('Hesabın silindi', 'Bizi tercih ettiğin için teşekkürler.');
            router.replace('/(auth)/welcome');
          } catch (e: any) {
            const errors = e.response?.data?.errors;
            Alert.alert('Hata', errors ? Object.values(errors).flat().join(' ') : e.response?.data?.message || 'Hesap silinemedi.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <SubPage title="Hesabı Sil">
      <ThemedText style={{ color: theme.textSecondary, lineHeight: 22 }}>
        Hesabını sildiğinde profil bilgilerin anonimleştirilir, tüm ilanların yayından kaldırılır, bekleyen takas tekliflerin iptal edilir ve kayıtlı aramaların silinir. Daha önce tamamlanmış takaslar diğer tarafın geçmişi için Silinmiş Kullanıcı adıyla kalır.
      </ThemedText>
      <View style={{ gap: Spacing.two }}>
        <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>Şifren</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="Şifre"
          autoCapitalize="none"
        />
      </View>
      <TouchableOpacity onPress={confirmDelete} disabled={busy} accessibilityRole="button" style={[styles.btn, { backgroundColor: Brand.danger, opacity: busy ? 0.6 : 1 }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Hesabımı Kalıcı Olarak Sil</ThemedText>}
      </TouchableOpacity>
    </SubPage>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  btn: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
});
