import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, LogoAsset, TokenColors, TypeScale } from '../constants/theme';

/**
 * Splash — white canvas, 160px logo, GospelKonect wordmark,
 * 60x3 sun-gold bar. 900ms fade+scale, auto-replace to onboarding at 2600ms.
 */
export default function Splash() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => router.replace('/onboarding'), 2600);
    return () => clearTimeout(t);
  }, [fade, router]);

  return (
    <SafeAreaView style={styles.root}>
      <Animated.View
        style={[
          styles.center,
          {
            opacity: fade,
            transform: [
              {
                scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
              },
            ],
          },
        ]}
      >
        <Image source={LogoAsset} style={styles.logo} accessibilityLabel="GospelKonect logo" />
        <Text style={styles.wordmark}>GospelKonect</Text>
        <View style={styles.bar} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppColors.surfacePureWhite },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 160, resizeMode: 'contain' },
  wordmark: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.displayLg.fontSize,
    lineHeight: TypeScale.displayLg.lineHeight,
    fontWeight: TypeScale.displayLg.weight,
    color: AppColors.neutralDark,
    marginTop: 20,
  },
  bar: {
    height: 3,
    width: 60,
    borderRadius: 2,
    backgroundColor: AppColors.sunGold,
    marginTop: 8,
  },
});
