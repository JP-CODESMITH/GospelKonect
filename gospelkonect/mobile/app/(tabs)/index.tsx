import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';
import { PostComposerCard, type ComposerPreset } from '../../components/PostComposerCard';
import { CreatePostSheet, type NewPost } from '../../components/CreatePostSheet';
import { createPost, getFeed, mediaUrl, removeReaction, setReaction } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { errorText, initials, timeAgo } from '../../lib/format';
import type { Post, ReactionType } from '../../lib/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

const REACTIONS: { type: ReactionType; icon: IconName; activeIcon: IconName; label: string }[] = [
  { type: 'LIKE', icon: 'heart-outline', activeIcon: 'heart', label: 'Like' },
  { type: 'AMEN', icon: 'flame-outline', activeIcon: 'flame', label: 'Amen' },
  { type: 'LOVE', icon: 'sparkles-outline', activeIcon: 'sparkles', label: 'Love' },
];

const PAGE_SIZE = 20;

function withReaction(post: Post, next: ReactionType | null): Post {
  const reactions = { ...post.reactions };
  if (post.viewerReaction) {
    reactions[post.viewerReaction] = Math.max(0, reactions[post.viewerReaction] - 1);
  }
  if (next) reactions[next] += 1;
  return { ...post, reactions, viewerReaction: next };
}

function GlassIconButton({
  name,
  label,
  onPress,
}: {
  name: IconName;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconPressable, pressed && styles.iconPressed]}
    >
      <View style={styles.iconButton}>
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        <Ionicons name={name} size={20} color={TokenColors.onSurface} />
      </View>
    </Pressable>
  );
}

function PostCard({ post, onReact }: { post: Post; onReact: (post: Post, type: ReactionType) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {post.author.avatar ? (
          <Image source={{ uri: mediaUrl(post.author.avatar) }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(post.author.name)}</Text>
          </View>
        )}
        <View style={styles.authorCol}>
          <Text style={styles.name} numberOfLines={1}>
            {post.author.name}
          </Text>
          <Text style={styles.time}>
            @{post.author.username} · {timeAgo(post.createdAt)}
          </Text>
        </View>
      </View>

      <Text style={styles.body} numberOfLines={expanded ? undefined : 8}>
        {post.content}
      </Text>
      {post.content.length > 280 && !expanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Read more of this post"
          hitSlop={8}
          onPress={() => setExpanded(true)}
        >
          <Text style={styles.readMore}>Read more</Text>
        </Pressable>
      ) : null}

      {post.media.map((media) =>
        media.kind === 'IMAGE' ? (
          <Image
            key={media.id}
            source={{ uri: mediaUrl(media.url) }}
            style={styles.mediaImage}
            accessibilityLabel="Post attachment"
            resizeMode="cover"
          />
        ) : (
          <View key={media.id} style={styles.videoPlaceholder}>
            <Ionicons name="videocam-outline" size={20} color={TokenColors.onSurfaceVariant} />
            <Text style={styles.videoText}>Video attachment</Text>
          </View>
        ),
      )}

      <View style={styles.reactionRow}>
        {REACTIONS.map((reaction) => {
          const active = post.viewerReaction === reaction.type;
          return (
            <Pressable
              key={reaction.type}
              accessibilityRole="button"
              accessibilityLabel={`${active ? 'Remove' : 'Add'} ${reaction.label} reaction`}
              accessibilityState={{ selected: active }}
              hitSlop={6}
              onPress={() => onReact(post, reaction.type)}
              style={({ pressed }) => [
                styles.reactionButton,
                active && styles.reactionButtonActive,
                pressed && styles.iconPressed,
              ]}
            >
              <Ionicons
                name={active ? reaction.activeIcon : reaction.icon}
                size={16}
                color={active ? TokenColors.onPrimary : TokenColors.onSurfaceVariant}
              />
              <Text style={[styles.reactionCount, active && styles.reactionCountActive]}>
                {post.reactions[reaction.type]}
              </Text>
            </Pressable>
          );
        })}
        <View style={styles.commentMeta}>
          <Ionicons name="chatbubble-outline" size={15} color={TokenColors.onSurfaceVariant} />
          <Text style={styles.commentCount}>{post.commentCount}</Text>
        </View>
      </View>
    </View>
  );
}

export default function Feeds() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [preset, setPreset] = useState<ComposerPreset>('none');

  const loadFirstPage = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const page = await getFeed({ limit: PAGE_SIZE });
      setPosts(page.items);
      setCursor(page.meta.nextCursor);
    } catch (err) {
      setError(errorText(err, 'Could not load your feed.'));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || loading || refreshing) return;
    setLoadingMore(true);
    try {
      const page = await getFeed({ cursor, limit: PAGE_SIZE });
      setPosts((prev) => {
        const seen = new Set(prev.map((post) => post.id));
        return [...prev, ...page.items.filter((post) => !seen.has(post.id))];
      });
      setCursor(page.meta.nextCursor);
    } catch (err) {
      setError(errorText(err, 'Could not load more posts.'));
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loading, loadingMore, refreshing]);

  const openComposer = (nextPreset: ComposerPreset) => {
    setPreset(nextPreset);
    setSheetVisible(true);
  };

  const submitPost = async (draft: NewPost) => {
    const content = draft.scripture ? `${draft.text}\n\n— ${draft.scripture}` : draft.text;
    const created = await createPost(content);
    setPosts((prev) => [created, ...prev]);
    setSheetVisible(false);
  };

  const react = useCallback(async (post: Post, type: ReactionType) => {
    const previous = post;
    const next: ReactionType | null = post.viewerReaction === type ? null : type;
    setPosts((prev) =>
      prev.map((item) => (item.id === post.id ? withReaction(item, next) : item)),
    );

    try {
      const state = next
        ? await setReaction(post.id, next)
        : await removeReaction(post.id);
      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, reactions: state.reactions, viewerReaction: state.viewerReaction }
            : item,
        ),
      );
    } catch (err) {
      setPosts((prev) => prev.map((item) => (item.id === post.id ? previous : item)));
      setError(errorText(err, 'Could not update your reaction.'));
    }
  }, []);

  const header = (
    <>
      <PostComposerCard
        onTap={openComposer}
        initial={user ? initials(user.name) : undefined}
        avatar={user?.avatar ? mediaUrl(user.avatar) : null}
      />
      <Text style={styles.sub}>Latest from your circles</Text>
      {error ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading the feed"
          onPress={() => void loadFirstPage()}
          style={styles.errorBanner}
        >
          <Text style={styles.errorText}>{error} Tap to retry.</Text>
        </Pressable>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar backgroundColor={AppColors.feedGradientStart} />
      <LinearGradient
        colors={[AppColors.feedGradientStart, AppColors.feedGradientEnd]}
        locations={[0, 1]}
        style={styles.scrim}
        pointerEvents="none"
      />
      <View style={styles.topBar}>
        <GlassIconButton name="search-outline" label="Search feeds" />
        <Text style={styles.topTitle}>Feeds</Text>
        <GlassIconButton
          name="refresh-outline"
          label="Refresh feed"
          onPress={() => void loadFirstPage(true)}
        />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} onReact={react} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={TokenColors.primary} />
              <Text style={styles.stateText}>Loading your feed…</Text>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Ionicons name="leaf-outline" size={28} color={TokenColors.outline} />
              <Text style={styles.stateTitle}>Your feed is quiet</Text>
              <Text style={styles.stateText}>
                Follow people or share the first post to get things moving.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={TokenColors.primary} style={styles.footerSpinner} />
          ) : null
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFirstPage(true)}
            tintColor={TokenColors.primary}
          />
        }
      />

      <CreatePostSheet
        visible={sheetVisible}
        preset={preset}
        onClose={() => setSheetVisible(false)}
        onSubmit={submitPost}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TokenColors.surface },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 1,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineMd.fontSize,
    lineHeight: TypeScale.headlineMd.lineHeight,
    fontWeight: '600',
    color: TokenColors.onSurface,
  },
  iconPressable: {
    width: 44,
    height: 44,
    borderRadius: 9999,
  },
  iconPressed: { opacity: 0.7 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  sub: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: TokenColors.onSurfaceVariant,
    marginTop: 12,
    marginBottom: 16,
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
    lineHeight: TypeScale.bodySm.lineHeight,
    color: TokenColors.error,
    textAlign: 'center',
  },
  card: {
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  authorCol: { flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TokenColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: TokenColors.surfaceContainer,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 17,
    fontWeight: '700',
    color: TokenColors.onPrimary,
  },
  name: { fontFamily: Fonts.display, fontSize: 15, fontWeight: '600', color: TokenColors.onSurface },
  time: { fontFamily: Fonts.body, fontSize: 12, color: TokenColors.outline, marginTop: 1 },
  body: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurface,
  },
  readMore: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: TokenColors.primary,
    marginTop: 6,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: TokenColors.surfaceContainer,
  },
  videoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: TokenColors.surfaceContainer,
    gap: 8,
  },
  videoText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    color: TokenColors.onSurfaceVariant,
  },
  reactionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    borderRadius: 9999,
    paddingHorizontal: 10,
    backgroundColor: AppColors.surfaceSunkenStone,
  },
  reactionButtonActive: { backgroundColor: TokenColors.primaryContainer },
  reactionCount: {
    fontFamily: Fonts.display,
    fontSize: 12,
    fontWeight: '600',
    color: TokenColors.onSurfaceVariant,
    marginLeft: 4,
  },
  reactionCountActive: { color: TokenColors.onPrimary },
  commentMeta: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 4 },
  commentCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: TokenColors.onSurfaceVariant,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
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
  footerSpinner: { paddingVertical: 20 },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%' },
});
