import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SubPage } from '@/components/ui/sub-page';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !newPasswordConfirmation) {
      Alert.alert('Uyarı', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      Alert.alert('Uyarı', 'Yeni şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/user/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirmation
      });

      Alert.alert('Başarılı', response.data.message || 'Şifreniz başarıyla güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Şifre değiştirme hatası:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Şifre güncellenirken bir hata oluştu.';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubPage title="Şifre Değiştir"
      footer={(
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: loading ? theme.backgroundSelected : Brand.accent }]}
        disabled={loading}
        onPress={handleChangePassword}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Şifremi Değiştir</ThemedText>
        )}
      </TouchableOpacity>
      )}
    >
      <ThemedText style={{ opacity: 0.7 }}>
        Hesabınızın güvenliğini sağlamak için lütfen mevcut şifrenizi ve yeni şifrenizi girin. Yeni şifreniz en az 8 karakter uzunluğunda olmalıdır.
      </ThemedText>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Eski Şifre</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="Mevcut şifrenizi girin" 
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Yeni Şifre</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="Yeni şifrenizi girin" 
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Yeni Şifre (Tekrar)</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="Yeni şifrenizi tekrar girin" 
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={newPasswordConfirmation}
            onChangeText={setNewPasswordConfirmation}
          />
        </View>
      </View>
    
    </SubPage>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  form: { gap: Spacing.four, marginTop: Spacing.two },
  inputContainer: { gap: Spacing.one },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  footer: { padding: Spacing.four, paddingBottom: Spacing.six, borderTopWidth: 1 },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
