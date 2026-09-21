import { Platform } from 'react-native';
import { Brand } from '@/constants/theme';
import { Duration } from '@/constants/motion';

// Web'e özgü ortak hareket kuralları (CSS): renk geçişleri, input hover/odak, navigasyon alt çizgisi, kart görseli yakınlaşması.
// Düğmelerin hover/basma hareketi `components/ui/touchable.tsx` içindedir; buradaki kurallar onunla çakışmaz.
// `prefers-reduced-motion` için web-a11y.ts'deki kural tüm geçişleri zaten kapatır.
export function installWebMotionStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('takasco-motion')) return;

  const fast = `${Duration.fast}ms`;
  const style = document.createElement('style');
  style.id = 'takasco-motion';
  style.textContent = `
    /* renk/kenarlık geçişleri: seçili çip, aktif sekme, hover tonu gibi değişimler yumuşak olur */
    [data-animated="true"], [role="button"], [role="link"] {
      transition: background-color ${fast} ease, border-color ${fast} ease, color ${fast} ease;
    }
    [role="link"]:hover:not([data-animated="true"]) { filter: brightness(1.05); }

    /* metin girişleri: hover → kenarlık tonu, odak → kenarlık + halka (JS stili odakta halkayı ekler) */
    input, textarea { transition: border-color ${fast} ease, box-shadow ${fast} ease, background-color ${fast} ease; }
    input:hover:not(:focus):not([aria-invalid="true"]), textarea:hover:not(:focus):not([aria-invalid="true"]) { border-color: rgba(28, 120, 72, 0.45) !important; }

    /* gezinme bağlantıları: alttan kayan çizgi (data-nav="link"; aktifken data-active="true") */
    [data-nav="link"] { position: relative; }
    [data-nav="link"]::after {
      content: ''; position: absolute; left: 12%; right: 12%; bottom: 2px; height: 2px; border-radius: 2px;
      background: ${Brand.accent}; transform: scaleX(0); transform-origin: left center;
      transition: transform ${Duration.normal}ms cubic-bezier(0.2, 0, 0, 1);
    }
    [data-nav="link"]:hover::after, [data-nav="link"][data-active="true"]::after { transform: scaleX(1); }

    /* metin bağlantıları (alt bilgi vb.): renk + alt çizgi */
    [data-textlink="true"]:hover { text-decoration: underline; color: ${Brand.accent} !important; }
  `;
  document.head.appendChild(style);
}
