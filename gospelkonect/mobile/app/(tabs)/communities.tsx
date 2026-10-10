import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../../constants/theme';

// Placeholder communities — static mock data, no backend wiring yet.
const GROUPS = [
  { id: '1', name: 'Morning Devotionals', members: '12.4k members' },
  { id: '2', name: 'City Prayer Chain', members: '3.1k members' },
  { id: '3', name: 'Worship Musicians', members: '8.7k members' },
  { id: '4', name: 'New Believers', members: '5.2k members' },
];

export default function Communities() {
  const [joined, setJoined] = useState<string[]>([]);

  const toggle = (id: string) =>
    setJoined((prev) => (prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]));

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Communities</Text>
        <Text style={styles.sub}>Find your circle</Text>
        {GROUPS.map((group) => {
          const isJoined = joined.includes(group.id);
          return (
            <View key={group.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{group.name.charAt(0)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{group.name}</Text>
                  <Text style={styles.members}>{group.members}</Text>
                </View>
                <Pressable
                  onPress={() => toggle(group.id)}
                  accessibilityRole="button"
                  accessibilityLabel={isJoined ? `Leave ${group.name}` : `Join ${group.name}`}
                  accessibilityState={{ selected: isJoined }}
                  hitSlop={4}
                  style={[styles.joinBtn, isJoined && styles.joinedBtn]}
                >
                  <Text style={[styles.joinLabel, isJoined && styles.joinedLabel]}>
                    {isJoined ? 'Joined' : 'Join'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
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
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: TokenColors.onTertiary,
  },
  info: { flex: 1 },
  name: { fontFamily: Fonts.display, fontSize: 15, fontWeight: '600', color: TokenColors.onSurface },
  members: { fontFamily: Fonts.body, fontSize: 13, color: TokenColors.onSurfaceVariant, marginTop: 2 },
  joinBtn: {
    borderRadius: 9999,
    backgroundColor: TokenColors.onSurface,
    paddingHorizontal: 18,
    minHeight: 40,
    justifyContent: 'center',
  },
  joinedBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: AppColors.borderSubtle },
  joinLabel: { fontFamily: Fonts.display, fontSize: 13, fontWeight: '600', color: TokenColors.onPrimary },
  joinedLabel: { color: TokenColors.onSurfaceVariant },
});
