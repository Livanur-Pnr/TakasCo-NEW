import { Alert as RNAlert, Platform } from 'react-native';
import { showConfirm, showToast, type ToastKind } from '@/components/ui/toast-provider';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

// react-native-web'in Alert.alert'ü tamamen no-op (`static alert() {}`). Bu drop-in modül aynı
// `Alert.alert(title, message, buttons)` imzasını korur: native'de gerçek Alert.alert'e devreder,
// web'de uygulama içi Toast (bildirim) ve onay diyaloğu gösterir (window.alert/confirm kullanmaz).
function kindFor(title: string): ToastKind {
  const t = title.toLocaleLowerCase('tr-TR');
  if (t.includes('hata')) return 'error';
  if (t.includes('uyarı')) return 'warning';
  return 'success';
}

function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const cancelButton = buttons?.find((b) => b.style === 'cancel');
  const actionButton = buttons?.find((b) => b !== cancelButton) ?? buttons?.[0];

  // iki seçenekli (vazgeç + aksiyon) -> onay diyaloğu
  if (buttons && buttons.length > 1 && cancelButton) {
    const shown = showConfirm({
      title,
      message,
      confirmText: actionButton?.text,
      cancelText: cancelButton.text,
      destructive: actionButton?.style === 'destructive',
      onConfirm: () => actionButton?.onPress?.(),
      onCancel: () => cancelButton.onPress?.(),
    });
    if (!shown && window.confirm(message ? `${title}\n\n${message}` : title)) actionButton?.onPress?.();
    return;
  }

  // bilgilendirme -> toast; tek butonlu akışlarda (ör. "Tamam" -> yönlendir) devam eden eylem hemen çalışır,
  // toast kök layout'ta durduğu için sayfa değişse de görünür kalır.
  if (!showToast(kindFor(title), title, message)) window.alert(message ? `${title}\n\n${message}` : title);
  if (buttons?.length === 1) buttons[0].onPress?.();
}

export const Alert = { alert };
