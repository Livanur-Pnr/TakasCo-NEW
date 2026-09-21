import { Platform } from 'react-native';
import { Brand, Gradient } from '@/constants/theme';
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

    /* ── kimlik doğrulama ekranları ── */
    [data-field] { transition: border-color ${fast} ease, box-shadow ${fast} ease, background-color ${fast} ease; }
    [data-fieldicon] > * { transition: color ${fast} ease; }
    [data-iconbtn] { transition: background-color ${fast} ease; }
    [data-chip] { transition: transform ${fast} ease, background-color ${fast} ease, border-color ${fast} ease, box-shadow ${fast} ease; cursor: default; }
    [data-chipicon], [data-ctaarrow] { transition: transform ${fast} ease; }

    /* hover yalnızca fareli cihazlarda; dokunmatikte basma durumu kullanılır */
    @media (hover: hover) and (pointer: fine) {
      [data-chip]:hover { transform: translateY(-1px); }
      [data-chip="dark"]:hover { background-color: rgba(255, 255, 255, 0.18) !important; border-color: rgba(255, 255, 255, 0.4) !important; }
      [data-chip="light"]:hover { background-color: #e6f6ed !important; border-color: rgba(27, 122, 67, 0.45) !important; box-shadow: 0 2px 8px rgba(20, 70, 45, 0.08); }
      [data-chip]:hover [data-chipicon] { transform: scale(1.14); }
      [data-field][data-state="idle"]:hover { border-color: rgba(27, 122, 67, 0.5) !important; }
      [data-iconbtn]:hover { background-color: rgba(27, 122, 67, 0.09) !important; }
      [data-cta="primary"]:hover { background-image: ${Gradient.ctaHover} !important; }
      [data-cta="light"]:hover { background-color: #ecfdf5 !important; }
      [data-cta="ghost"]:hover { background-color: rgba(255, 255, 255, 0.14) !important; border-color: rgba(255, 255, 255, 0.85) !important; }
      [data-cta="outline"]:hover { background-color: #eef8f2 !important; border-color: rgba(27, 122, 67, 0.5) !important; }
      [data-cta]:hover [data-ctaarrow] { transform: translateX(3px); }
    }

    /* arka plandaki çok yavaş, düşük opaklıklı ortam hareketi (yalnızca transform) */
    @keyframes tk-float-a { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes tk-float-b { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
    @keyframes tk-drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(14px, -10px); } }
    [data-ambient="a"] { animation: tk-float-a 13s ease-in-out infinite; will-change: transform; }
    [data-ambient="b"] { animation: tk-float-b 16s ease-in-out infinite; will-change: transform; }
    [data-ambient="c"] { animation: tk-drift 22s ease-in-out infinite; will-change: transform; }
    @media (prefers-reduced-motion: reduce) { [data-ambient] { animation: none !important; } }
    /* marka paneli sahnesi: 12 sn'lik tek döngü (bildirim → mesaj → teklif → tamamlandı). Yalnızca opacity/transform. */
    @keyframes tk-toast { 0%, 6% { opacity: 0; transform: translateY(-10px); } 13%, 30% { opacity: 1; transform: translateY(0); } 36%, 100% { opacity: 0; transform: translateY(-6px); } }
    @keyframes tk-msg { 0%, 37% { opacity: 0; transform: translateY(10px); } 44%, 88% { opacity: 1; transform: translateY(0); } 94%, 100% { opacity: 0; transform: translateY(6px); } }
    @keyframes tk-offer { 0%, 49% { opacity: 0; transform: translateX(-14px); } 56%, 92% { opacity: 1; transform: translateX(0); } 97%, 100% { opacity: 0; transform: translateX(-8px); } }
    @keyframes tk-accept { 0%, 66% { opacity: 1; } 70%, 100% { opacity: 0; } }
    @keyframes tk-done { 0%, 67% { opacity: 0; transform: scale(0.96); } 72%, 92% { opacity: 1; transform: scale(1); } 97%, 100% { opacity: 0; } }
    @keyframes tk-heart { 0%, 38%, 50%, 100% { transform: scale(1); } 44% { transform: scale(1.18); } }
    @keyframes tk-ripple { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(1.7); opacity: 0; } }
    @keyframes tk-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes tk-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.6; } }
    [data-scene="toast"] { animation: tk-toast 12s ease-in-out infinite both; }
    [data-scene="msg"] { animation: tk-msg 12s ease-in-out infinite both; }
    [data-scene="offer"] { animation: tk-offer 12s ease-in-out infinite both; }
    [data-scene="accept"] { animation: tk-accept 12s ease-in-out infinite both; }
    [data-scene="done"] { animation: tk-done 12s ease-in-out infinite both; }
    [data-scene="heart"] { animation: tk-heart 12s ease-in-out infinite; }
    [data-scene="ripple"] { animation: tk-ripple 4.6s ease-out infinite; }
    [data-scene="orbit"] { animation: tk-orbit 90s linear infinite; }
    [data-scene="twinkle"] { animation: tk-twinkle 7s ease-in-out infinite; }
    [data-scene] { will-change: transform, opacity; }
    @media (prefers-reduced-motion: reduce) { [data-scene] { animation: none !important; } }

    /* görünmeyen slaytta ya da ekran dışına kaydırılmış vitrinde sürekli animasyonlar durur (boşuna çizim yapılmaz) */
    [aria-hidden="true"] [data-scene], [aria-hidden="true"] [data-ambient],
    [data-heropaused="true"] [data-scene], [data-heropaused="true"] [data-ambient] { animation-play-state: paused !important; }


    /* metin bağlantıları (alt bilgi vb.): renk + alt çizgi */
    [data-textlink="true"]:hover { text-decoration: underline; color: ${Brand.accent} !important; }
  `;
  document.head.appendChild(style);
}
