import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface Handlers {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  confirm: (options: ConfirmOptions) => void;
}

// React dışından (utils/alert.ts) çağrılabilsin diye sağlayıcı kendini buraya kaydeder.
let handlers: Handlers | null = null;

export function showToast(kind: ToastKind, title: string, message?: string): boolean {
  if (!handlers) return false;
  handlers.toast(kind, title, message);
  return true;
}

export function showConfirm(options: ConfirmOptions): boolean {
  if (!handlers) return false;
  handlers.confirm(options);
  return true;
}

const ToastContext = createContext<Handlers | null>(null);

export function useToast(): Handlers {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast, ToastProvider içinde kullanılmalı');
  return ctx;
}

const KIND_STYLE: Record<ToastKind, { color: string; icon: 'checkmark.seal.fill' | 'exclamationmark.triangle.fill' | 'xmark.circle.fill' }> = {
  success: { color: Brand.success, icon: 'checkmark.seal.fill' },
  error: { color: Brand.danger, icon: 'xmark.circle.fill' },
  warning: { color: Brand.warning, icon: 'exclamationmark.triangle.fill' },
  info: { color: Brand.accent, icon: 'checkmark.seal.fill' },
};

const TOAST_DURATION_MS = 4500;
const MAX_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, kind, title, message }]);
    setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  const confirm = useCallback((options: ConfirmOptions) => setConfirmState(options), []);

  useEffect(() => {
    handlers = { toast, confirm };
    return () => { handlers = null; };
  }, [toast, confirm]);

  const closeConfirm = useCallback((accepted: boolean) => {
    const current = confirmState;
    setConfirmState(null);
    if (!current) return;
    if (accepted) current.onConfirm();
    else current.onCancel?.();
  }, [confirmState]);

  // ESC ile kapatma (web, klavye erişilebilirliği)
  useEffect(() => {
    if (Platform.OS !== 'web' || !confirmState) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmState, closeConfirm]);

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      <View pointerEvents="box-none" style={styles.overlay}>
        {toasts.map((t) => {
          const kind = KIND_STYLE[t.kind];
          return (
            <View
              key={t.id}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.toast, { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftColor: kind.color }]}
            >
              <IconSymbol name={kind.icon} size={22} color={kind.color} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.toastTitle}>{t.title}</ThemedText>
                {!!t.message && <ThemedText style={[styles.toastMessage, { color: theme.textSecondary }]}>{t.message}</ThemedText>}
              </View>
              <TouchableOpacity onPress={() => dismiss(t.id)} accessibilityRole="button" accessibilityLabel="Bildirimi kapat" hitSlop={8}>
                <IconSymbol name="xmark" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <Modal visible={!!confirmState} transparent animationType="none" onRequestClose={() => closeConfirm(false)}>
        <View style={styles.backdrop}>
          <View
            accessibilityRole={'alertdialog' as any}
            accessibilityViewIsModal
            style={[styles.dialog, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          >
            <ThemedText style={styles.dialogTitle}>{confirmState?.title}</ThemedText>
            {!!confirmState?.message && <ThemedText style={{ color: theme.textSecondary, lineHeight: 21 }}>{confirmState.message}</ThemedText>}
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, { backgroundColor: theme.backgroundSelected }]}
                onPress={() => closeConfirm(false)}
                accessibilityRole="button"
              >
                <ThemedText style={{ fontWeight: '700' }}>{confirmState?.cancelText ?? 'Vazgeç'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, { backgroundColor: confirmState?.destructive ? Brand.danger : Brand.accent }]}
                onPress={() => closeConfirm(true)}
                accessibilityRole="button"
              >
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{confirmState?.confirmText ?? 'Onayla'}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: Spacing.four, right: Spacing.four, left: Spacing.four, alignItems: 'flex-end', gap: Spacing.two, zIndex: 9999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three, width: '100%', maxWidth: 400,
    padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  toastTitle: { fontWeight: '700', fontSize: 14 },
  toastMessage: { fontSize: 13, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  dialog: { width: '100%', maxWidth: 420, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.five, gap: Spacing.three },
  dialogTitle: { fontSize: 18, fontWeight: '800' },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.three, marginTop: Spacing.three },
  dialogButton: { paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: Radius.full },
});
