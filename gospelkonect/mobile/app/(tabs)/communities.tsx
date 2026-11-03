import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';
import { followUser, mediaUrl, searchUsers, unfollowUser } from '../../lib/api';
import { errorText, initials } from '../../lib/format';
import type { DiscoverUser } from '../../lib/types';

export default function Communities() {
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search: string, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const page = await searchUsers({ search: search.trim() || undefined, limit: 30 });
      setPeople(page.items);
    } catch (err) {
      setError(errorText(err, 'Could not load people.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [load, query]);

  const toggleFollow = async (person: DiscoverUser) => {
    if (busyId) return;
    const next = !person.isFollowing;
    setBusyId(person.id);
    setError(null);
    setPeople((prev) =>
      prev.map((item) => (item.id === person.id ? { ...item, isFollowing: next } : item)),
    );
    try {
      if (next) await followUser(person.id);
      else await unfollowUser(person.id);
    } catch (err) {
      setPeople((prev) =>
        prev.map((item) =>
          item.id === person.id ? { ...item, isFollowing: person.isFollowing } : item,
        ),
      );
      setError(errorText(err, 'Could not update that follow.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(query, true)}
            tintColor={TokenColors.primary}
          />
        }
      >
        <Text style={styles.title}>Communities</Text>
        <Text style={styles.sub}>Find your circle</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={TokenColors.outline} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people by name or @handle"
            placeholderTextColor={AppColors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search people"
            style={styles.searchInput}
          />
        </View>

        {error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading people"
            onPress={() => void load(query)}
            style={styles.errorBanner}
          >
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : null}

        {loading && people.length === 0 ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={TokenColors.primary} />
            <Text style={styles.stateText}>Finding people…</Text>
          </View>
        ) : people.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons name="people-outline" size={28} color={TokenColors.outline} />
            <Text style={styles.stateTitle}>No one found</Text>
            <Text style={styles.stateText}>Try a different name or handle.</Text>
          </View>
        ) : (
          people.map((person) => (
            <View key={person.id} style={styles.card}>
              <View style={styles.row}>
                {person.avatar ? (
                  <Image source={{ uri: mediaUrl(person.avatar) }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(person.name)}</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {person.name}
                  </Text>
                  <Text style={styles.handle} numberOfLines={1}>
                    @{person.username}
                    {person.isFollowedBy ? ' · follows you' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void toggleFollow(person)}
                  disabled={busyId === person.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    person.isFollowing ? `Unfollow ${person.name}` : `Follow ${person.name}`
                  }
                  accessibilityState={{
                    selected: person.isFollowing,
                    disabled: busyId === person.id,
                    busy: busyId === person.id,
                  }}
                  hitSlop={4}
                  style={[
                    styles.joinBtn,
                    person.isFollowing && styles.joinedBtn,
                    busyId === person.id && styles.busy,
                  ]}
                >
                  <Text style={[styles.joinLabel, person.isFollowing && styles.joinedLabel]}>
                    {person.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              </View>
              {person.bio ? (
                <Text style={styles.bio} numberOfLines={2}>
                  {person.bio}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TokenColors.surface },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  title: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineLg.fontSize,
    lineHeight: TypeScale.headlineLg.lineHeight,
    fontWeight: '800',
    color: TokenColors.onSurface,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: TokenColors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: 9999,
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: TokenColors.onSurface,
  },
  errorBanner: {
    backgroundColor: TokenColors.errorContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    color: TokenColors.error,
    textAlign: 'center',
  },
  stateBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  stateTitle: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineSm.fontSize,
    fontWeight: '700',
    color: TokenColors.onSurface,
  },
  stateText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    lineHeight: TypeScale.bodySm.lineHeight,
    color: TokenColors.onSurfaceVariant,
    textAlign: 'center',
  },
  card: {
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    padding: 14,
    marginBottom: 12,
    ...Shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TokenColors.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: TokenColors.surfaceContainer,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: TokenColors.onTertiary,
  },
  info: { flex: 1, marginRight: 8 },
  name: { fontFamily: Fonts.display, fontSize: 15, fontWeight: '600', color: TokenColors.onSurface },
  handle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: TokenColors.onSurfaceVariant,
    marginTop: 2,
  },
  bio: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    lineHeight: TypeScale.bodySm.lineHeight,
    color: TokenColors.onSurfaceVariant,
    marginTop: 10,
  },
  joinBtn: {
    borderRadius: 9999,
    backgroundColor: TokenColors.onSurface,
    paddingHorizontal: 18,
    minHeight: 40,
    justifyContent: 'center',
  },
  joinedBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: AppColors.borderSubtle },
  busy: { opacity: 0.6 },
  joinLabel: {
    fontFamily: Fonts.display,
    fontSize: 13,
    fontWeight: '600',
    color: TokenColors.onPrimary,
  },
  joinedLabel: { color: TokenColors.onSurfaceVariant },
});
