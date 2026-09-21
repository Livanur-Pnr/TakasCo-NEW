import { Platform } from 'react-native';
import { Brand } from '@/constants/theme';

// Web'de klavye ile gezinen kullanıcılar için görünür odak halkası ve azaltılmış hareket tercihi.
// (react-native-web odak çerçevesini varsayılan olarak göstermiyor.)
export function installWebA11yStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('takasco-a11y')) return;

  const style = document.createElement('style');
  style.id = 'takasco-a11y';
  style.textContent = `
    [tabindex]:focus-visible, button:focus-visible, a:focus-visible, [role="button"]:focus-visible,
    [role="link"]:focus-visible {
      outline: 2px solid ${Brand.accent} !important;
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}
