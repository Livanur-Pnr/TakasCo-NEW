import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, G, Polygon } from 'react-native-svg';
import { useReducedMotion } from '@/components/ui/motion';

// TakasCo sembolünün rafine edilmiş vektör hâli. Geometri, mevcut PNG logodan piksel piksel örneklenen
// değerlere dayanır (bkz. "TakasCo Marka Kimliği Evrimi" sunumu): dış/iç yarıçap 190/128, halka orta yarıçapı
// 159, iki yay simetrik 138° + 42° boşluk, merkez r=24/8.5. Yeni bir sembol değil, aynı sembolün daha hassas çizimi.
const VB = 512;
const CX = 256;
const CY = 256;
const RING_R = 159;
const RING_W = 60;
const CIRC = 2 * Math.PI * RING_R; // ~999.03
const SWEEP = 138;
const ARC_LEN = (SWEEP / 360) * CIRC; // ~382.96
const GAP_LEN = CIRC - ARC_LEN; // ~616.07
const DASH = `${ARC_LEN} ${GAP_LEN}`;
// ok başı üçgenleri: yay ucundan teğet yönünde hesaplanmış sabit noktalar (bkz. sunum "Geometri notları")
const DARK_ARROW = '311.43,408.86 342.39,337.63 389.01,412.26';
const MINT_ARROW = '200.57,103.14 169.61,174.37 122.99,99.74';

const PALETTES = {
  light: { dark: '#1B7A43', mint: '#5FD9A4', center: '#141E28', dot: '#ffffff' },
  dark: { dark: '#ffffff', mint: '#9fead0', center: '#ffffff', dot: '#0d1310' },
  mono: { dark: '#111827', mint: '#6b7280', center: '#111827', dot: '#ffffff' },
  reverse: { dark: '#ffffff', mint: '#ffffff', center: '#ffffff', dot: '#111111' },
} as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export type TakascoMarkVariant = keyof typeof PALETTES;

export function TakascoMark({
  size = 120,
  variant = 'light',
  animate = 'none',
}: {
  size?: number;
  variant?: TakascoMarkVariant;
  animate?: 'entrance' | 'success' | 'none';
}) {
  const reduced = useReducedMotion();
  const palette = PALETTES[variant];

  const darkV = useRef(new Animated.Value(animate === 'entrance' && !reduced ? 0 : 1)).current;
  const mintV = useRef(new Animated.Value(animate === 'entrance' && !reduced ? 0 : 1)).current;
  const popV = useRef(new Animated.Value(animate === 'entrance' && !reduced ? 0 : 1)).current;
  const pulseV = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate !== 'entrance' || reduced) return;
    Animated.timing(darkV, { toValue: 1, duration: 1050, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: false }).start();
    Animated.timing(mintV, { toValue: 1, duration: 1050, delay: 150, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: false }).start();
    Animated.sequence([
      Animated.delay(850),
      Animated.timing(popV, { toValue: 1.08, duration: 250, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
      Animated.timing(popV, { toValue: 1, duration: 200, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, reduced]);

  useEffect(() => {
    if (animate !== 'success' || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(4140), // 4.5s döngünün ~%92'sine kadar bekler (uzun, sakin aralık)
        Animated.timing(pulseV, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulseV, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, reduced]);

  const darkOffset = darkV.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] });
  const mintOffset = mintV.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] });
  const pulseScale = pulseV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const ringOpacity = pulseV.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.55, 0] });
  const ringScale = pulseV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {animate === 'success' && (
        <AnimatedCircle
          cx={CX}
          cy={CY}
          r={200}
          fill="none"
          stroke="#6ee7b7"
          strokeWidth={3}
          opacity={ringOpacity as unknown as number}
          scale={ringScale as unknown as number}
          originX={CX}
          originY={CY}
        />
      )}
      <G rotation={-74} originX={CX} originY={CY}>
        <AnimatedCircle
          cx={CX} cy={CY} r={RING_R} fill="none" stroke={palette.dark} strokeWidth={RING_W}
          strokeLinecap="round" strokeDasharray={DASH} strokeDashoffset={darkOffset as unknown as number}
        />
      </G>
      <G rotation={106} originX={CX} originY={CY}>
        <AnimatedCircle
          cx={CX} cy={CY} r={RING_R} fill="none" stroke={palette.mint} strokeWidth={RING_W}
          strokeLinecap="round" strokeDasharray={DASH} strokeDashoffset={mintOffset as unknown as number}
        />
      </G>
      <Polygon points={DARK_ARROW} fill={palette.dark} />
      <Polygon points={MINT_ARROW} fill={palette.mint} />
      <AnimatedG
        originX={CX}
        originY={CY}
        scale={(animate === 'success' ? pulseScale : popV) as unknown as number}
      >
        <Circle cx={CX} cy={CY} r={24} fill={palette.center} />
        <Circle cx={CX} cy={CY} r={8.5} fill={palette.dot} />
      </AnimatedG>
    </Svg>
  );
}
