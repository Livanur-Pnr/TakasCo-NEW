import { useState } from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

const ZOOM = 2.5;

// Tam ekran galeride tek dokunuşla 2,5x yakınlaştırma; yakınlaşmışken her iki yönde kaydırılabilir.
// iOS'ta ayrıca iki parmakla sıkıştırma (maximumZoomScale) desteklenir.
export function ZoomableImage({ uri, width, height, onZoomChange }: { uri: string; width: number; height: number; onZoomChange?: (zoomed: boolean) => void }) {
  const [zoomed, setZoomed] = useState(false);

  const toggle = () => {
    setZoomed((z) => {
      onZoomChange?.(!z);
      return !z;
    });
  };

  if (!zoomed) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity activeOpacity={1} onPress={toggle} accessibilityRole="button" accessibilityLabel="Yakınlaştır">
          <Image source={{ uri }} style={{ width, height, resizeMode: 'contain' }} />
        </TouchableOpacity>
        <ThemedText style={{ position: 'absolute', bottom: 70, color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Yakınlaştırmak için dokun</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView horizontal style={{ width, height }} contentContainerStyle={{ width: width * ZOOM }} showsHorizontalScrollIndicator={false} nestedScrollEnabled>
      <ScrollView style={{ height }} contentContainerStyle={{ height: height * ZOOM }} showsVerticalScrollIndicator={false} nestedScrollEnabled maximumZoomScale={3} minimumZoomScale={1}>
        <TouchableOpacity activeOpacity={1} onPress={toggle} accessibilityRole="button" accessibilityLabel="Uzaklaştır">
          <Image source={{ uri }} style={{ width: width * ZOOM, height: height * ZOOM, resizeMode: 'contain' }} />
        </TouchableOpacity>
      </ScrollView>
    </ScrollView>
  );
}
