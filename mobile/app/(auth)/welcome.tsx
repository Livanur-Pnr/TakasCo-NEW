import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Spacing } from '@/constants/theme';
import { usePageTitle } from '@/utils/use-page-title';
import { AuthHeading, AuthItem, AuthShell, useAuthLayout } from '@/components/auth/auth-shell';
import { ActionButton } from '@/components/ui/form';

// Karşılama: masaüstünde sol marka paneli + sağda kart; tablet/telefonda büyük marka bloğu (logo, ad, slogan, çipler) + düğmeler.
export default function WelcomeScreen() {
  const router = useRouter();
  const desktop = useAuthLayout() === 'desktop';
  usePageTitle('Hoş geldin');

  return (
    <AuthShell hero>
      {desktop && (
        <AuthItem i={0}>
          <AuthHeading title="TakasCo'ya hoş geldiniz" subtitle="Hesabınızla devam edin ya da birkaç saniyede yeni bir hesap oluşturun." />
        </AuthItem>
      )}
      <AuthItem i={1}>
        <View style={{ gap: Spacing.three }}>
          <ActionButton label="Giriş Yap" onPress={() => router.push('/(auth)/login')} arrow />
          <ActionButton label="Kayıt Ol" variant="outline" onPress={() => router.push('/(auth)/register')} />
        </View>
      </AuthItem>
    </AuthShell>
  );
}
