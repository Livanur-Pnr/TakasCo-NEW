import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { ThemedText } from '@/components/themed-text';
import { ActionButton, ActionStatus, FormError } from '@/components/ui/form';
import { FadeInUp } from '@/components/ui/motion';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import * as SecureStore from '@/utils/storage';

// İletişim sayfasındaki gerçek form: backend'e kaydedilir (admin panelinde "İletişim Mesajları" kuyruğunda görünür).
// Üye girişliyse ad/e-posta otomatik doldurulur (yine de değiştirilebilir).
export function ContactForm() {
  const theme = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('user').then((raw) => {
      if (!raw) return;
      try {
        const u = JSON.parse(raw);
        if (u.name) setName(u.name);
        if (u.email) setEmail(u.email);
      } catch {}
    });
  }, []);

  const submit = async () => {
    if (status !== 'idle') return;
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }
    setErrorMsg(null);
    setStatus('loading');
    try {
      await api.post('/contact', { name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      setStatus('success');
      setSent(true);
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      setErrorMsg(errors ? Object.values(errors).flat().join(' ') : e.response?.data?.message || 'Mesaj gönderilemedi. Lütfen tekrar dene.');
      setStatus('idle');
    }
  };

  if (sent) {
    return (
      <FadeInUp style={[styles.sentBox, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText style={{ fontWeight: '700' }}>Mesajın bize ulaştı!</ThemedText>
        <ThemedText style={{ color: theme.textSecondary }}>En kısa sürede e-posta adresinden sana dönüş yapacağız.</ThemedText>
      </FadeInUp>
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <ThemedText style={styles.label}>Ad Soyad</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            placeholder="Adın Soyadın"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <ThemedText style={styles.label}>E-posta</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            placeholder="E-posta adresin"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Konu</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
          placeholder="Mesajının konusu"
          placeholderTextColor={theme.textSecondary}
          value={subject}
          onChangeText={setSubject}
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Mesaj</ThemedText>
        <TextInput
          style={[styles.input, styles.textarea, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
          placeholder="Sana nasıl yardımcı olabiliriz?"
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      <FormError message={errorMsg} />
      <ActionButton label="Gönder" loadingLabel="Gönderiliyor…" status={status} onPress={submit} style={{ alignSelf: 'flex-start', paddingHorizontal: Spacing.seven }} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.four, marginTop: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.four, flexWrap: 'wrap' },
  field: { gap: Spacing.one, minWidth: 200 },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: 8, fontSize: 16 },
  textarea: { minHeight: 120, paddingTop: Spacing.three },
  sentBox: { padding: Spacing.five, borderRadius: 12, gap: Spacing.one },
});
