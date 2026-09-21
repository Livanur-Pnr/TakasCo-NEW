import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet } from 'react-native';
import { Distance, Duration, Ease } from '@/constants/motion';
import { useReducedMotion } from '@/components/ui/motion';
import { Spacing } from '@/constants/theme';

// Tüm modal/açılır panellerin ortak animasyonu: arka plan solarak gelir, panel opaklık + kısa yukarı kayma (+ çok hafif ölçek) ile belirir;
// kapanışta aynı yolu tersine izler. "Hareketi azalt" açıkken yalnızca opaklık kullanılır.
//   variant "center"   : ortada diyalog (karartılmış arka plan)
//   variant "sheet"    : alttan çıkan panel
//   variant "dropdown" : arka planı karartmadan açılan panel (konumu içerik kendisi belirler)
//
// İki kullanım biçimi:
//   • kontrollü:      <AnimatedModal visible={open} onClose={() => setOpen(false)}>…</AnimatedModal> (visible false olunca çıkış animasyonu oynar)
//   • koşullu bağlama: <AnimatedModal onClose={…}>{(dismiss) => …}</AnimatedModal>; kapatma düğmeleri `dismiss` çağırır → önce çıkış animasyonu, sonra onClose.
type Variant = 'center' | 'sheet' | 'dropdown';

export function AnimatedModal({ visible, onClose, variant = 'center', children }: { visible?: boolean; onClose: () => void; variant?: Variant; children: ReactNode | ((dismiss: () => void) => ReactNode) }) {
  const reduced = useReducedMotion();
  const controlled = visible !== undefined;
  const [mounted, setMounted] = useState(controlled ? !!visible : true);
  const value = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  const play = useCallback((to: 0 | 1, done?: () => void) => {
    Animated.timing(value, {
      toValue: to,
      duration: reduced ? Duration.micro : to === 1 ? Duration.modal : Duration.fast + 40,
      easing: to === 1 ? Ease.emphasized : Ease.accelerate,
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) done?.(); });
  }, [value, reduced]);

  useEffect(() => {
    if (!controlled) {
      play(1);
      return;
    }
    if (visible) {
      closing.current = false;
      setMounted(true);
      play(1);
    } else if (mounted) {
      play(0, () => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = useCallback(() => {
    if (!controlled) {
      if (closing.current) return;
      closing.current = true;
      play(0, onClose);
    } else {
      onClose();
    }
  }, [controlled, onClose, play]);

  const offset = reduced ? 0 : variant === 'sheet' ? Distance.lg * 2 : variant === 'dropdown' ? -Distance.sm : Distance.md;
  const scale = reduced || variant === 'sheet' ? [1, 1] : [0.985, 1];

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[styles.root, variant === 'sheet' && styles.rootSheet, variant === 'center' && styles.rootCenter, variant !== 'dropdown' && { backgroundColor: 'rgba(0, 0, 0, 0.45)' }, { opacity: value }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Kapat" />
        <Animated.View
          pointerEvents="box-none"
          style={[
            variant === 'dropdown' ? StyleSheet.absoluteFill : styles.content,
            { transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }, { scale: value.interpolate({ inputRange: [0, 1], outputRange: scale }) }] },
          ]}
        >
          {typeof children === 'function' ? children(dismiss) : children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootCenter: { justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  rootSheet: { justifyContent: 'flex-end' },
  content: { width: '100%', alignItems: 'center' },
});
