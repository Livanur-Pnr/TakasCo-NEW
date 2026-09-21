import { FadeImage } from '@/components/ui/motion';
import { StyleSheet, ScrollView, View, ActivityIndicator, Platform } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api, API_BASE_URL } from '@/utils/api';
import * as SecureStore from '@/utils/storage';
import { Alert } from '@/utils/alert';
import { SiteFooter } from '@/components/web-storefront';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { usePageTitle } from '@/utils/use-page-title';
import { compressImage } from '@/utils/image-compress';
import { postFormWithProgress } from '@/utils/upload';
import { ListingCommercialFields, DEFAULT_COMMERCIAL, CommercialValue, needsPrice, needsSwap, parsePrice } from '@/components/listing-fields';

const DRAFT_KEY = 'listing_draft';
const MAX_IMAGES = 8; // backend (ProductController) ile aynı olmalı

interface Category {
  id: number;
  name: string;
}

export default function AddScreen() {
  const theme = useTheme();
  usePageTitle('İlan Ver', 'Kullanmadığın eşyanı ücretsiz ilan olarak yayınla ve takas tekliflerini al.');
  const router = useRouter();
  const isDesktopWeb = useIsDesktopWeb();

  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('Sıfır');
  const [swapExpectation, setSwapExpectation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [commercial, setCommercial] = useState<CommercialValue>(DEFAULT_COMMERCIAL);
  const [progress, setProgress] = useState<number | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftLoaded = useRef(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Yarım kalan ilan metni cihazda saklanır (fotoğraflar hariç) ve sayfa yeniden açılınca geri yüklenir
  useEffect(() => {
    SecureStore.getItemAsync(DRAFT_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const d = JSON.parse(raw);
          if (d.title) setTitle(d.title);
          if (d.description) setDescription(d.description);
          if (d.condition) setCondition(d.condition);
          if (d.swapExpectation) setSwapExpectation(d.swapExpectation);
          if (d.selectedCategory) setSelectedCategory(d.selectedCategory);
          if (d.commercial) setCommercial({ ...DEFAULT_COMMERCIAL, ...d.commercial });
          setDraftRestored(!!(d.title || d.description || d.swapExpectation));
        } catch {
          // bozuk taslak yok sayılır
        }
      })
      .finally(() => { draftLoaded.current = true; });
  }, []);

  useEffect(() => {
    if (!draftLoaded.current) return;
    const timer = setTimeout(() => {
      const empty = !title && !description && !swapExpectation && !selectedCategory && !commercial.price && !commercial.brand;
      if (empty) SecureStore.deleteItemAsync(DRAFT_KEY).catch(() => {});
      else SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify({ title, description, condition, swapExpectation, selectedCategory, commercial })).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [title, description, condition, swapExpectation, selectedCategory, commercial]);

  const clearDraft = () => {
    SecureStore.deleteItemAsync(DRAFT_KEY).catch(() => {});
    setTitle('');
    setDescription('');
    setSwapExpectation('');
    setSelectedCategory(null);
    setCommercial(DEFAULT_COMMERCIAL);
    setCondition('Sıfır');
    setDraftRestored(false);
  };

  // fotoğraf sırası: kapak = ilk fotoğraf
  const moveImage = (from: number, to: number) =>
    setImages((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Kategoriler alınamadı:', error);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets].slice(0, MAX_IMAGES));
    }
  };

  const handlePublish = async () => {
    if (!title || images.length === 0 || !selectedCategory || !description || (needsSwap(commercial.listingType) && !swapExpectation)) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun ve en az bir fotoğraf ekleyin.');
      return;
    }
    const price = parsePrice(commercial.price);
    if (needsPrice(commercial.listingType) && price === null) {
      Alert.alert('Hata', 'Geçerli bir fiyat girin.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category_id', selectedCategory.toString());
      formData.append('description', description);
      formData.append('condition', condition);
      formData.append('swap_expectation', needsSwap(commercial.listingType) ? swapExpectation : '');
      formData.append('listing_type', commercial.listingType);
      if (needsPrice(commercial.listingType) && price !== null) formData.append('price', String(price));
      if (commercial.brand.trim()) formData.append('brand', commercial.brand.trim());
      formData.append('shipping_enabled', commercial.shipping ? '1' : '0');
      formData.append('meetup_enabled', commercial.meetup ? '1' : '0');

      // web'de fotoğraflar yüklemeden önce tarayıcıda küçültülür (5 MB sınırı ve hız için)
      const compressed = await Promise.all(images.map((a) => (Platform.OS === 'web' && a.file ? compressImage(a.file) : Promise.resolve(null))));

      images.forEach((asset, index) => {
        const filename = asset.fileName || asset.uri.split('/').pop() || `upload_${index}.jpg`;
        const type = asset.mimeType || 'image/jpeg';

        if (Platform.OS === 'web' && asset.file) {
          // Web'de FormData gercek bir File/Blob nesnesi bekler; expo-image-picker
          // bunu asset.file uzerinden saglar. {uri,name,type} bicimi sadece native'de calisir.
          formData.append('images[]', compressed[index] ?? asset.file, compressed[index]?.name ?? filename);
        } else {
          // @ts-ignore
          formData.append('images[]', {
            uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
            name: filename,
            type,
          } as any);
        }
      });

      const token = await SecureStore.getItemAsync('auth_token');
      setProgress(0);
      const { ok, data } = await postFormWithProgress(`${API_BASE_URL}/api/products`, formData, token, setProgress);

      if (!ok) {
        throw { response: { data } };
      }
      SecureStore.deleteItemAsync(DRAFT_KEY).catch(() => {});

      Alert.alert('Başarılı', 'İlanınız onaya gönderildi!');
      router.push('/(tabs)');
      
      // Reset form
      setImages([]);
      setTitle('');
      setDescription('');
      setSwapExpectation('');
      setSelectedCategory(null);
      setCommercial(DEFAULT_COMMERCIAL);
    } catch (error: any) {
      console.log('Error payload:', error.response?.data);
      let errorMessage = 'İlan gönderilirken bir hata oluştu.';
      
      if (error.response?.data?.errors) {
        // Extract validation errors from Laravel
        const errors = error.response.data.errors;
        const errorMessages = Object.values(errors).flat();
        errorMessage = errorMessages.join('\n');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Hata', error.message && !error.response ? error.message : errorMessage);
    } finally {
      setProgress(null);
      setLoading(false);
    }
  };

  const renderImageUploader = (size: number) => (
    <View style={styles.imageGallery}>
      {images.map((img, index) => (
        <View key={index} style={[styles.imageUpload, { backgroundColor: theme.backgroundSelected, borderColor: theme.border, width: size, height: size }]}>
          <FadeImage source={{ uri: img.uri }} style={styles.uploadedImage} />
          {index === 0 && (
            <View style={[styles.coverBadge, { backgroundColor: Brand.accent }]}>
              <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>KAPAK</ThemedText>
            </View>
          )}
          {images.length > 1 && (
            <View style={styles.moveRow}>
              <TouchableOpacity disabled={index === 0} onPress={() => moveImage(index, index - 1)} accessibilityRole="button" accessibilityLabel="Sola taşı" style={[styles.moveBtn, index === 0 && { opacity: 0.3 }]}>
                <ThemedText style={styles.moveText}>◀</ThemedText>
              </TouchableOpacity>
              {index > 0 && (
                <TouchableOpacity onPress={() => moveImage(index, 0)} accessibilityRole="button" accessibilityLabel="Kapak yap" style={styles.moveBtn}>
                  <ThemedText style={styles.moveText}>Kapak</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity disabled={index === images.length - 1} onPress={() => moveImage(index, index + 1)} accessibilityRole="button" accessibilityLabel="Sağa taşı" style={[styles.moveBtn, index === images.length - 1 && { opacity: 0.3 }]}>
                <ThemedText style={styles.moveText}>▶</ThemedText>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => setImages(images.filter((_, i) => i !== index))}
            accessibilityRole="button"
            accessibilityLabel="Fotoğrafı kaldır"
          >
            <IconSymbol name="xmark.circle.fill" size={24} color={Brand.danger} />
          </TouchableOpacity>
        </View>
      ))}
      {images.length < MAX_IMAGES && (
        <TouchableOpacity
          style={[styles.imageUpload, { backgroundColor: theme.backgroundSelected, borderColor: theme.border, width: size, height: size }]}
          onPress={pickImage}
        >
          <IconSymbol name="plus.circle.fill" size={32} color={theme.textSecondary} />
          <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.two, fontSize: 10 }}>Fotoğraf Ekle</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTitleField = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>Başlık *</ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        placeholder="Ne takaslıyorsun?"
        placeholderTextColor={theme.textSecondary}
        value={title}
        onChangeText={setTitle}
      />
    </View>
  );

  const renderCategoryField = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>Kategori *</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryPill, { backgroundColor: selectedCategory === cat.id ? Brand.accent : theme.backgroundSelected }]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <ThemedText style={{ color: selectedCategory === cat.id ? '#fff' : theme.text }}>{cat.name}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderConditionField = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>Ürün Durumu</ThemedText>
      <View style={styles.segmentedControl}>
        {['Sıfır', 'Az Kullanılmış', 'Eskimiş'].map((cond) => (
          <TouchableOpacity
            key={cond}
            style={[styles.segment, condition === cond ? { backgroundColor: Brand.accent } : { backgroundColor: theme.backgroundSelected }]}
            onPress={() => setCondition(cond)}
          >
            <ThemedText style={{ color: condition === cond ? '#fff' : theme.text, fontSize: 12 }}>{cond}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDescriptionField = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>Açıklama *</ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, height: 100 }]}
        placeholder="Ürünün durumu, özellikleri vs."
        placeholderTextColor={theme.textSecondary}
        multiline
        textAlignVertical="top"
        value={description}
        onChangeText={setDescription}
      />
    </View>
  );

  const renderSwapField = () => (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>Takas Beklentisi *</ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        placeholder="Buna karşılık ne istiyorsun?"
        placeholderTextColor={theme.textSecondary}
        value={swapExpectation}
        onChangeText={setSwapExpectation}
      />
    </View>
  );

  const renderPublishButton = () => (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: loading ? theme.backgroundSelected : Brand.accent }]}
      onPress={handlePublish}
      disabled={loading}
    >
      {loading ? (
        progress !== null && progress > 0 && progress < 100 ? (
          <ThemedText style={styles.buttonText}>Fotoğraflar yükleniyor… %{progress}</ThemedText>
        ) : (
          <ActivityIndicator color="#fff" />
        )
      ) : (
        <ThemedText style={styles.buttonText}>İlanı Yayınla</ThemedText>
      )}
    </TouchableOpacity>
  );

  const draftBanner = draftRestored ? (
    <View style={[styles.draftBar, { backgroundColor: Brand.accent + '15' }]}>
      <ThemedText style={{ flex: 1, fontSize: 13 }}>Yarım kalan ilan taslağın geri yüklendi (fotoğrafları yeniden eklemelisin).</ThemedText>
      <TouchableOpacity onPress={clearDraft} accessibilityRole="button">
        <ThemedText style={{ color: Brand.danger, fontWeight: '700', fontSize: 13 }}>Temizle</ThemedText>
      </TouchableOpacity>
    </View>
  ) : null;

  if (isDesktopWeb) {
    const selectedCategoryName = categories.find((c) => c.id === selectedCategory)?.name;
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={desktopAddStyles.page}>
          <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark, marginBottom: Spacing.five }}>İlan Ver</ThemedText>

          <View style={desktopAddStyles.mainRow}>
            <View style={desktopAddStyles.formCol}>
              {draftBanner}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Fotoğraflar * <ThemedText style={{ fontSize: 12, fontWeight: '400', color: theme.textSecondary }}>(ilk fotoğraf kapak olur, en fazla {MAX_IMAGES})</ThemedText></ThemedText>
                {renderImageUploader(120)}
              </View>
              {renderTitleField()}
              {renderCategoryField()}
              {renderConditionField()}
              {renderDescriptionField()}
              <ListingCommercialFields value={commercial} onChange={setCommercial} />
              {needsSwap(commercial.listingType) && renderSwapField()}
              {renderPublishButton()}
            </View>

            <View style={desktopAddStyles.previewCol}>
              <ThemedText style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: theme.textSecondary, marginBottom: Spacing.three }}>ÖNİZLEME</ThemedText>
              <View style={[desktopAddStyles.previewCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={[desktopAddStyles.previewImageWrap, { backgroundColor: theme.backgroundSelected }]}>
                  {images[0] ? (
                    <FadeImage source={{ uri: images[0].uri }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <IconSymbol name="house.fill" size={32} color={theme.textSecondary} />
                  )}
                </View>
                <View style={{ padding: Spacing.three, gap: Spacing.two }}>
                  <ThemedText style={{ fontWeight: '600', fontSize: 15 }} numberOfLines={1}>{title || 'Başlık burada görünecek'}</ThemedText>
                  {needsPrice(commercial.listingType) && (
                    <ThemedText style={{ fontSize: 15, fontWeight: '700' }}>{parsePrice(commercial.price) !== null ? `${parsePrice(commercial.price)!.toLocaleString('tr-TR')} TL` : 'Fiyat girilmedi'}</ThemedText>
                  )}
                  {needsSwap(commercial.listingType) && (
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary }} numberOfLines={1}>
                      Takas: {swapExpectation || '—'}
                    </ThemedText>
                  )}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one }}>
                    {selectedCategoryName && (
                      <View style={[desktopAddStyles.previewChip, { backgroundColor: Brand.accent + '15' }]}>
                        <ThemedText style={{ fontSize: 11, color: Brand.accent, fontWeight: '600' }}>{selectedCategoryName}</ThemedText>
                      </View>
                    )}
                    <View style={[desktopAddStyles.previewChip, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText style={{ fontSize: 11 }}>{condition}</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
              <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: Spacing.three }}>
                İlanın, yayınlandıktan sonra keşfet ve ana sayfada bu şekilde görünecek.
              </ThemedText>
            </View>
          </View>
        <SiteFooter />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>İlan Ekle</ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.six }}>
        {draftBanner}
        {renderImageUploader(100)}
        {renderTitleField()}
        {renderCategoryField()}
        {renderConditionField()}
        {renderDescriptionField()}
        <ListingCommercialFields value={commercial} onChange={setCommercial} />
        {needsSwap(commercial.listingType) && renderSwapField()}
        {renderPublishButton()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight },
  imageGallery: { flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' },
  imageUpload: { borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 12 },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  moveRow: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', gap: 2 },
  moveBtn: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: Radius.sm },
  moveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  draftBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.sm },
  uploadedImage: { width: '100%', height: '100%' },
  inputGroup: { gap: Spacing.two },
  label: { fontWeight: '600', fontSize: 14 },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  categoryPill: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.full },
  segmentedControl: { flexDirection: 'row', gap: Spacing.two },
  segment: { flex: 1, padding: Spacing.three, borderRadius: Radius.sm, alignItems: 'center' },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center', marginTop: Spacing.four },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

const desktopAddStyles = StyleSheet.create({
  page: { paddingHorizontal: Spacing.seven, paddingVertical: Spacing.six, maxWidth: 1000, width: '100%', alignSelf: 'center' },
  mainRow: { flexDirection: 'row', gap: Spacing.eight, alignItems: 'flex-start' },
  formCol: { flex: 1.3, gap: Spacing.six },
  previewCol: { flex: 1, position: 'sticky' as any, top: Spacing.six },
  previewCard: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  previewImageWrap: { height: 220, justifyContent: 'center', alignItems: 'center' },
  previewChip: { paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Radius.sm },
});
