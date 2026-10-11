import { Pressable, ScrollView, StyleSheet, Text, View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Placeholder feed — static mock data, no backend wiring yet.
const POSTS = [
  {
    id: '1',
    name: 'Grace M.',
    time: '2h ago',
    text: 'Morning devotion: “Be still, and know that I am God.” — Psalm 46:10. Sitting with this today.',
    likes: 24,
    comments: 6,
  },
  {
    id: '2',
    name: 'Prayer Circle',
    time: '5h ago',
    text: 'Join us tonight at 7pm for the weekly prayer chain. All are welcome — bring a friend.',
    likes: 41,
    comments: 12,
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
        <Text style={styles.sub}>Latest from your circles</Text>
        {POSTS.map((post) => (
          <View key={post.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.name}>{post.name}</Text>
                <Text style={styles.time}>{post.time}</Text>
              </View>
            </View>
            <Text style={styles.body}>{post.text}</Text>
            <Text style={styles.meta}>
              {post.likes} likes · {post.comments} comments
            </Text>
          </View>
        ))}
      </ScrollView>
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
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },
  sub: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: TokenColors.onSurfaceVariant,
    marginTop: 4,
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
  body: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
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
