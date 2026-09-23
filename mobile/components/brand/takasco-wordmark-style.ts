// "TakasCo" yazı logosunun (3D kabartma) ortak tanımları — web (takasco-wordmark.web.tsx) ve
// native (takasco-wordmark.tsx) sürümleri aynı paletleri ve derinlik hesabını kullanır.
// Font: Outfit 700 (Google Fonts, OFL). Görsel referans: koyu zeminde koyu yeşil yüz, ince açık yeşil kenar,
// aşağı-sağa koyu yeşil derinlik ve yumuşak gölge.

export type WordmarkVariant = 'auto' | 'dark' | 'light' | 'brand';

export type TakascoWordmarkProps = {
  size: number;
  // auto: uygulama temasına göre dark/light; brand: yeşil marka paneli üstü (beyaz yüz)
  variant?: WordmarkVariant;
  animate?: boolean;
};

type Palette = {
  face: string; // web: background-clip:text ile yazıya kırpılan yüz
  solid: string; // native: düz yüz rengi
  rim: string;
  rimTop: string;
  ext: [string, string]; // derinliğin üst → alt rengi
  shadow: string;
  shine: string;
};

export const WORDMARK_PALETTES: Record<Exclude<WordmarkVariant, 'auto'>, Palette> = {
  dark: {
    face: 'linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 45%,rgba(0,0,0,.22) 100%),linear-gradient(90deg,#16523a 0%,#1b6443 55%,#237a52 100%)',
    solid: '#1f6b46',
    rim: '#2c8457',
    rimTop: 'rgba(150,235,190,.55)',
    ext: ['#0f3a28', '#061a11'],
    shadow: 'rgba(0,0,0,.65)',
    shine: 'rgba(190,255,215,.32)',
  },
  light: {
    face: 'linear-gradient(180deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 45%,rgba(0,0,0,.14) 100%),linear-gradient(90deg,#1a7045 0%,#1e7f4e 55%,#25935b 100%)',
    solid: '#1e7f4e',
    rim: '#2f9a62',
    rimTop: 'rgba(255,255,255,.75)',
    ext: ['#125236', '#0a3322'],
    shadow: 'rgba(10,60,35,.28)',
    shine: 'rgba(255,255,255,.42)',
  },
  brand: {
    face: 'linear-gradient(180deg,#ffffff 0%,#f1fbf5 50%,#cdeedb 100%)',
    solid: '#ffffff',
    rim: 'rgba(255,255,255,.95)',
    rimTop: '#ffffff',
    ext: ['#0e5a36', '#083a23'],
    shadow: 'rgba(0,20,10,.40)',
    shine: 'rgba(255,255,255,.9)',
  },
};

export function resolveVariant(variant: WordmarkVariant, scheme: 'light' | 'dark') {
  return variant === 'auto' ? (scheme === 'dark' ? 'dark' : 'light') : variant;
}

// Derinlik yazı boyutuyla orantılı; küçük boyutlarda bile en az 2px görünür.
export function extrusionDepth(size: number) {
  return Math.max(2, Math.round(size * 0.075));
}

function mix(a: string, b: string, t: number) {
  const parse = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = parse(a);
  const B = parse(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Web: 1px'lik katmanlardan oluşan kabartma + altta yumuşak gölge (text-shadow yığını)
export function extrusionShadow(size: number, p: Palette) {
  const d = extrusionDepth(size);
  const layers: string[] = [];
  for (let i = 1; i <= d; i++) layers.push(`${(i * 0.55).toFixed(2)}px ${i}px 0 ${mix(p.ext[0], p.ext[1], i / d)}`);
  layers.push(`${(d * 0.55).toFixed(1)}px ${(d + size * 0.09).toFixed(1)}px ${(size * 0.22).toFixed(1)}px ${p.shadow}`);
  layers.push(`0 ${(size * 0.02).toFixed(1)}px ${(size * 0.04).toFixed(1)}px rgba(0,0,0,.25)`);
  return layers.join(',');
}

// Web: kenar — glif siluetinden (fontun üst üste binen konturlarından etkilenmez) ince çerçeve + üstte ışık kenarı
export function rimFilter(size: number, p: Palette) {
  const w = Math.max(0.5, (size / 88) * 0.9).toFixed(2);
  return `drop-shadow(0 -${w}px 0 ${p.rimTop}) drop-shadow(${w}px 0 0 ${p.rim}) drop-shadow(-${w}px 0 0 ${p.rim}) drop-shadow(0 ${w}px 0 ${p.rim})`;
}
