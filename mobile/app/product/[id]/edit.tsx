import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { SubPage } from '@/components/ui/sub-page';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, getImageUrl, API_BASE_URL } from '@/utils/api';
import * as SecureStore from '@/utils/storage';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Alert } from '@/utils/alert';
import { ListingCommercialFields, DEFAULT_COMMERCIAL, CommercialValue, commercialFromProduct, needsPrice, needsSwap, parsePrice } from '@/components/listing-fields';

const CONDITIONS = ['Sıfır', 'Az Kullanılmış', 'Eskimiş'];
const MAX_IMAGES = 8; // backend ile aynı

interface Photo { id: number; image_path: string }

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('Sıfır');
  const [swap, setSwap] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [commercial, setCommercial] = useState<CommercialValue>(DEFAULT_COMMERCIAL);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([api.get(`/products/${id}`), api.get('/categories')]);
        setCategories(c.data);
        setTitle(p.data.title ?? '');
        setDescription(p.data.description ?? '');
        setCondition(p.data.condition ?? 'Sıfır');
        setSwap(p.data.swap_expectation ?? '');
        setCategoryId(p.data.category_id ?? null);
        setPhotos(p.data.images ?? []);
        setCommercial(commercialFromProduct(p.data));
      } catch {
        Alert.alert('Hata', 'İlan bilgileri alınamadı.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const save = async () => {
    if (!title.trim() || !description.trim() || (needsSwap(commercial.listingType) && !swap.trim())) {
      Alert.alert('Uyarı', 'Başlık, açıklama ve takas beklentisi boş bırakılamaz.');
      return;
    }
    const price = parsePrice(commercial.price);
    if (needsPrice(commercial.listingType) && price === null) {
      Alert.alert('Uyarı', 'Geçerli bir fiyat girin.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/products/${id}`, {
        title: title.trim(),
        description: description.trim(),
        condition,
        swap_expectation: needsSwap(commercial.listingType) ? swap.trim() : '',
        listing_type: commercial.listingType,
        price: needsPrice(commercial.listingType) ? price : null,
        brand: commercial.brand.trim() || null,
        shipping_enabled: commercial.shipping,
        meetup_enabled: commercial.meetup,
        ...(categoryId ? { category_id: categoryId } : {}),
      });
      Alert.alert('Başarılı', 'İlanın güncellendi.');
      router.replace(`/product/${id}`);
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      Alert.alert('Hata', errors ? Object.values(errors).flat().join(' ') : e.response?.data?.message || 'İlan güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = (photo: Photo) => {
    Alert.alert('Fotoğrafı Sil', 'Bu fotoğraf ilandan kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/images/${photo.id}`);
            setPhotos((prev) => prev.filter((x) => x.id !== photo.id));
          } catch (e: any) {
            Alert.alert('Uyarı', e.response?.data?.message || 'Fotoğraf silinemedi.');
          }
        },
      },
    ]);
  };

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_IMAGES - photos.length, quality: 0.8 });
    if (result.canceled) return;
    setPhotoBusy(true);
    try {
      const form = new FormData();
      result.assets.forEach((asset, i) => {
        const name = asset.fileName || asset.uri.split('/').pop() || `upload_${i}.jpg`;
        if (Platform.OS === 'web' && asset.file) {
          form.append('images[]', asset.file, name);
        } else {
          // @ts-ignore RN FormData dosya biçimi
          form.append('images[]', { uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri, name, type: asset.mimeType || 'image/jpeg' });
        }
      });
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${API_BASE_URL}/api/products/${id}/images`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        const errors = data.errors;
        throw new Error(errors ? Object.values(errors).flat().join(' ') : data.message || 'Fotoğraf eklenemedi.');
      }
      setPhotos(data.images);
    } catch (e: any) {
      Alert.alert('Uyarı', e.message || 'Fotoğraf eklenemedi.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const input = [styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }];

  const saveButton = (
    <TouchableOpacity onPress={save} disabled={saving || loading} accessibilityRole="button" style={[styles.button, { backgroundColor: Brand.accent, opacity: saving ? 0.6 : 1 }]}>
      {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Değişiklikleri Kaydet</ThemedText>}
    </TouchableOpacity>
  );

  return (
    <SubPage title="İlanı Düzenle" footer={saveButton}>
      {loading ? (
        <ActivityIndicator color={Brand.accent} style={{ marginTop: Spacing.six }} />
      ) : (
        <>
          <View style={styles.group}>
            <ThemedText style={styles.label}>Fotoğraflar <ThemedText style={{ fontSize: 12, fontWeight: '400', color: theme.textSecondary }}>(en fazla {MAX_IMAGES}; değişiklikler anında kaydedilir)</ThemedText></ThemedText>
            <View style={styles.photoRow}>
              {photos.map((ph, i) => {
                const path = ph.image_path.startsWith('[') ? JSON.parse(ph.image_path)[0] : ph.image_path;
                return (
                  <View key={ph.id} style={[styles.photo, { backgroundColor: theme.backgroundSelected }]}>
                    <Image source={{ uri: getImageUrl(path) || undefined }} style={{ width: '100%', height: '100%' }} />
                    {i === 0 && (
                      <View style={[styles.cover, { backgroundColor: Brand.accent }]}>
                        <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>KAPAK</ThemedText>
                      </View>
                    )}
                    {photos.length > 1 && (
                      <TouchableOpacity onPress={() => removePhoto(ph)} accessibilityRole="button" accessibilityLabel="Fotoğrafı sil" style={styles.removeBtn}>
                        <IconSymbol name="xmark.circle.fill" size={22} color={Brand.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              {photos.length < MAX_IMAGES && (
                <TouchableOpacity onPress={addPhotos} disabled={photoBusy} accessibilityRole="button" accessibilityLabel="Fotoğraf ekle" style={[styles.photo, styles.addPhoto, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                  {photoBusy ? <ActivityIndicator color={Brand.accent} /> : <IconSymbol name="plus.circle.fill" size={28} color={theme.textSecondary} />}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.group}>
            <ThemedText style={styles.label}>Başlık *</ThemedText>
            <TextInput style={input} value={title} onChangeText={setTitle} maxLength={255} accessibilityLabel="Başlık" />
          </View>

          <View style={styles.group}>
            <ThemedText style={styles.label}>Kategori</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: categoryId === c.id }}
                  style={[styles.pill, { backgroundColor: categoryId === c.id ? Brand.accent : theme.backgroundSelected }]}
                >
                  <ThemedText style={{ color: categoryId === c.id ? '#fff' : theme.text }}>{c.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.group}>
            <ThemedText style={styles.label}>Ürün Durumu</ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCondition(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: condition === c }}
                  style={[styles.segment, { backgroundColor: condition === c ? Brand.accent : theme.backgroundSelected }]}
                >
                  <ThemedText style={{ color: condition === c ? '#fff' : theme.text, fontSize: 12 }}>{c}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <ThemedText style={styles.label}>Açıklama *</ThemedText>
            <TextInput style={[...input, { height: 110 }]} multiline textAlignVertical="top" value={description} onChangeText={setDescription} maxLength={5000} accessibilityLabel="Açıklama" />
          </View>

          <ListingCommercialFields value={commercial} onChange={setCommercial} />

          {needsSwap(commercial.listingType) && (
            <View style={styles.group}>
              <ThemedText style={styles.label}>Takas Beklentisi *</ThemedText>
              <TextInput style={input} value={swap} onChangeText={setSwap} maxLength={500} accessibilityLabel="Takas beklentisi" />
            </View>
          )}

          <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>İlk fotoğraf kapak olur; kapak silinirse sıradaki fotoğraf kapak olur.</ThemedText>
        </>
      )}
    </SubPage>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  label: { fontWeight: '600', fontSize: 14 },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  pill: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.full },
  segment: { flex: 1, padding: Spacing.three, borderRadius: Radius.sm, alignItems: 'center' },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  photo: { width: 90, height: 90, borderRadius: Radius.md, overflow: 'hidden' },
  addPhoto: { borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  cover: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  removeBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: '#fff', borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
