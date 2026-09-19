import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CashDirection = 'sender_pays' | 'receiver_pays';
export interface CashValue { amount: string; direction: CashDirection | null }
export const NO_CASH: CashValue = { amount: '', direction: null };

const QUICK = [500, 1000, 2500];

// "1.500" / "1500,50" gibi girişleri sayıya çevirir; geçersizse null
export function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return cleaned !== '' && Number.isFinite(n) && n >= 1 ? n : null;
}

// API gövdesine eklenecek nakit alanları; yön seçilmediyse ya da tutar yoksa boş döner
export function cashPayload(v: CashValue): { cash_amount?: number; cash_direction?: CashDirection } {
  const amount = parseAmount(v.amount);
  return amount !== null && v.direction ? { cash_amount: amount, cash_direction: v.direction } : {};
}

// Tutar girilip yön seçilmemişse (ya da tersi) kullanıcıya gösterilecek hata
export function cashError(v: CashValue): string | null {
  const hasAmount = v.amount.trim() !== '';
  if (hasAmount && parseAmount(v.amount) === null) return 'Geçerli bir tutar girin.';
  if (hasAmount && !v.direction) return 'Nakit farkını kimin ödeyeceğini seçin.';
  if (!hasAmount && v.direction) return 'Nakit farkı için bir tutar girin.';
  return null;
}

// Takas teklifine / karşı teklife isteğe bağlı para farkı ekler
export function CashAdjustment({ value, onChange, labels }: { value: CashValue; onChange: (v: CashValue) => void; labels?: { pay: string; ask: string } }) {
  const theme = useTheme();
  const pay = labels?.pay ?? 'Ben ödeyeceğim';
  const ask = labels?.ask ?? 'Karşı taraftan istiyorum';

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, { backgroundColor: active ? Brand.accent : theme.backgroundSelected }]}
    >
      <ThemedText style={{ color: active ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>{label}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrap}>
      <ThemedText type="defaultSemiBold">Para farkı ekle <ThemedText style={{ fontWeight: '400', color: theme.textSecondary, fontSize: 12 }}>(isteğe bağlı)</ThemedText></ThemedText>
      <View style={styles.row}>
        {chip(pay, value.direction === 'sender_pays', () => onChange({ ...value, direction: value.direction === 'sender_pays' ? null : 'sender_pays' }))}
        {chip(ask, value.direction === 'receiver_pays', () => onChange({ ...value, direction: value.direction === 'receiver_pays' ? null : 'receiver_pays' }))}
      </View>
      <View style={styles.row}>
        {QUICK.map((q) => chip(`${q.toLocaleString('tr-TR')} TL`, parseAmount(value.amount) === q, () => onChange({ ...value, amount: String(q) })))}
      </View>
      <TextInput
        value={value.amount}
        onChangeText={(t) => onChange({ ...value, amount: t.replace(/[^0-9.,]/g, '') })}
        keyboardType="decimal-pad"
        placeholder="Tutar (TL)"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Para farkı tutarı"
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
      />
      {(!!value.amount || !!value.direction) && (
        <TouchableOpacity onPress={() => onChange(NO_CASH)} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <ThemedText style={{ color: Brand.danger, fontSize: 13 }}>Para farkını kaldır</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Teklif kartlarında gösterilecek özet cümle; kişi bakış açısına göre ("Sen ..." / "Karşı taraf ...")
export function cashSummary(trade: { cash_amount?: number | null; cash_direction?: string | null }, iAmSender: boolean): string | null {
  if (!trade.cash_amount || !trade.cash_direction) return null;
  const amount = `${Number(trade.cash_amount).toLocaleString('tr-TR')} TL`;
  const senderPays = trade.cash_direction === 'sender_pays';
  const iPay = senderPays === iAmSender;
  return iPay ? `Sen ${amount} nakit fark ödeyeceksin` : `Karşı taraf ${amount} nakit fark ödeyecek`;
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full },
  input: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.three, fontSize: 16 },
});
