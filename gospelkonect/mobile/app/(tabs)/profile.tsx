import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';
import { getProfile, getUserPosts, mediaUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { errorText, initials } from '../../lib/format';
import type { UserProfile } from '../../lib/types';

export default function Profile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!user) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [nextProfile, posts] = await Promise.all([
          getProfile(user.username),
          getUserPosts(user.username, { limit: 1 }),
        ]);
        setProfile(nextProfile);
        setPostCount(posts.meta.total);
      } catch (err) {
        setError(errorText(err, 'Could not load your profile.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const signOutNow = async () => {
    await signOut();
    router.replace('/login');
  };

  const shown = profile ?? user;
  const name = shown?.name ?? 'Your profile';
  const username = shown?.username ?? '';
  const bio = shown?.bio ?? '';

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={TokenColors.primary}
          />
        }
      >
        <View style={styles.header}>
          {shown?.avatar ? (
            <Image
              source={{ uri: mediaUrl(shown.avatar) }}
              style={styles.avatarImage}
              accessibilityLabel={`${name}'s profile picture`}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>
          )}
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.handle}>@{username}</Text>
          {bio ? <Text style={styles.bio}>{bio}</Text> : null}
          {error ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading your profile"
              onPress={() => void load()}
              style={styles.errorBanner}
            >
              <Text style={styles.errorText}>{error} Tap to retry.</Text>
            </Pressable>
          ) : null}
        </View>

        {loading && !profile ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={TokenColors.primary} />
          </View>
        ) : (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{postCount ?? 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.counts.followers ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.counts.following ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        )}

        <Pressable
          onPress={() => void signOutNow()}
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
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    backgroundColor: TokenColors.surfaceContainer,
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
  bio: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  errorBanner: {
    backgroundColor: TokenColors.errorContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    color: TokenColors.error,
    textAlign: 'center',
  },
  loadingBox: { paddingVertical: 32 },
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
