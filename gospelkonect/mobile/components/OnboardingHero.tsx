import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors, LogoAsset, Radii, Shadows, TokenColors } from '../constants/theme';

type Props = {
  dotColors: [string, string];
  badgeColor?: string;
  badgeText?: string;
};

/**
 * 280h hero illustration card — gradient wash, 4 deco dots,
 * 112px white logo medallion + accent badge.
 * Decorative dots are aria-hidden; logo image has label.
 */
export function OnboardingHero({ dotColors }: Props) {
  return (
    <LinearGradient
      colors={[TokenColors.surfaceContainerLow, TokenColors.surfaceContainerHigh]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={[styles.dot, { width: 12, height: 12, top: 28, left: 32, backgroundColor: dotColors[0] }]} />
      <View style={[styles.dot, { width: 8, height: 8, top: 44, right: 44, backgroundColor: dotColors[1] }]} />
      <View style={[styles.dot, { width: 10, height: 10, bottom: 32, left: 56, backgroundColor: dotColors[1] }]} />
      <View style={[styles.dot, { width: 14, height: 14, bottom: 48, right: 36, backgroundColor: dotColors[0] }]} />
      <View style={styles.center}>
        <View style={styles.medallion}>
          <Image source={LogoAsset} style={styles.logo} accessibilityLabel="GospelKonect logo" />
          <View style={styles.badge} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 280,
    borderRadius: Radii.hero,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  dot: { position: 'absolute', borderRadius: 9999 },
  center: { alignItems: 'center', justifyContent: 'center' },
  medallion: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: AppColors.surfacePureWhite,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  logo: { width: 76, height: 76, resizeMode: 'contain' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: TokenColors.primaryContainer,
  },
});
