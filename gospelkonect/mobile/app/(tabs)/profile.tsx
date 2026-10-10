import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';
import { clearSession } from '../../lib/session';

// Placeholder profile — static mock data, no backend wiring yet.
export default function Profile() {
  const router = useRouter();

  const signOut = async () => {
    await clearSession();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>J</Text>
          </View>
          <Text style={styles.name}>Jane Doe</Text>
          <Text style={styles.handle}>@janedoe</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>248</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>180</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={4}
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
        >
          <Text style={styles.signOutLabel}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TokenColors.surface },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
  header: { alignItems: 'center' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: TokenColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: '800',
    color: TokenColors.onPrimary,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineMd.fontSize,
    fontWeight: '700',
    color: TokenColors.onSurface,
    marginTop: 12,
  },
  handle: { fontFamily: Fonts.body, fontSize: 14, color: TokenColors.onSurfaceVariant, marginTop: 2 },
  stats: {
    flexDirection: 'row',
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    marginTop: 20,
    paddingVertical: 16,
    ...Shadows.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: Fonts.display, fontSize: 20, fontWeight: '800', color: TokenColors.onSurface },
  statLabel: { fontFamily: Fonts.body, fontSize: 12, color: TokenColors.onSurfaceVariant, marginTop: 2 },
  signOutBtn: {
    height: 52,
    minHeight: 48,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: TokenColors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  signOutLabel: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelLg.fontSize,
    fontWeight: '600',
    color: TokenColors.error,
  },
});
