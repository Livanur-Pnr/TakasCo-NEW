import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, Modal, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useRef } from 'react';
import * as SecureStore from '@/utils/storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api, getImageUrl } from '@/utils/api';
import { useFavorites } from '@/hooks/use-favorites';
import { SiteFooter } from '@/components/web-storefront';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { Alert } from '@/utils/alert';
import { usePageTitle } from '@/utils/use-page-title';
import { ReportModal } from '@/components/report-modal';
import { badgeFor, formatPrice } from '@/utils/listing';
import { StatsLine, TrustBadges } from '@/components/trust';
import { useProductSeo } from '@/utils/seo';
import { ZoomableImage } from '@/components/zoomable-image';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const isDesktopWeb = useIsDesktopWeb();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const { isFavorite, toggleFavorite } = useFavorites();

  const [product, setProduct] = useState<any>(null);
  usePageTitle(product?.title, product ? `${product.title} — ${product.category?.name ?? 'İlan'}. ${formatPrice(product.price) ? `Fiyat: ${formatPrice(product.price)}. ` : ''}${product.swap_expectation ? `Takas beklentisi: ${product.swap_expectation}. ` : ''}${product.description ?? ''}` : null);
  const [loading, setLoading] = useState(true);
  useProductSeo(product);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // Fullscreen Image Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const modalScrollRef = useRef<ScrollView>(null);

  const loadUserData = async () => {
    try {
      const userString = await SecureStore.getItemAsync('user'); 
      if (userString) {
        const userData = JSON.parse(userString);
        setCurrentUserId(userData.id);
      }
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    }
  };

  useEffect(() => {
    fetchProduct();
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Ürün bilgileri alınamadı.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // satıcıyla (ve bu ilanla ilişkili) konuşmayı bulur/oluşturur, mesaj kutusuna gider
  const startChat = async () => {
    try {
      const res = await api.post('/conversations', { user_id: product.user_id, product_id: product.id });
      router.push(`/messages?c=${res.data.id}`);
    } catch (e: any) {
      Alert.alert('Hata', e.response?.data?.message || 'Konuşma başlatılamadı.');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      Alert.alert('Başarılı', 'Bağlantı panoya kopyalandı.');
    } catch {
      // Clipboard API izin/güvenli bağlam nedeniyle reddedilirse eski yönteme dön
      const area = document.createElement('textarea');
      area.value = window.location.href;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      if (ok) Alert.alert('Başarılı', 'Bağlantı panoya kopyalandı.');
      else Alert.alert('Uyarı', 'Bağlantı kopyalanamadı. Adres çubuğundan kopyalayabilirsin.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "İlanı Sil",
      "Bu ilanı silmek istediğinize emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/products/${id}`);
              Alert.alert("Başarılı", "İlanınız silindi.");
              router.replace('/(tabs)');
            } catch (error) {
              console.error("Silme hatası:", error);
              Alert.alert("Hata", "İlan silinirken bir sorun oluştu.");
            }
          }
        }
      ]
    );
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentImageIndex(Math.round(index));
  };

  const openImageModal = (index: number) => {
    setZoomActive(false); // galeri kapanırken yakınlaştırma sıfırlanır, sayfalama yeniden açılır
    setCurrentImageIndex(index);
    setIsModalVisible(true);
    // Modal açıldığında doğru fotoğrafa kaydır
    setTimeout(() => {
      modalScrollRef.current?.scrollTo({ x: index * screenWidth, animated: false });
    }, 100);
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Brand.accent} />
      </ThemedView>
    );
  }

  if (!product) return null;

  const isOwner = currentUserId === product.user_id;
  const canEdit = ![3, 4].includes(Number(product.status));
  const swapOpen = product.listing_type !== 'satilik';
  const priceText = formatPrice(product.price);
  const deliveryChips = [product.meetup_enabled !== false ? 'Elden teslim' : null, product.shipping_enabled ? 'Kargo' : null].filter(Boolean) as string[];

  const imagesList = product.images && product.images.length > 0
    ? product.images
    : product.image_path
      ? [{ id: 'primary', image_path: product.image_path.startsWith('[') ? JSON.parse(product.image_path)[0] : product.image_path }]
      : [];

  // Hem masaüstü hem mobil düzende kullanılan tam ekran galeri modalı (bir kere tanımlanır, ikisinde de render edilir)
  const imageModal = (
    <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={[styles.closeButton, { top: Math.max(insets.top, 20) }]}
          onPress={() => setIsModalVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <IconSymbol name="xmark" size={30} color="#fff" />
        </TouchableOpacity>

        <ScrollView
          ref={modalScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!zoomActive}
          onMomentumScrollEnd={handleScroll}
        >
          {imagesList.map((img: any) => (
            <ZoomableImage
              key={img.id}
              uri={getImageUrl(img.image_path) || ''}
              width={screenWidth}
              height={screenHeight}
              onZoomChange={setZoomActive}
            />
          ))}
        </ScrollView>

        {imagesList.length > 1 && (
          <View style={[styles.paginationContainer, { bottom: 40 }]}>
            {imagesList.map((_: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: index === currentImageIndex ? Brand.accent : 'rgba(255,255,255,0.5)' }
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );

  if (isDesktopWeb) {
    const mainImage = imagesList[currentImageIndex] ?? imagesList[0];
    const memberSince = product.user?.created_at
      ? new Date(product.user.created_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
      : null;

    const renderListingSection = (title: string, items: any[] | undefined) =>
      Array.isArray(items) && items.length > 0 ? (
        <View style={desktopStyles.similarSection}>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 19, marginBottom: Spacing.four }}>{title}</ThemedText>
        <View style={desktopStyles.similarGrid}>
          {items.map((item: any) => {
            const rawPath = item.thumb_path ?? item.images?.[0]?.thumb_path ?? item.images?.[0]?.image_path ?? item.image_path;
            const itemImagePath = rawPath?.startsWith?.('[') ? JSON.parse(rawPath)[0] : rawPath;
            return (
              <TouchableOpacity
                key={item.id}
                style={[desktopStyles.similarCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => router.push(`/product/${item.id}`)}
              >
                <View style={[desktopStyles.similarImageWrap, { backgroundColor: theme.backgroundSelected }]}>
                  {itemImagePath ? (
                    <Image source={{ uri: getImageUrl(itemImagePath) || undefined }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <IconSymbol name="house.fill" size={28} color={theme.textSecondary} />
                  )}
                  <TouchableOpacity
                    style={[desktopStyles.similarFavBadge, { backgroundColor: theme.backgroundElement }]}
                    onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorite(item.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                  >
                    <IconSymbol name="heart.fill" size={11} color={isFavorite(item.id) ? Brand.danger : theme.textSecondary} />
                    {!!item.favorited_by_count && <ThemedText style={desktopStyles.similarFavCount}>{item.favorited_by_count}</ThemedText>}
                  </TouchableOpacity>
                </View>
                <View style={{ padding: Spacing.three }}>
                  <ThemedText style={{ fontWeight: '600', fontSize: 13 }} numberOfLines={1}>{item.title}</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>{formatPrice(item.price) ?? `Takas: ${item.swap_expectation}`}</ThemedText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      ) : null;

    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={desktopStyles.page}>
          <View style={desktopStyles.breadcrumb} accessibilityLabel="Sayfa yolu">
            <TouchableOpacity onPress={() => router.push('/(tabs)')} accessibilityRole="link">
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>Ana Sayfa</ThemedText>
            </TouchableOpacity>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>›</ThemedText>
            {!!product.category?.name && (
              <>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(tabs)/search', params: { categoryId: product.category.id, categoryName: product.category.name } })}
                  accessibilityRole="link"
                >
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>{product.category.name}</ThemedText>
                </TouchableOpacity>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>›</ThemedText>
              </>
            )}
            <ThemedText style={{ fontSize: 13, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{product.title}</ThemedText>
          </View>

          <View style={desktopStyles.mainRow}>
            <View style={desktopStyles.galleryCol}>
              <TouchableOpacity
                activeOpacity={0.95}
                style={[desktopStyles.mainImageWrap, { backgroundColor: theme.backgroundSelected }]}
                onPress={() => openImageModal(currentImageIndex)}
              >
                {mainImage ? (
                  <Image source={{ uri: getImageUrl(mainImage.image_path) || undefined }} style={desktopStyles.mainImage} />
                ) : (
                  <IconSymbol name="house.fill" size={64} color={theme.textSecondary} />
                )}
              </TouchableOpacity>

              {imagesList.length > 1 && (
                <View style={desktopStyles.thumbRow}>
                  {imagesList.map((img: any, index: number) => (
                    <TouchableOpacity
                      key={img.id}
                      onPress={() => setCurrentImageIndex(index)}
                      style={[
                        desktopStyles.thumb,
                        { borderColor: index === currentImageIndex ? Brand.accent : theme.border },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${index + 1}. fotoğrafı göster`}
                    >
                      <Image source={{ uri: getImageUrl(img.image_path) || undefined }} style={desktopStyles.thumbImage} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={desktopStyles.infoCol}>
              <View style={desktopStyles.infoTopRow}>
                <ThemedText style={[desktopStyles.category, { color: Brand.accent }]}>{product.category?.name || 'Kategori Yok'}</ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.one }}>
                  {isOwner && canEdit && (
                    <TouchableOpacity onPress={() => router.push(`/product/${id}/edit`)} style={desktopStyles.iconBtn} accessibilityRole="button" accessibilityLabel="İlanı düzenle">
                      <IconSymbol name="pencil" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                  {isOwner && (
                    <TouchableOpacity onPress={handleDelete} style={desktopStyles.iconBtn} accessibilityRole="button" accessibilityLabel="İlanı sil">
                      <IconSymbol name="trash.fill" size={20} color={Brand.danger} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleShare} style={desktopStyles.iconBtn} accessibilityRole="button" accessibilityLabel="Bağlantıyı kopyala">
                    <IconSymbol name="square.and.arrow.up" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {!isOwner && (
                    <TouchableOpacity onPress={() => setReportOpen(true)} style={desktopStyles.iconBtn} accessibilityRole="button" accessibilityLabel="İlanı şikayet et">
                      <IconSymbol name="flag.fill" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => toggleFavorite(product.id)}
                    style={desktopStyles.iconBtn}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorite(product.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                    accessibilityState={{ selected: isFavorite(product.id) }}
                  >
                    <IconSymbol name="heart.fill" size={22} color={isFavorite(product.id) ? Brand.danger : theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <ThemedText type="title" style={desktopStyles.title}>{product.title}</ThemedText>
              {!!priceText && <ThemedText style={{ fontSize: 26, fontWeight: '800' }}>{priceText}</ThemedText>}

              <View style={desktopStyles.chipsRow}>
                <View style={[desktopStyles.chip, { backgroundColor: Brand.accent + '18' }]}>
                  <ThemedText style={[desktopStyles.chipText, { color: Brand.accent, fontWeight: '700' }]}>{badgeFor(product.listing_type)}</ThemedText>
                </View>
                {!!product.brand && (
                  <View style={[desktopStyles.chip, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={desktopStyles.chipText}>Marka: {product.brand}</ThemedText>
                  </View>
                )}
                {deliveryChips.map((d) => (
                  <View key={d} style={[desktopStyles.chip, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={desktopStyles.chipText}>{d}</ThemedText>
                  </View>
                ))}
                <View style={[desktopStyles.chip, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText style={desktopStyles.chipText}>Durum: {product.condition}</ThemedText>
                </View>
                {(product.city || product.district) && (
                  <View style={[desktopStyles.chip, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={desktopStyles.chipText}>
                      📍 {product.city}{product.city && product.district ? ', ' : ''}{product.district}
                    </ThemedText>
                  </View>
                )}
                {product.views > 0 && (
                  <View style={[desktopStyles.chip, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={desktopStyles.chipText}>{Number(product.views).toLocaleString('tr-TR')} görüntülenme</ThemedText>
                  </View>
                )}
                {!!product.favorited_by_count && (
                  <View style={[desktopStyles.chip, { backgroundColor: Brand.danger + '15' }]}>
                    <ThemedText style={[desktopStyles.chipText, { color: Brand.danger }]}>♥ {product.favorited_by_count} favori</ThemedText>
                  </View>
                )}
              </View>

              {swapOpen && (
                <View style={[desktopStyles.swapBox, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }}>Takas Beklentisi</ThemedText>
                  <ThemedText style={{ fontSize: 15, marginTop: 2 }}>{product.swap_expectation}</ThemedText>
                </View>
              )}

              {!isOwner && swapOpen && (
                <TouchableOpacity style={[desktopStyles.ctaButton, { backgroundColor: Brand.accent }]} onPress={() => router.push(`/product/${id}/offer`)}>
                  <IconSymbol name="arrow.left.arrow.right" size={18} color="#fff" />
                  <ThemedText style={desktopStyles.ctaText}>Bu Ürün İçin Takas Teklifi Gönder</ThemedText>
                </TouchableOpacity>
              )}
              {!isOwner && (
                <TouchableOpacity
                  style={[desktopStyles.ctaButton, { backgroundColor: theme.backgroundSelected }]}
                  onPress={startChat}
                  accessibilityRole="button"
                >
                  <IconSymbol name="message.fill" size={18} color={Brand.accent} />
                  <ThemedText style={[desktopStyles.ctaText, { color: Brand.accent }]}>Satıcıya Mesaj Gönder</ThemedText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[desktopStyles.sellerCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => router.push({ pathname: '/user/[id]', params: { id: product.user_id } })}
              >
                <View style={[desktopStyles.sellerAvatar, { backgroundColor: theme.backgroundSelected, overflow: 'hidden' }]}>
                  {product.user?.profile_photo_path ? (
                    <Image source={{ uri: getImageUrl(product.user.profile_photo_path) || undefined }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <IconSymbol name="person.fill" size={26} color={theme.textSecondary} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>{product.user?.name}</ThemedText>
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                    {[product.user?.city, memberSince ? `${memberSince}'dan beri üye` : null].filter(Boolean).join(' · ')}
                  </ThemedText>
                  {typeof product.user?.products_count === 'number' && (
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{product.user.products_count} aktif ilan</ThemedText>
                  )}
                  <StatsLine stats={product.user?.stats} />
                  <TrustBadges badges={product.user?.stats?.badges} />
                </View>
                <IconSymbol name="chevron.right" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={desktopStyles.descriptionSection}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 17, marginBottom: Spacing.two }}>Ürün Açıklaması</ThemedText>
            <ThemedText style={desktopStyles.descriptionText}>{product.description}</ThemedText>
          </View>

          {renderListingSection('Satıcının Diğer İlanları', product.seller_products)}
          {renderListingSection('Benzer İlanlar', product.similar_products)}
        <SiteFooter />
        </ScrollView>

        {imageModal}
        <ReportModal visible={reportOpen} onClose={() => setReportOpen(false)} targetType="product" targetId={product.id} title={product.title} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.backgroundSelected }]}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={[styles.backButton, { top: Math.max(insets.top, 20) + 10 }]}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <IconSymbol name="chevron.right" size={24} color={theme.text} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          
          {imagesList.length > 0 ? (
            <View>
              <ScrollView 
                ref={scrollRef}
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false} 
                style={{ width: screenWidth, height: 300 }}
                onMomentumScrollEnd={handleScroll}
              >
                {imagesList.map((img: any, index: number) => (
                  <TouchableOpacity activeOpacity={0.9} key={img.id} onPress={() => openImageModal(index)}>
                    <Image source={{ uri: getImageUrl(img.image_path) || undefined }} style={{ width: screenWidth, height: 300, resizeMode: 'cover' }} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Pagination Dots */}
              {imagesList.length > 1 && (
                <View style={styles.paginationContainer}>
                  {imagesList.map((_: any, index: number) => (
                    <View 
                      key={index} 
                      style={[
                        styles.dot, 
                        { backgroundColor: index === currentImageIndex ? Brand.accent : 'rgba(255,255,255,0.5)' }
                      ]} 
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <IconSymbol name="house.fill" size={64} color={theme.textSecondary} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title" style={{ fontSize: 24 }} numberOfLines={2}>{product.title}</ThemedText>
              {!!priceText && <ThemedText style={{ fontSize: 22, fontWeight: '800', marginTop: 2 }}>{priceText}</ThemedText>}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
              {isOwner && canEdit && (
                <TouchableOpacity onPress={() => router.push(`/product/${id}/edit`)} style={{ padding: Spacing.two }} accessibilityRole="button" accessibilityLabel="İlanı düzenle">
                  <IconSymbol name="pencil" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
              {isOwner && (
                <TouchableOpacity onPress={handleDelete} style={{ padding: Spacing.two }} accessibilityRole="button" accessibilityLabel="İlanı sil">
                  <IconSymbol name="trash.fill" size={24} color={Brand.danger} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => toggleFavorite(product.id)}
                style={{ padding: Spacing.two }}
                accessibilityRole="button"
                accessibilityLabel={isFavorite(product.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                accessibilityState={{ selected: isFavorite(product.id) }}
              >
                <IconSymbol name="heart.fill" size={28} color={isFavorite(product.id) ? Brand.danger : theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center', flexWrap: 'wrap' }}>
            <ThemedText style={[styles.category, { color: Brand.accent }]}>{product.category?.name || 'Kategori Yok'}</ThemedText>
            <View style={{ backgroundColor: Brand.accent + '18', paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.sm }}>
              <ThemedText style={{ fontSize: 12, color: Brand.accent, fontWeight: '700' }}>{badgeFor(product.listing_type)}</ThemedText>
            </View>
            {!!product.brand && (
              <View style={{ backgroundColor: theme.backgroundSelected, paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.sm }}>
                <ThemedText style={{ fontSize: 12 }}>Marka: {product.brand}</ThemedText>
              </View>
            )}
            {deliveryChips.map((d) => (
              <View key={d} style={{ backgroundColor: theme.backgroundSelected, paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.sm }}>
                <ThemedText style={{ fontSize: 12 }}>{d}</ThemedText>
              </View>
            ))}
            <View style={{ backgroundColor: theme.backgroundSelected, paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.sm }}>
              <ThemedText style={{ fontSize: 12 }}>Durum: {product.condition}</ThemedText>
            </View>
            {product.views > 0 && (
              <View style={{ backgroundColor: theme.backgroundSelected, paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.sm }}>
                <ThemedText style={{ fontSize: 12 }}>{Number(product.views).toLocaleString('tr-TR')} görüntülenme</ThemedText>
              </View>
            )}
            {(product.city || product.district) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.backgroundSelected, paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.sm }}>
                <ThemedText style={{ fontSize: 12 }}>📍</ThemedText>
                <ThemedText style={{ fontSize: 12 }}>
                  {product.city}{product.city && product.district ? ', ' : ''}{product.district}
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={styles.description}>{product.description}</ThemedText>

          {swapOpen && (
            <View style={[styles.swapExpectation, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="defaultSemiBold">Takas Beklentisi:</ThemedText>
              <ThemedText>{product.swap_expectation}</ThemedText>
            </View>
          )}

          <TouchableOpacity
            style={[styles.ownerCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: product.user_id } })}
          >
            <View style={[styles.ownerAvatar, { backgroundColor: theme.backgroundSelected, overflow: 'hidden' }]}>
              {product.user?.profile_photo_path ? (
                <Image source={{ uri: getImageUrl(product.user.profile_photo_path) || undefined }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <IconSymbol name="person.fill" size={24} color={theme.textSecondary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{product.user?.name}</ThemedText>
              <StatsLine stats={product.user?.stats} />
              <TrustBadges badges={product.user?.stats?.badges} />
              <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>Profili ve diğer ilanlarını gör</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {!isOwner && (
            <TouchableOpacity
              style={[styles.messageButton, { backgroundColor: theme.backgroundSelected }]}
              onPress={startChat}
              accessibilityRole="button"
            >
              <IconSymbol name="message.fill" size={18} color={Brand.accent} />
              <ThemedText style={{ color: Brand.accent, fontWeight: '700' }}>Satıcıya Mesaj Gönder</ThemedText>
            </TouchableOpacity>
          )}
          {!isOwner && (
            <TouchableOpacity onPress={() => setReportOpen(true)} accessibilityRole="button" style={{ alignSelf: 'center', padding: Spacing.two }}>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13, textDecorationLine: 'underline' }}>İlanı şikayet et</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {!isOwner && (
        <View style={[styles.footer, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: Brand.accent }]}
            onPress={() => (swapOpen ? router.push(`/product/${id}/offer`) : startChat())}
          >
            <ThemedText style={styles.buttonText}>{swapOpen ? 'Takas Teklif Et' : 'Satıcıya Mesaj Gönder'}</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {imageModal}
      <ReportModal visible={reportOpen} onClose={() => setReportOpen(false)} targetType="product" targetId={product.id} title={product.title} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imagePlaceholder: { height: 300, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  backButton: { position: 'absolute', left: Spacing.four, padding: Spacing.two, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: Radius.full, zIndex: 10 },
  paginationContainer: { flexDirection: 'row', position: 'absolute', bottom: 10, alignSelf: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { padding: Spacing.four, gap: Spacing.four },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontWeight: '600', fontSize: 16 },
  description: { lineHeight: 24 },
  swapExpectation: { padding: Spacing.four, borderRadius: Radius.md, gap: Spacing.two },
  messageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four, borderRadius: Radius.sm },
  ownerCard: { padding: Spacing.four, borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  ownerAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: Spacing.four, paddingBottom: Spacing.six, borderTopWidth: 1 },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  closeButton: { position: 'absolute', right: 20, zIndex: 100, padding: 10 }
});

const desktopStyles = StyleSheet.create({
  page: { paddingHorizontal: Spacing.seven, paddingVertical: Spacing.six, maxWidth: 1200, width: '100%', alignSelf: 'center', gap: Spacing.eight },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

  mainRow: { flexDirection: 'row', gap: Spacing.seven },
  galleryCol: { flex: 1.1, gap: Spacing.three },
  mainImageWrap: { aspectRatio: 1, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: 76, height: 76, borderRadius: Radius.md, borderWidth: 2, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  infoCol: { flex: 1, gap: Spacing.four },
  infoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBtn: { padding: Spacing.two },
  category: { fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 26, lineHeight: 32 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: 6, borderRadius: Radius.sm },
  chipText: { fontSize: 13 },
  swapBox: { padding: Spacing.four, borderRadius: Radius.md },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.four, borderRadius: Radius.md },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.md, borderWidth: 1, marginTop: Spacing.two },
  sellerAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },

  descriptionSection: { maxWidth: 760 },
  descriptionText: { fontSize: 15, lineHeight: 24 },

  similarSection: {},
  similarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  similarCard: { width: 200, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  similarImageWrap: { height: 150, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  similarFavBadge: { position: 'absolute', top: Spacing.two, right: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 5 },
  similarFavCount: { fontSize: 11, fontWeight: '700' },
});