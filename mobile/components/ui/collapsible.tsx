import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { FadeInUp } from '@/components/ui/motion';
import { Duration, Ease } from '@/constants/motion';
import { TouchableOpacity } from '@/components/ui/touchable';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = 'light' as const;
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(turn, { toValue: isOpen ? 1 : 0, duration: Duration.normal, easing: Ease.standard, useNativeDriver: true }).start();
  }, [isOpen, turn]);

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}>
          <IconSymbol name="chevron.right" size={18} weight="medium" color={Colors[theme].textSecondary} />
        </Animated.View>

        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      {isOpen && <FadeInUp distance={6}><ThemedView style={styles.content}>{children}</ThemedView></FadeInUp>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
