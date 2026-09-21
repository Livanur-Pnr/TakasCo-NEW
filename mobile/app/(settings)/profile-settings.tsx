import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from '@/utils/storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SubPage } from '@/components/ui/sub-page';
import { api, getImageUrl } from '@/utils/api';
import { Alert } from '@/utils/alert';

// Backend'deki PRESET_AVATARS listesiyle birebir aynı olmalı (backend/app/Http/Controllers/Api/AuthController.php)
const PRESET_AVATARS = [
  'avatars/avatar-1.png',
  'avatars/avatar-2.png',
  'avatars/avatar-3.png',
  'avatars/avatar-4.png',
  'avatars/avatar-5.png',
  'avatars/avatar-6.png',
];

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  
  // newPhoto tutulurken ImagePicker Asset objesi tutulur
  const [newPhoto, setNewPhoto] = useState<any>(null);
  // hazır avatarlardan biri seçilirse yolu burada tutulur (örn: 'avatars/avatar-2.png')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/user');
      const user = response.data;
      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phone_number || '');
      setBio(user.bio || '');
      setExistingPhoto(user.profile_photo_path || null);
    } catch (error) {
      console.error('Kullanıcı bilgileri alınamadı:', error);
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    setPhotoMenuVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hata', 'Fotoğraf seçmek için galeri erişim iznine ihtiyacımız var.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Profil fotoğrafı için kare
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewPhoto(result.assets[0]);
      setSelectedPreset(null);
    }
  };

  const takePhoto = async () => {
    setPhotoMenuVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hata', 'Fotoğraf çekmek için kamera erişim iznine ihtiyacımız var.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewPhoto(result.assets[0]);
      setSelectedPreset(null);
    }
  };

  const choosePreset = (path: string) => {
    setSelectedPreset(path);
    setNewPhoto(null);
  };

  const handleSave = async () => {
    if (!name || !email || !phoneNumber) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone_number', phoneNumber);
      formData.append('bio', bio.trim());

      if (newPhoto) {
        const filename = newPhoto.fileName || newPhoto.uri.split('/').pop() || 'profile.jpg';
        const type = newPhoto.mimeType || 'image/jpeg';

        if (Platform.OS === 'web' && newPhoto.file) {
          formData.append('profile_photo', newPhoto.file, filename);
        } else {
          // @ts-ignore
          formData.append('profile_photo', {
            uri: Platform.OS === 'ios' ? newPhoto.uri.replace('file://', '') : newPhoto.uri,
            name: filename,
            type,
          } as any);
        }
      } else if (selectedPreset) {
        formData.append('profile_photo_path', selectedPreset);
      }

      const response = await api.post('/user/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update local storage just in case
      await SecureStore.setItemAsync('user', JSON.stringify(response.data.user));

      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Profil güncelleme hatası:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Profil güncellenirken bir hata oluştu.';
      Alert.alert('Hata', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Brand.accent} />
      </ThemedView>
    );
  }

  return (
    <SubPage title="Profil Ayarlarım"
      footer={(
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: saving ? theme.backgroundSelected : Brand.accent }]}
        disabled={saving}
        onPress={handleSave}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Kaydet</ThemedText>
        )}
      </TouchableOpacity>
      )}
      overlay={(
        <>
{/* Fotoğraf kaynağı seçim modalı */}
      <Modal
        visible={photoMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPhotoMenuVisible(false)}
        >
          <View style={[styles.modalSheet, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.three, textAlign: 'center' }}>
              Profil Fotoğrafı
            </ThemedText>
            <TouchableOpacity style={[styles.modalOption, { borderBottomColor: theme.border }]} onPress={pickImage}>
              <IconSymbol name="photo.fill" size={20} color={theme.text} />
              <ThemedText style={styles.modalOptionText}>Galeriden Seç</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalOption, { borderBottomColor: theme.border }]} onPress={takePhoto}>
              <IconSymbol name="camera.fill" size={20} color={theme.text} />
              <ThemedText style={styles.modalOptionText}>Fotoğraf Çek</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => setPhotoMenuVisible(false)}>
              <ThemedText style={{ color: Brand.danger, fontWeight: '600' }}>Vazgeç</ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
        </>
      )}
    >
      
      {/* Photo Upload Section */}
      <View style={styles.photoContainer}>
        <TouchableOpacity
          onPress={() => setPhotoMenuVisible(true)}
          style={[styles.photoBox, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}
          accessibilityRole="button"
          accessibilityLabel="Profil fotoğrafını değiştir"
        >
          {newPhoto ? (
            <Image source={{ uri: newPhoto.uri }} style={styles.photo} />
          ) : selectedPreset ? (
            <Image source={{ uri: getImageUrl(selectedPreset) || undefined }} style={styles.photo} />
          ) : existingPhoto ? (
            <Image source={{ uri: getImageUrl(existingPhoto) || undefined }} style={styles.photo} />
          ) : (
            <IconSymbol name="camera.fill" size={40} color={theme.textSecondary} />
          )}
          <View style={[styles.editIconContainer, { backgroundColor: Brand.accent }]}>
            <IconSymbol name="pencil" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <ThemedText style={{ marginTop: Spacing.two, opacity: 0.7, fontSize: 14 }}>
          Fotoğrafı Değiştir
        </ThemedText>

        {/* Galeri/kamera istemeyenler için hazır anonim avatarlar */}
        <ThemedText style={{ marginTop: Spacing.four, marginBottom: Spacing.two, fontSize: 13, opacity: 0.7 }}>
          veya hazır bir avatar seç
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.one }}>
          {PRESET_AVATARS.map((path) => (
            <TouchableOpacity
              key={path}
              onPress={() => choosePreset(path)}
              style={[
                styles.presetAvatar,
                { borderColor: selectedPreset === path ? Brand.accent : 'transparent' }
              ]}
            >
              <Image source={{ uri: getImageUrl(path) || undefined }} style={styles.presetAvatarImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Ad Soyad (Nickname)</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="Adınız Soyadınız" 
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Telefon Numarası</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="5XX XXX XX XX" 
            placeholderTextColor={theme.textSecondary}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Hakkında <ThemedText style={{ fontWeight: '400', color: theme.textSecondary, fontSize: 12 }}>(herkese açık profilinde görünür, {bio.length}/300)</ThemedText></ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, height: 90 }]}
            placeholder="Kendini kısaca tanıt: neler takas etmeyi seviyorsun?"
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
            maxLength={300}
            value={bio}
            onChangeText={setBio}
            accessibilityLabel="Hakkında"
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>E-posta Adresi</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="E-posta adresiniz" 
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>

    
    </SubPage>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoContainer: { alignItems: 'center', marginVertical: Spacing.four },
  photoBox: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 2, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: 60 },
  editIconContainer: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  presetAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, overflow: 'hidden' },
  presetAvatarImage: { width: '100%', height: '100%' },
  form: { gap: Spacing.four },
  inputContainer: { gap: Spacing.one },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  footer: { padding: Spacing.four, paddingBottom: Spacing.six, borderTopWidth: 1 },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { padding: Spacing.six, borderTopLeftRadius: Radius.md, borderTopRightRadius: Radius.md },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.four, borderBottomWidth: 1, justifyContent: 'center' },
  modalOptionText: { fontSize: 16 }
});
