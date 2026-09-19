import { StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ListingType = 'satilik' | 'takas' | 'ikisi';

export interface CommercialValue {
  listingType: ListingType;
  price: string;
  brand: string;
  shipping: boolean;
  meetup: boolean;
}

export const DEFAULT_COMMERCIAL: CommercialValue = { listingType: 'takas', price: '', brand: '', shipping: false, meetup: true };

export const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: 'satilik', label: 'Satmak istiyorum' },
  { value: 'takas', label: 'Takas etmek istiyorum' },
  { value: 'ikisi', label: 'Satış veya takas' },
];

export const needsPrice = (t: ListingType) => t !== 'takas';
export const needsSwap = (t: ListingType) => t !== 'satilik';

// Fiyat alanı Türkçe biçimde girilebilir ("1.500", "1500,50"); API'ye sayı olarak gider
export function parsePrice(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return cleaned !== '' && Number.isFinite(n) && n >= 1 ? n : null;
}

// İlan ver ve ilanı düzenle ekranlarında ortak: ilan türü, fiyat, marka ve teslimat seçenekleri
export function ListingCommercialFields({ value, onChange }: { value: CommercialValue; onChange: (v: CommercialValue) => void }) {
  const theme = useTheme();
  const set = (patch: Partial<CommercialValue>) => onChange({ ...value, ...patch });
  const input = [styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }];

  return (
    <View style={{ gap: Spacing.six }}>
      <View style={styles.group}>
        <ThemedText style={styles.label}>İlan Türü</ThemedText>
        <View style={styles.row}>
          {LISTING_TYPES.map((t) => {
            const active = value.listingType === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => set({ listingType: t.value })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.segment, { backgroundColor: active ? Brand.accent : theme.backgroundSelected }]}
              >
                <ThemedText style={{ color: active ? '#fff' : theme.text, fontSize: 12, textAlign: 'center' }}>{t.label}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {needsPrice(value.listingType) && (
        <View style={styles.group}>
          <ThemedText style={styles.label}>Fiyat (TL) *</ThemedText>
          <TextInput
            style={input}
            value={value.price}
            onChangeText={(t) => set({ price: t.replace(/[^0-9.,]/g, '') })}
            keyboardType="decimal-pad"
            placeholder="Örn. 1.500"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Fiyat"
          />
        </View>
      )}

      <View style={styles.group}>
        <ThemedText style={styles.label}>Marka</ThemedText>
        <TextInput
          style={input}
          value={value.brand}
          onChangeText={(t) => set({ brand: t })}
          maxLength={100}
          placeholder="İsteğe bağlı"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Marka"
        />
      </View>

      <View style={styles.group}>
        <ThemedText style={styles.label}>Teslimat</ThemedText>
        <View style={styles.switchRow}>
          <ThemedText>Elden teslim</ThemedText>
          <Switch value={value.meetup} onValueChange={(v) => set({ meetup: v })} trackColor={{ true: Brand.accent }} accessibilityLabel="Elden teslim" />
        </View>
        <View style={styles.switchRow}>
          <ThemedText>Kargo ile gönderim</ThemedText>
          <Switch value={value.shipping} onValueChange={(v) => set({ shipping: v })} trackColor={{ true: Brand.accent }} accessibilityLabel="Kargo ile gönderim" />
        </View>
      </View>
    </View>
  );
}

// API ilan nesnesinden form değerine
export function commercialFromProduct(p: any): CommercialValue {
  return {
    listingType: (p.listing_type as ListingType) || 'takas',
    price: p.price ? String(p.price).replace('.', ',').replace(/,00$/, '') : '',
    brand: p.brand ?? '',
    shipping: !!p.shipping_enabled,
    meetup: p.meetup_enabled !== false,
  };
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  label: { fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', gap: Spacing.two },
  segment: { flex: 1, paddingVertical: Spacing.three, paddingHorizontal: Spacing.two, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
