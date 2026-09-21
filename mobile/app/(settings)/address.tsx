import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as SecureStore from '@/utils/storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SubPage } from '@/components/ui/sub-page';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';

export default function AddressScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [addressTitle, setAddressTitle] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userString = await SecureStore.getItemAsync('user');
      if (userString) {
        const userData = JSON.parse(userString);
        if (userData.address_title) setAddressTitle(userData.address_title);
        if (userData.city) setCity(userData.city);
        if (userData.district) setDistrict(userData.district);
      }
    } catch (error) {
      console.error('Kullanıcı verisi yüklenirken hata:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    if (!addressTitle || !city || !district) {
      Alert.alert('Uyarı', 'Lütfen tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/user/address', {
        address_title: addressTitle,
        city: city,
        district: district,
      });

      // Update local storage user data
      const userString = await SecureStore.getItemAsync('user');
      if (userString) {
        const userData = JSON.parse(userString);
        const updatedUser = { ...userData, ...response.data.user };
        await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      }

      Alert.alert('Başarılı', response.data.message || 'Adres bilgileriniz güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Adres güncelleme hatası:', error.response?.data || error);
      const errorMessage = error.response?.data?.message || 'Güncelleme sırasında bir hata oluştu.';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Brand.accent} />
      </ThemedView>
    );
  }

  return (
    <SubPage title="Adres Bilgilerim"
      footer={(
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: loading ? theme.backgroundSelected : Brand.accent }]}
        disabled={loading}
        onPress={handleSave}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Kaydet</ThemedText>
        )}
      </TouchableOpacity>
      )}
    >
      <ThemedText style={{ opacity: 0.7 }}>
        Profilinizde ve ilanlarınızda görünecek adres bilgilerinizi buradan güncelleyebilirsiniz.
      </ThemedText>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Başlık (Ev/İş)</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="Örn: Ev" 
            placeholderTextColor={theme.textSecondary}
            value={addressTitle}
            onChangeText={setAddressTitle}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Şehir</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="Örn: İstanbul" 
            placeholderTextColor={theme.textSecondary}
            value={city}
            onChangeText={setCity}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>İlçe</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="Örn: Kadıköy" 
            placeholderTextColor={theme.textSecondary}
            value={district}
            onChangeText={setDistrict}
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
