import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { PostComposerCard, type ComposerPreset } from '../../components/PostComposerCard';
import { CreatePostSheet, type NewPost } from '../../components/CreatePostSheet';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Post = {
  id: string;
  name: string;
  time: string;
  text: string;
  likes: number;
  comments: number;
  tag?: Exclude<ComposerPreset, 'none' | 'photo'>;
  scripture?: string;
};

// Placeholder feed — static mock data, no backend wiring yet.
const SEED_POSTS: Post[] = [
  {
    id: '1',
    name: 'Grace M.',
    time: '2h ago',
    text: 'Morning devotion: “Be still, and know that I am God.” — Psalm 46:10. Sitting with this today.',
    likes: 24,
    comments: 6,
    tag: 'scripture',
    scripture: 'Psalm 46:10',
  },
  {
    id: '2',
    name: 'Prayer Circle',
    time: '5h ago',
    text: 'Join us tonight at 7pm for the weekly prayer chain. All are welcome — bring a friend.',
    likes: 41,
    comments: 12,
    tag: 'prayer',
  },
  {
    id: '3',
    name: 'David O.',
    time: '1d ago',
    text: 'Testimony: after months of praying, I finally got the job. God is faithful!',
    likes: 89,
    comments: 23,
  },
];

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

export default function Feeds() {
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [preset, setPreset] = useState<ComposerPreset>('none');

  const openComposer = (p: ComposerPreset) => {
    setPreset(p);
    setSheetVisible(true);
  };

  const submitPost = (draft: NewPost) => {
    setPosts((prev) => [
      {
        id: `local-${Date.now()}`,
        name: 'You',
        time: 'Just now',
        text: draft.text,
        likes: 0,
        comments: 0,
        tag: draft.preset === 'scripture' || draft.preset === 'prayer' ? draft.preset : undefined,
        scripture: draft.scripture,
      },
      ...prev,
    ]);
    setSheetVisible(false);
  };

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
        <GlassIconButton name="settings-outline" label="Feed settings" />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PostComposerCard onTap={openComposer} />
        <Text style={styles.sub}>Latest from your circles</Text>
        {posts.map((post) => (
          <View key={post.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.name.charAt(0)}</Text>
              </View>
              <View style={styles.authorCol}>
                <Text style={styles.name}>{post.name}</Text>
                <Text style={styles.time}>{post.time}</Text>
              </View>
              {post.tag === 'prayer' && (
                <View style={styles.prayerBadge}>
                  <Ionicons name="heart-outline" size={14} color={AppColors.prayerBadgeText} />
                  <Text style={styles.prayerText}>Prayer</Text>
                </View>
              )}
            </View>
            <Text style={styles.body}>{post.text}</Text>
            {post.tag === 'scripture' && (
              <View style={styles.verseCallout}>
                <Text style={styles.verseText}>{post.scripture ?? 'Scripture'}</Text>
              </View>
            )}
            <Text style={styles.meta}>
              {post.likes} likes · {post.comments} comments
            </Text>
          </View>
        ))}
      </ScrollView>
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
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 17,
    fontWeight: '700',
    color: TokenColors.onPrimary,
  },
  name: { fontFamily: Fonts.display, fontSize: 15, fontWeight: '600', color: TokenColors.onSurface },
  time: { fontFamily: Fonts.body, fontSize: 12, color: TokenColors.outline },
  prayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.prayerBadgeSurface,
    borderWidth: 1,
    borderColor: AppColors.prayerBadgeBorder,
    borderRadius: 9999,
    paddingHorizontal: 10,
    minHeight: 32,
  },
  prayerText: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: AppColors.prayerBadgeText,
    marginLeft: 4,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurface,
  },
  verseCallout: {
    marginTop: 10,
    backgroundColor: AppColors.surfaceAlabaster,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.sunGold,
    borderRadius: 8,
    padding: 12,
  },
  verseText: {
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    fontSize: TypeScale.bodyMd.fontSize,
    color: TokenColors.onSurface,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    color: TokenColors.onSurfaceVariant,
    marginTop: 10,
  },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%' },
});
