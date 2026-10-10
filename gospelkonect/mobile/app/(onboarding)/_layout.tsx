import { Stack } from 'expo-router';
import { TokenColors } from '../../constants/theme';

/**
 * Onboarding group — single static screen, no native header.
 * Route stays `/onboarding`; the `(onboarding)` group never appears in the URL.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: TokenColors.surface },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
