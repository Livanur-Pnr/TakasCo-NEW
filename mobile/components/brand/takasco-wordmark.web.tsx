import { CSSProperties, useEffect, useState } from 'react';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/components/ui/motion';
import {
  extrusionDepth,
  extrusionShadow,
  resolveVariant,
  rimFilter,
  TakascoWordmarkProps,
  WORDMARK_PALETTES,
} from '@/components/brand/takasco-wordmark-style';

const WORD = 'TakasCo';
// text= ile yalnızca bu harflerin alt kümesi indirilir (birkaç KB). Outfit başka bir metinde kullanılacaksa bu parametre kaldırılmalı.
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Outfit:wght@700&display=swap&text=TakasCo';

let fontReady = false;
let fontPromise: Promise<void> | null = null;

function loadFont(): Promise<void> {
  if (fontReady) return Promise.resolve();
  if (!fontPromise) {
    fontPromise = new Promise((resolve) => {
      const done = () => { fontReady = true; resolve(); };
      const timeout = setTimeout(done, 2500); // font gelmezse yedek fontla göster, logoyu hiç gizli bırakma
      const waitForFace = () => {
        document.fonts.load(`700 1em Outfit`, WORD).then(() => { clearTimeout(timeout); done(); }, done);
      };
      const existing = document.getElementById('tk-wordmark-font') as HTMLLinkElement | null;
      if (existing) {
        waitForFace();
        return;
      }
      const link = document.createElement('link');
      link.id = 'tk-wordmark-font';
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      link.onload = waitForFace;
      link.onerror = done;
      document.head.appendChild(link);
    });
  }
  return fontPromise;
}

function installStyles() {
  if (document.getElementById('tk-wordmark-styles')) return;
  const style = document.createElement('style');
  style.id = 'tk-wordmark-styles';
  style.textContent = `
    /* Kabartmanın gölgesi kutunun dışına taşar: padding ile maske alanı genişletilir, negatif margin ile yerleşim boyutu korunur */
    .tk-wm {
      position: relative; display: inline-block; vertical-align: middle; white-space: nowrap;
      font-family: 'Outfit', system-ui, -apple-system, 'Segoe UI', sans-serif; font-weight: 700;
      line-height: 1.05; letter-spacing: -0.012em;
      padding: 0 .3em .45em 0; margin: 0 -.3em -.45em 0;
      opacity: 0; transition: opacity .2s ease, transform .35s cubic-bezier(.2, 0, 0, 1);
    }
    .tk-wm--ready { opacity: 1; }
    .tk-wm__back { display: block; }
    .tk-wm__face, .tk-wm__shine {
      position: absolute; left: 0; top: 0; display: block;
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .tk-wm__shine { background-size: 300% 100%; background-repeat: no-repeat; background-position: 130% 0; pointer-events: none; }

    /* açılış: soldan sağa açılır, yüz derinliğin üstüne "kalkar" */
    .tk-wm--anim.tk-wm--ready {
      -webkit-mask-image: linear-gradient(90deg, #000 40%, transparent 60%); mask-image: linear-gradient(90deg, #000 40%, transparent 60%);
      -webkit-mask-size: 260% 100%; mask-size: 260% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
      -webkit-mask-position: 0 0; mask-position: 0 0;
      animation: tk-wm-reveal 1.1s cubic-bezier(.22, .8, .2, 1) both;
    }
    .tk-wm--anim.tk-wm--ready .tk-wm__face { animation: tk-wm-lift .9s cubic-bezier(.2, .9, .25, 1) .25s both; }
    /* sürekli: birkaç saniyede bir yüzeyden geçen yumuşak ışık */
    .tk-wm--anim.tk-wm--ready .tk-wm__shine { animation: tk-wm-shine 7s cubic-bezier(.45, 0, .2, 1) 1.6s infinite; }
    @keyframes tk-wm-reveal {
      from { -webkit-mask-position: 100% 0; mask-position: 100% 0; }
      to { -webkit-mask-position: 0 0; mask-position: 0 0; }
    }
    @keyframes tk-wm-lift { from { transform: translate(var(--tk-dx), var(--tk-dy)); } to { transform: none; } }
    @keyframes tk-wm-shine { 0% { background-position: 130% 0; } 32%, 100% { background-position: -30% 0; } }

    @media (hover: hover) and (pointer: fine) { .tk-wm:hover { transform: translateY(-1px); } }
    @media (prefers-reduced-motion: reduce) {
      .tk-wm, .tk-wm__face, .tk-wm__shine { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}

// "TakasCo" yazı logosu (web): koyu yeşil kabartma, ince açık kenar, derinlik + gölge; açılış ve sürekli ışık animasyonu.
// Ekran okuyucular için tek bir "TakasCo" etiketi okunur, dekoratif katmanlar gizlidir.
export function TakascoWordmark({ size, variant = 'auto', animate = true }: TakascoWordmarkProps) {
  const { scheme } = useAppTheme();
  const reduced = useReducedMotion();
  const palette = WORDMARK_PALETTES[resolveVariant(variant, scheme)];
  const [ready, setReady] = useState(fontReady);

  useEffect(() => {
    installStyles();
    if (fontReady) return;
    let alive = true;
    loadFont().then(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  const d = extrusionDepth(size);
  const rootStyle = { fontSize: size, '--tk-dx': `${(d * 0.55).toFixed(1)}px`, '--tk-dy': `${d}px` } as CSSProperties;
  const className = ['tk-wm', ready && 'tk-wm--ready', animate && !reduced && 'tk-wm--anim'].filter(Boolean).join(' ');

  return (
    <span className={className} style={rootStyle} role="img" aria-label={WORD}>
      <span className="tk-wm__back" aria-hidden="true" style={{ color: palette.ext[0], textShadow: extrusionShadow(size, palette) }}>
        {WORD}
      </span>
      <span className="tk-wm__face" aria-hidden="true" style={{ backgroundImage: palette.face, filter: rimFilter(size, palette) }}>
        {WORD}
      </span>
      <span
        className="tk-wm__shine"
        aria-hidden="true"
        style={{ backgroundImage: `linear-gradient(100deg, transparent 42%, ${palette.shine} 50%, transparent 58%)` }}
      >
        {WORD}
      </span>
    </span>
  );
}
