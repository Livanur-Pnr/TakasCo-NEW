import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/utils/api';
import * as SecureStore from '@/utils/storage';

// Ürün kartlarındaki kalp butonlarının favori durumunu tek yerden yönetir.
export function useFavorites() {
  const router = useRouter();
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  const loadFavorites = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        setFavoriteIds(new Set());
        return;
      }
      const response = await api.get('/favorites');
      setFavoriteIds(new Set(response.data.map((p: { id: number }) => p.id)));
    } catch (error) {
      // giriş yapılmamışsa ya da istek başarısız olursa favori listesi boş kalır
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (productId: number) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      Alert.alert('Giriş Gerekli', 'Favorilere eklemek için giriş yapmalısın.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    // iyimser güncelleme: sunucu cevabını beklemeden arayüzü hemen güncelle
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });

    try {
      const response = await api.post(`/products/${productId}/favorite`);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        response.data.is_favorite ? next.add(productId) : next.delete(productId);
        return next;
      });
    } catch (error) {
      // istek başarısız oldu, iyimser değişikliği geri al
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.has(productId) ? next.delete(productId) : next.add(productId);
        return next;
      });
      Alert.alert('Hata', 'Favori durumu güncellenemedi. Lütfen tekrar dene.');
    }
  }, [router]);

  return { favoriteIds, isFavorite: (id: number) => favoriteIds.has(id), toggleFavorite, refreshFavorites: loadFavorites };
}
