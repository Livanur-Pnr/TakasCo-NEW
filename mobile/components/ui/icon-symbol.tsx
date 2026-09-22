// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'magnifyingglass': 'search',
  'plus.circle.fill': 'add-circle',
  'arrow.left.arrow.right': 'swap-horiz',
  'person.fill': 'person',
  'heart.fill': 'favorite',
  'camera.fill': 'camera-alt',
  'photo.fill': 'photo',
  'pencil': 'edit',
  'doc.text.magnifyingglass': 'find-in-page',
  'xmark.circle.fill': 'cancel',
  'xmark': 'close',
  'heart.slash.fill': 'heart-broken',
  'chevron.left': 'chevron-left',
  'trash.fill': 'delete',
  'flag.fill': 'flag',
  'checkmark.seal.fill': 'verified',
  'desktopcomputer': 'devices',
  'tshirt.fill': 'checkroom',
  'book.fill': 'menu-book',
  'sofa.fill': 'weekend',
  'sportscourt.fill': 'sports-basketball',
  'square.grid.2x2.fill': 'apps',
  'exclamationmark.triangle.fill': 'error-outline',
  'arrow.clockwise': 'refresh',
  'square.and.arrow.up': 'share',
  'bell.fill': 'notifications',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'envelope.fill': 'mail',
  'lock.fill': 'lock',
  'phone.fill': 'phone',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'info.circle.fill': 'info',
  'checkmark.circle.fill': 'check-circle',
  'sun.max.fill': 'wb-sunny',
  'moon.fill': 'nights-stay',
  'circle.lefthalf.filled': 'contrast',
  'bubble.left.fill': 'chat-bubble',
  'message.fill': 'chat',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
