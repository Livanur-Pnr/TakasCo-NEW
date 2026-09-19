import { useEffect } from 'react';
import { Platform } from 'react-native';

const SITE = 'TakasCo';
const DEFAULT_DESCRIPTION = 'TakasCo ile kullanmadığın eşyaları takas et. Değiştir. Keşfet. Yeniden değerlendir.';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// Web'de sekme başlığı + meta description + Open Graph etiketlerini sayfaya göre günceller (native'de etkisiz)
export function usePageTitle(title?: string | null, description?: string | null) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const fullTitle = title ? `${title} · ${SITE}` : `${SITE} — Değiştir. Keşfet. Yeniden değerlendir.`;
    const desc = (description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 160);

    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', SITE);
  }, [title, description]);
}
