import { Stack } from 'expo-router';
import { TokenColors } from '../../constants/theme';

/**
 * Auth group — login + register share one Stack with no native headers.
 * Screens render their own chrome (back controls, titles). Routes stay
 * `/login` and `/register`; the `(auth)` group never appears in the URL.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: TokenColors.surface },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
