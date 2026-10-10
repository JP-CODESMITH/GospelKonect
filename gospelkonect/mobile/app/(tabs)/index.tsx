import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';

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

export default function Feeds() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Feeds</Text>
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
});
