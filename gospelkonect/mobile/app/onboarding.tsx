import { useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dots } from '../components/Dots';
import { AppColors, Fonts, LogoAsset, Shadows, TokenColors, TypeScale } from '../constants/theme';

const OnboardingBackground = require('../assets/images/GospelKonect Community Splash Screen.png');

const PAGES = [
  {
    title: 'Find Your People in Christ',
    description:
      'Connect with brothers, sisters, church mentors, and vibrant prayer circles walking your shared journey of faith and scripture.',
    dots: ['#FE932C', '#BBF37C'] as [string, string],
  },
  {
    title: 'Share Grace, Not Noise',
    description:
      'Post scriptures, testimonies, prayer requests, and daily audio reflections in a peaceful sanctuary built for truth and genuine encouragement.',
    dots: ['#DCE1FF', '#FE932C'] as [string, string],
  },
  {
    title: 'Grow in United Fellowship',
    description:
      'Step into topical circles, live prayer chains, and local fellowships designed to anchor your spiritual walk every single day.',
    dots: ['#BBF37C', '#DCE1FF'] as [string, string],
  },
];

export default function Onboarding() {
  const router = useRouter();
  // Single-page mode: index stays 0. PAGES + paging logic kept intact for later.
  const [index] = useState(0);
  const page = PAGES[index] ?? PAGES[0];
  const isLast = true;

  const goNext = () => {
    if (isLast) {
      router.replace('/login');
    } else {
      // Multi-page scroll logic preserved (unused while single-page):
      // listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  return (
    <ImageBackground
      source={OnboardingBackground}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
      accessibilityLabel="GospelKonect community gathering"
    >
      <LinearGradient
        colors={['rgba(10,15,25,0)', 'rgba(10,15,25,0.62)']}
        locations={[0, 1]}
        style={styles.scrim}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.logoChip}>
                <Image source={LogoAsset} style={styles.logo} accessibilityLabel="GospelKonect logo" />
              </View>
              <Text style={styles.brand}>GospelKonect</Text>
            </View>
            <Pressable
              onPress={() => router.replace('/login')}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              hitSlop={8}
              style={styles.skip}
            >
              <Text style={styles.skipLabel}>Skip</Text>
            </Pressable>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>{page.title}</Text>
            <Text style={styles.desc}>{page.description}</Text>
          </View>

          <View style={styles.spacer} />

          <View style={styles.dotsWrap}>
            <Dots activeIndex={0} total={1} />
          </View>

          <View style={styles.card}>
            <Pressable
              onPress={() => router.push('/register')}
              accessibilityRole="button"
              accessibilityLabel="Create new account"
              hitSlop={4}
              style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
            >
              <Text style={styles.createLabel}>Create new account</Text>
            </Pressable>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <Pressable
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel="I have an account, sign in"
              hitSlop={8}
              style={styles.signin}
            >
              <Text style={styles.signinLabel}>I have an account</Text>
            </Pressable>

            <View style={styles.socialRow}>
              <Pressable
                onPress={() => router.replace('/login')}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                hitSlop={4}
                style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
              >
                <Text style={styles.socialG}>G</Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace('/login')}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                hitSlop={4}
                style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
              >
                <Text style={styles.socialApple}>{"\uF8FF"}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  backgroundImage: { width: '100%', height: '100%' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  root: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.surfacePureWhite,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logo: { width: 22, height: 22, resizeMode: 'contain' },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: TokenColors.onSurface,
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  skip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  skipLabel: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: TypeScale.labelMd.weight,
    color: TokenColors.onSurfaceVariant,
  },
  titleBlock: { paddingTop: 12, paddingHorizontal: 8 },
  title: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineLg.fontSize,
    lineHeight: TypeScale.headlineLg.lineHeight,
    fontWeight: '800',
    color: TokenColors.onSurface,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 330,
    alignSelf: 'center',
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  spacer: { flex: 1, minHeight: 280 },
  dotsWrap: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  card: {
    width: '90%',
    alignSelf: 'center',
    minHeight: 250,
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    justifyContent: 'center',
    ...Shadows.card,
  },
  createBtn: {
    height: 52,
    minHeight: 48,
    borderRadius: 9999,
    backgroundColor: TokenColors.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  createLabel: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelLg.fontSize,
    lineHeight: TypeScale.labelLg.lineHeight,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: TokenColors.onPrimary,
  },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: TokenColors.outlineVariant },
  orText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    color: TokenColors.outline,
    marginHorizontal: 12,
  },
  signin: { alignSelf: 'center', paddingVertical: 6, minHeight: 44, justifyContent: 'center' },
  signinLabel: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: TokenColors.primary,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  socialRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 12 },
  socialBtn: {
    flex: 1,
    height: 52,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: TokenColors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialG: { fontFamily: Fonts.display, fontSize: 22, fontWeight: '800', color: TokenColors.onSurface },
  socialApple: { fontSize: 24, fontWeight: '600', color: TokenColors.onSurface },
});
