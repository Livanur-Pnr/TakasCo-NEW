import { useEffect } from 'react';
import { Platform } from 'react-native';
import { getImageUrl } from '@/utils/api';

const CONDITION_SCHEMA: Record<string, string> = {
  'Sıfır': 'https://schema.org/NewCondition',
  'Az Kullanılmış': 'https://schema.org/UsedCondition',
  'Eskimiş': 'https://schema.org/UsedCondition',
};

function firstImage(product: any): string | null {
  const raw = product?.images?.[0]?.image_path ?? product?.image_path;
  const path = typeof raw === 'string' && raw.startsWith('[') ? JSON.parse(raw)[0] : raw;
  return path ? getImageUrl(path) : null;
}

// Ürün sayfası için schema.org/Product JSON-LD, canonical bağlantı ve og:image (yalnızca web).
// Fiyat yalnızca ilanda gerçekten varsa (satılık / ikisi) eklenir; takas ilanı için offers yazılmaz.
export function useProductSeo(product: any | null) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !product) return;

    const url = window.location.origin + '/product/' + product.id;
    const image = firstImage(product);

    const data: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: String(product.description ?? '').slice(0, 300),
      url,
      ...(image ? { image: [image] } : {}),
      ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
      ...(product.category?.name ? { category: product.category.name } : {}),
      ...(CONDITION_SCHEMA[product.condition] ? { itemCondition: CONDITION_SCHEMA[product.condition] } : {}),
    };
    if (product.price && product.listing_type !== 'takas') {
      data.offers = {
        '@type': 'Offer',
        price: String(product.price),
        priceCurrency: 'TRY',
        availability: Number(product.status) === 3 ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        url,
      };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'takasco-ld-json';
    // </script> kaçışı: içerik JSON olarak yazılır, kullanıcı metni HTML olarak yorumlanamaz
    script.text = JSON.stringify(data).replace(/</g, '\\u003c');
    document.getElementById('takasco-ld-json')?.remove();
    document.head.appendChild(script);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    let og = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    if (image) {
      if (!og) {
        og = document.createElement('meta');
        og.setAttribute('property', 'og:image');
        document.head.appendChild(og);
      }
      og.setAttribute('content', image);
    }

    return () => {
      document.getElementById('takasco-ld-json')?.remove();
      document.head.querySelector('link[rel="canonical"]')?.remove();
      document.head.querySelector('meta[property="og:image"]')?.remove();
    };
  }, [product]);
}
