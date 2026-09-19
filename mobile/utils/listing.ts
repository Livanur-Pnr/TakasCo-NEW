export type ListingType = 'satilik' | 'takas' | 'ikisi';

export const LISTING_BADGE: Record<ListingType, string> = {
  satilik: 'Satılık',
  takas: '↔ Takasa Açık',
  ikisi: 'Satış / Takas',
};

export function formatPrice(price: number | string | null | undefined): string | null {
  const n = Number(price);
  return price !== null && price !== undefined && price !== '' && Number.isFinite(n) && n > 0 ? `${n.toLocaleString('tr-TR')} TL` : null;
}

export function badgeFor(type: string | null | undefined): string {
  return LISTING_BADGE[(type as ListingType) ?? 'takas'] ?? LISTING_BADGE.takas;
}
