import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AnimatedModal } from '@/components/ui/animated-modal';
import { useReducedMotion } from '@/components/ui/motion';
import { Distance, Duration, Ease } from '@/constants/motion';

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

const KIND_STYLE: Record<ToastKind, { color: string; icon: 'checkmark.circle.fill' | 'exclamationmark.triangle.fill' | 'xmark.circle.fill' | 'info.circle.fill' }> = {
  success: { color: Brand.success, icon: 'checkmark.circle.fill' },
  error: { color: Brand.danger, icon: 'xmark.circle.fill' },
  warning: { color: Brand.warning, icon: 'exclamationmark.triangle.fill' },
  info: { color: Brand.accent, icon: 'info.circle.fill' },
};

const TOAST_DURATION_MS = 4500;
const MAX_TOASTS = 3;

// Tek bildirim: sağdan kısa kayarak ve solarak girer, süre dolunca ya da kapatılınca aynı yolla çıkar; alt çizgi kalan süreyi gösterir
function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: (id: number) => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const kind = KIND_STYLE[toast.kind];
  const value = useRef(new Animated.Value(0)).current;
  const timeLeft = useRef(new Animated.Value(1)).current;
  const leaving = useRef(false);

  const dismiss = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(value, { toValue: 0, duration: reduced ? Duration.micro : Duration.fast + 40, easing: Ease.accelerate, useNativeDriver: true }).start(() => onRemove(toast.id));
  }, [value, reduced, onRemove, toast.id]);

  useEffect(() => {
    Animated.timing(value, { toValue: 1, duration: reduced ? Duration.micro : Duration.normal, easing: Ease.decelerate, useNativeDriver: true }).start();
    Animated.timing(timeLeft, { toValue: 0, duration: TOAST_DURATION_MS, easing: (t) => t, useNativeDriver: true }).start(({ finished }) => { if (finished) dismiss(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftColor: kind.color, opacity: value },
        { transform: [{ translateX: value.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : Distance.lg - 3, 0] }) }] },
      ]}
    >
      <IconSymbol name={kind.icon} size={22} color={kind.color} />
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.toastTitle}>{toast.title}</ThemedText>
        {!!toast.message && <ThemedText style={[styles.toastMessage, { color: theme.textSecondary }]}>{toast.message}</ThemedText>}
      </View>
      <TouchableOpacity onPress={dismiss} accessibilityRole="button" accessibilityLabel="Bildirimi kapat" hitSlop={8}>
        <IconSymbol name="xmark" size={16} color={theme.textSecondary} />
      </TouchableOpacity>
      <View style={styles.toastTrack} pointerEvents="none">
        <Animated.View style={[styles.toastBar, { backgroundColor: kind.color, transform: [{ scaleX: timeLeft }] }]} />
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const lastConfirm = useRef<ConfirmOptions | null>(null);
  if (confirmState) lastConfirm.current = confirmState;
  const shown = confirmState ?? lastConfirm.current;
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, kind, title, message }]);
  }, []);

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
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onRemove={dismiss} />
        ))}
      </View>

      <AnimatedModal visible={!!confirmState} onClose={() => closeConfirm(false)}>
        <View
          accessibilityRole={'alertdialog' as any}
          accessibilityViewIsModal
          style={[styles.dialog, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        >
          <ThemedText style={styles.dialogTitle}>{shown?.title}</ThemedText>
          {!!shown?.message && <ThemedText style={{ color: theme.textSecondary, lineHeight: 21 }}>{shown.message}</ThemedText>}
          <View style={styles.dialogButtons}>
            <TouchableOpacity
              style={[styles.dialogButton, { backgroundColor: theme.backgroundSelected }]}
              onPress={() => closeConfirm(false)}
              accessibilityRole="button"
            >
              <ThemedText style={{ fontWeight: '700' }}>{shown?.cancelText ?? 'Vazgeç'}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, { backgroundColor: shown?.destructive ? Brand.danger : Brand.accent }]}
              onPress={() => closeConfirm(true)}
              accessibilityRole="button"
            >
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{shown?.confirmText ?? 'Onayla'}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: Spacing.four, right: Spacing.four, left: Spacing.four, alignItems: 'flex-end', gap: Spacing.two, zIndex: 9999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three, width: '100%', maxWidth: 400,
    padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, borderLeftWidth: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  toastTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, overflow: 'hidden' },
  toastBar: { height: 2, width: '100%', opacity: 0.55, transformOrigin: 'left center' as any },
  toastTitle: { fontWeight: '700', fontSize: 14 },
  toastMessage: { fontSize: 13, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  dialog: { width: '100%', maxWidth: 420, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.five, gap: Spacing.three },
  dialogTitle: { fontSize: 18, fontWeight: '800' },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.three, marginTop: Spacing.three },
  dialogButton: { paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: Radius.full },
});
