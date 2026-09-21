import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { AnimatedModal } from '@/components/ui/animated-modal';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';

const LABELS = ['', 'Çok kötü', 'Kötü', 'Idare eder', 'İyi', 'Çok iyi'];

// Tamamlanan takas sonrası karşı tarafı 1-5 puan ve isteğe bağlı yorumla değerlendirme
export function ReviewModal({ tradeId, partnerName, onClose, onDone }: { tradeId: number; partnerName?: string; onClose: () => void; onDone: () => void }) {
  const theme = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!rating || busy) return;
    setBusy(true);
    try {
      await api.post(`/trades/${tradeId}/review`, { rating, comment: comment.trim() || undefined });
      Alert.alert('Teşekkürler', 'Değerlendirmen kaydedildi.');
      onDone();
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      Alert.alert('Uyarı', errors ? Object.values(errors).flat().join(' ') : e.response?.data?.message || 'Değerlendirme gönderilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatedModal onClose={onClose}>
      {(dismiss) => (
        <View style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>{partnerName ? `${partnerName} kişisini değerlendir` : 'Takası değerlendir'}</ThemedText>

          <View style={styles.stars} accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setRating(n)}
                accessibilityRole="radio"
                accessibilityLabel={`${n} yıldız`}
                accessibilityState={{ selected: rating === n }}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <ThemedText style={{ fontSize: 34, color: n <= rating ? Brand.warning : theme.border }}>★</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedText style={{ textAlign: 'center', color: theme.textSecondary, minHeight: 20 }}>{LABELS[rating]}</ThemedText>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Yorumun (isteğe bağlı)"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={500}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />

          <View style={styles.actions}>
            <TouchableOpacity onPress={dismiss} accessibilityRole="button" style={styles.btn}>
              <ThemedText style={{ color: theme.textSecondary }}>Vazgeç</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={!rating || busy} accessibilityRole="button" style={[styles.btn, { backgroundColor: Brand.accent, opacity: !rating || busy ? 0.5 : 1 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Gönder</ThemedText>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  sheet: { width: '100%', maxWidth: 420, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.four, gap: Spacing.three },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  input: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.three, minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  btn: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', minWidth: 80 },
});
