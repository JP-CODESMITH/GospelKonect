import { useEffect } from 'react';
import { Stack, SplashScreen as RouterSplash } from 'expo-router';
import { useFonts } from 'expo-font';
import * as NativeSplash from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { TokenColors } from '../constants/theme';
import { AuthProvider } from '../lib/auth';

NativeSplash.preventAutoHideAsync().catch(() => {});
RouterSplash.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans: require('../assets/fonts/PlusJakartaSans.ttf'),
    Inter: require('../assets/fonts/Inter.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      NativeSplash.hideAsync().catch(() => {});
      RouterSplash.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: TokenColors.surface },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="home" />
      </Stack>
    </AuthProvider>
  );
}
