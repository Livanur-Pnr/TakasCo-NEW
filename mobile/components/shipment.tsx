import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { TouchableOpacity } from '@/components/ui/touchable';
import { TextInput } from '@/components/ui/text-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AnimatedModal } from '@/components/ui/animated-modal';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';

// Onaylanmış bir takasta kargo durumu: Tekliflerim, Kargolarım (gönderen taraf) ve Siparişlerim (alıcı taraf)
// ekranlarında ortak kullanılır. Ödeme yoktur; yalnızca durum + kargo firması/takip no.
export type ShippingStatus = 'hazırlanıyor' | 'kargoda' | 'teslim edildi';

export interface ShippableTrade {
  id: number;
  requested_product?: { title?: string };
  sender?: { name?: string };
  shipping_status?: ShippingStatus | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
}

export const SHIP_STEP: Record<ShippingStatus, { label: string; icon: 'shippingbox.fill' | 'checkmark.circle.fill' }> = {
  'hazırlanıyor': { label: 'Kargo hazırlanıyor', icon: 'shippingbox.fill' },
  'kargoda': { label: 'Kargoda', icon: 'shippingbox.fill' },
  'teslim edildi': { label: 'Teslim edildi', icon: 'checkmark.circle.fill' },
};

// Teslim edildi işaretlemeden önce onay ister (geri alınamaz)
export function confirmMarkDelivered(trade: ShippableTrade, onDone: () => void) {
  Alert.alert('Teslim Edildi', `"${trade.requested_product?.title}" teslim edildi olarak işaretlensin mi?`, [
    { text: 'Vazgeç', style: 'cancel' },
    {
      text: 'Onayla',
      onPress: async () => {
        try {
          await api.post(`/trades/${trade.id}/shipping`, { status: 'teslim edildi' });
          onDone();
        } catch (e: any) {
          Alert.alert('Hata', e.response?.data?.message || 'Güncellenemedi.');
        }
      },
    },
  ]);
}

// Kargo durumu kutusu: herkes durumu görür; `canManage` (gönderen taraf) ise "Kargoya Ver"/"Teslim Edildi" eylemleri de çıkar
export function ShippingBox({ trade, canManage, onShipPress, onDelivered }: { trade: ShippableTrade; canManage: boolean; onShipPress?: () => void; onDelivered?: () => void }) {
  const theme = useTheme();
  if (!trade.shipping_status) return null;
  const step = SHIP_STEP[trade.shipping_status];

  return (
    <View style={{ borderRadius: Radius.sm, padding: Spacing.three, gap: Spacing.two, backgroundColor: theme.backgroundSelected }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <IconSymbol name={step.icon} size={16} color={trade.shipping_status === 'teslim edildi' ? Brand.success : Brand.accent} />
        <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>{step.label}</ThemedText>
      </View>
      {trade.shipping_status !== 'hazırlanıyor' && !!trade.shipping_carrier && (
        <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{trade.shipping_carrier} · Takip no: {trade.tracking_number}</ThemedText>
      )}
      {canManage && trade.shipping_status === 'hazırlanıyor' && (
        <TouchableOpacity onPress={() => onShipPress?.()} accessibilityRole="button" style={{ alignSelf: 'flex-start', backgroundColor: Brand.accent, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.sm }}>
          <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Kargoya Ver</ThemedText>
        </TouchableOpacity>
      )}
      {canManage && trade.shipping_status === 'kargoda' && (
        <TouchableOpacity onPress={() => onDelivered?.()} accessibilityRole="button" style={{ alignSelf: 'flex-start', backgroundColor: Brand.success, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: Radius.sm }}>
          <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Teslim Edildi Olarak İşaretle</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Kargoya ver: kargo firması + takip numarası girilir
export function ShippingModal({ trade, onClose, onDone }: { trade: ShippableTrade; onClose: () => void; onDone: () => void }) {
  const theme = useTheme();
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!carrier.trim() || !tracking.trim()) {
      Alert.alert('Uyarı', 'Kargo firması ve takip numarasını gir.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/trades/${trade.id}/shipping`, { status: 'kargoda', carrier: carrier.trim(), tracking_number: tracking.trim() });
      onDone();
    } catch (e: any) {
      Alert.alert('Hata', e.response?.data?.message || 'Kargo bilgisi kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatedModal onClose={onClose}>
      {(dismiss) => (
        <View style={{ width: '100%', maxWidth: 480, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.four, backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
          <View style={{ gap: Spacing.four }}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>Kargoya Ver</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>{trade.requested_product?.title} için kargo bilgilerini gir; {trade.sender?.name} bu bilgiyi görecek.</ThemedText>
            <View style={{ gap: Spacing.one }}>
              <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>Kargo Firması</ThemedText>
              <TextInput
                style={{ borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 15, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }}
                placeholder="Örn. Aras Kargo"
                placeholderTextColor={theme.textSecondary}
                value={carrier}
                onChangeText={setCarrier}
              />
            </View>
            <View style={{ gap: Spacing.one }}>
              <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>Takip Numarası</ThemedText>
              <TextInput
                style={{ borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 15, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }}
                placeholder="Takip numarası"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                value={tracking}
                onChangeText={setTracking}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.three, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={dismiss} accessibilityRole="button" style={{ padding: Spacing.three, borderRadius: Radius.sm, alignItems: 'center', backgroundColor: theme.backgroundSelected }}>
                <ThemedText style={{ fontWeight: '600' }}>Vazgeç</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={submit} disabled={busy} accessibilityRole="button" style={{ padding: Spacing.three, borderRadius: Radius.sm, alignItems: 'center', backgroundColor: Brand.accent, opacity: busy ? 0.6 : 1 }}>
                {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Kargoya Verildi</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </AnimatedModal>
  );
}
