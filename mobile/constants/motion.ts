import { Easing } from 'react-native';

// TakasCo hareket sistemi: tüm animasyon süre/eğri/mesafe değerleri buradan gelir (bileşenlerde rastgele sayı yazılmaz).
// İlke: her şey etkileşime tepki verir, hiçbir şey abartılmaz. Yalnızca transform ve opacity animasyonu yapılır.

export const Duration = {
  micro: 140,   // düğme/çip geri bildirimi
  fast: 180,    // hover, odak, küçük geçişler
  normal: 240,  // dropdown, toast, sayfa öğeleri
  slow: 380,    // bölüm girişi, kaydırma ile belirme
  modal: 300,   // modal + arka plan
  ad: 700,      // vitrin (carousel) geçişleri
} as const;

export const Ease = {
  standard: Easing.bezier(0.2, 0, 0, 1),     // genel amaçlı
  decelerate: Easing.bezier(0, 0, 0.2, 1),   // girişler (hızlı başlar, yavaş oturur)
  accelerate: Easing.bezier(0.4, 0, 1, 1),   // çıkışlar
  emphasized: Easing.bezier(0.3, 0, 0, 1),   // vurgulu geçişler (modal, vitrin)
} as const;

// Kayma mesafeleri (px)
export const Distance = { xs: 4, sm: 8, md: 12, lg: 18 } as const;

// Etkileşim ölçekleri ve yükselme miktarları (piksel/oran)
export const Interaction = {
  pressButton: 0.97,   // basınca
  pressRow: 0.99,      // geniş satır/kart basınca
  pressIcon: 0.94,     // ikon düğmesi basınca
  hoverIcon: 1.06,     // ikon düğmesi üzerine gelince
  liftButton: -1,      // düğme üzerine gelince (px)
  liftCard: -3,        // kart üzerine gelince (px)
  imageZoom: 1.03,     // kart görselinin hover yakınlaşması
} as const;

// Gölgeler (web, boxShadow): hover ve kart yükselmesi için tek kaynak
export const Shadow = {
  button: '0 6px 14px rgba(20, 70, 45, 0.16)',
  card: '0 12px 26px rgba(15, 60, 35, 0.13)',
  ring: '0 0 0 3px rgba(28, 120, 72, 0.18)',   // odak halkası (input)
  ringDanger: '0 0 0 3px rgba(220, 38, 38, 0.14)',
  authCard: '0 1px 2px rgba(16, 40, 28, 0.05), 0 18px 44px rgba(15, 60, 35, 0.10)',  // giriş kartı: ince katman + yumuşak derinlik
  cta: '0 8px 20px rgba(20, 90, 50, 0.24)',
} as const;

// Stagger: ilk birkaç öğe için küçük gecikme; uzun listelerde kuyruk oluşmaz
export const STAGGER_STEP = 50;
export const STAGGER_MAX_ITEMS = 6;
export const staggerDelay = (index: number) => Math.min(index, STAGGER_MAX_ITEMS) * STAGGER_STEP;
