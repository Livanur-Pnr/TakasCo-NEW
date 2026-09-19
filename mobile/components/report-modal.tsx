import { useState } from 'react';
import { Modal, View, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';

export const REPORT_REASONS = [
  { key: 'spam', label: 'Spam / reklam' },
  { key: 'yaniltici', label: 'Yanıltıcı bilgi' },
  { key: 'uygunsuz', label: 'Uygunsuz içerik' },
  { key: 'sahte', label: 'Sahte / taklit ürün' },
  { key: 'diger', label: 'Diğer' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  targetType: 'product' | 'user';
  targetId: number;
  title: string;
};

export function ReportModal({ visible, onClose, targetType, targetId, title }: Props) {
  const theme = useTheme();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const close = () => {
    setReason(null);
    setDetails('');
    onClose();
  };

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    try {
      await api.post('/reports', { target_type: targetType, target_id: targetId, reason, details: details.trim() || undefined });
      Alert.alert('Teşekkürler', 'Şikayetin ekibimize iletildi.');
      close();
    } catch (e: any) {
      Alert.alert('Uyarı', e.response?.data?.message || 'Şikayet gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} onPress={() => {}}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>Şikayet Et</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }} numberOfLines={2}>{title}</ThemedText>

          <View style={styles.chips}>
            {REPORT_REASONS.map((r) => {
              const active = reason === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setReason(r.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, { borderColor: active ? Brand.accent : theme.border, backgroundColor: active ? Brand.accent + '15' : 'transparent' }]}
                >
                  <ThemedText style={{ fontSize: 13, color: active ? Brand.accent : theme.text, fontWeight: active ? '700' : '400' }}>{r.label}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Ek açıklama (isteğe bağlı)"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={500}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />

          <View style={styles.actions}>
            <TouchableOpacity onPress={close} style={styles.btn} accessibilityRole="button">
              <ThemedText style={{ color: theme.textSecondary }}>Vazgeç</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={!reason || sending}
              accessibilityRole="button"
              style={[styles.btn, { backgroundColor: Brand.danger, opacity: !reason || sending ? 0.5 : 1 }]}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Gönder</ThemedText>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  sheet: { width: '100%', maxWidth: 440, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.four, gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.three, minHeight: 72, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  btn: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', minWidth: 80 },
});
