import { create } from 'axios';
import * as SecureStore from './storage';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
//React Native / Expo) tarafı ile backend (Laravel API) tarafını birbirine bağlayan API İletişim ve Oturum Yönetimi (Axios Servisi) katmanı

// Fiziksel bir cihazda Expo Go ile çalışırken 127.0.0.1 telefonun kendisini,
// 10.0.2.2 ise sadece Android emülatörünü işaret eder - gerçek cihaz bilgisayara
// asla bu adreslerle ulaşamaz. Bunun yerine Metro'nun bağlı olduğu LAN IP'sini kullanıyoruz.
function resolveApiHost(): string {
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')?.[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host;
  }
  // Web önizleme / iOS simülatör / Metro host bilgisi yoksa eski davranışa geri dön
  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
}

// Prod build'de EXPO_PUBLIC_API_URL (örn. https://api.takasco.com) verilir; yoksa geliştirme için LAN/localhost çözümü kullanılır.
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE_URL = ENV_API_URL ? ENV_API_URL.replace(/\/+$/, '') : `http://${resolveApiHost()}:8000`;
const BASE_URL = `${API_BASE_URL}/api`;

export const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}/storage/${path}`;
};

export const api = create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Her istekte otomatik çalışacak aracı (Interceptor)
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Token okuma hatası:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Ağ yok / 429 / 5xx gibi durumlarda tüm ekranların aynı, anlaşılır Türkçe mesajı göstermesi için
// `error.response.data.message` normalize edilir (ekranlar zaten bu alanı okuyor).
function normalizeErrorMessage(error: any) {
  const status: number | undefined = error.response?.status;
  let message: string | null = null;

  if (!error.response) {
    message = 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.';
    error.response = { status: 0, data: {} };
  } else if (status === 429) {
    message = 'Çok fazla deneme yaptın. Lütfen biraz bekleyip tekrar dene.';
  } else if (status && status >= 500) {
    message = 'Sunucuda bir sorun oluştu. Lütfen daha sonra tekrar dene.';
  } else if (status === 403 && !error.response.data?.message) {
    message = 'Bu işlem için yetkin yok.';
  } else if (status === 404 && !error.response.data?.message) {
    message = 'Aradığın kayıt bulunamadı.';
  }

  if (message) {
    const data = typeof error.response.data === 'object' && error.response.data ? error.response.data : {};
    error.response.data = { ...data, message };
  }
  error.userMessage = error.response?.data?.message;
}

let verifyRedirectInFlight = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    normalizeErrorMessage(error);

    // Login veya register isteklerinde 401 dönerse (örn: yanlış şifre), interceptor'ı atla
    const isAuthRequest = error.config?.url?.includes('/login') || error.config?.url?.includes('/register');
    
    if (error.response?.status === 401 && !isAuthRequest) {
      console.warn(`Oturum süresi doldu veya yetkisiz erişim (${error.config?.url}), çıkış yapılıyor...`);
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('user');
      router.replace('/(auth)/welcome');
    }

    // Doğrulanmamış bir hesapla kısıtlı bir uca istek atıldıysa (bkz. EnsureEmailVerifiedApi),
    // kullanıcıyı nerede olursa olsun doğrulama kodu ekranına yönlendir. Sayfa ilk açıldığında
    // birden fazla istek aynı anda 403 dönebileceğinden, kısa bir süre için tekrar tetiklenmesi engellenir.
    if (error.response?.status === 403 && error.response?.data?.email_verified === false && !verifyRedirectInFlight) {
      verifyRedirectInFlight = true;
      router.replace('/verify-email');
      setTimeout(() => { verifyRedirectInFlight = false; }, 1500);
    }
    return Promise.reject(error);
  }
);
