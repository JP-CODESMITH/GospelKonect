import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dots } from '../components/Dots';
import { OnboardingHero } from '../components/OnboardingHero';
import { PillButton } from '../components/PillButton';
import { AppColors, Fonts, LogoAsset, TokenColors, TypeScale } from '../constants/theme';

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
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLast = index === PAGES.length - 1;

  const goNext = () => {
    if (isLast) {
      router.replace('/login');
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.root}>
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

      <FlatList
        ref={listRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.title}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(Math.max(0, Math.min(PAGES.length - 1, i)));
        }}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: width - 40 }]}>
            <OnboardingHero dotColors={item.dots} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Dots activeIndex={index} total={PAGES.length} />
        <View style={{ height: 16 }} />
        <PillButton
          label={isLast ? 'Get Started with GospelKonect' : 'Continue'}
          onPress={goNext}
          accessibilityLabel={isLast ? 'Get started with GospelKonect' : 'Continue onboarding'}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TokenColors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  },
  skip: {
    backgroundColor: TokenColors.surfaceContainerLow,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipLabel: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: TypeScale.labelMd.weight,
    color: TokenColors.onSurfaceVariant,
  },
  page: { marginHorizontal: 20, paddingTop: 16 },
  title: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineLg.fontSize,
    lineHeight: TypeScale.headlineLg.lineHeight,
    fontWeight: '800',
    color: TokenColors.onSurface,
    textAlign: 'center',
    marginTop: 28,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 330,
    alignSelf: 'center',
  },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4 },
});
