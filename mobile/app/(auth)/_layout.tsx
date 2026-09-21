import { Stack } from 'expo-router';

// Kimlik doğrulama ekranları kendi düzenini (masaüstünde bölünmüş marka paneli + form) `AuthShell` ile çizer;
// ekranlar arası geçiş kısa bir solma ile yapılır.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
