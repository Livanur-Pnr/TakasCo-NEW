import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Favori kalbi: favoriye eklendiği anda "pat" diye büyüyüp yerine oturur (çıkarılırken sessizce solar).
export function HeartIcon({ active, size, activeColor, inactiveColor }: { active: boolean; size: number; activeColor: string; inactiveColor: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(active);

  useEffect(() => {
    if (active && !previous.current) {
      scale.setValue(0.6);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 18 }).start();
    }
    previous.current = active;
  }, [active, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <IconSymbol name="heart.fill" size={size} color={active ? activeColor : inactiveColor} />
    </Animated.View>
  );
}
