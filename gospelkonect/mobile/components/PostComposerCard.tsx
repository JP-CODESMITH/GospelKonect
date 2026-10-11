import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
export type ComposerPreset = 'none' | 'photo' | 'scripture' | 'prayer';

const OPTIONS: { key: Exclude<ComposerPreset, 'none'>; label: string; icon: IconName }[] = [
  { key: 'photo', label: 'Photo', icon: 'image-outline' },
  { key: 'scripture', label: 'Scripture', icon: 'book-outline' },
  { key: 'prayer', label: 'Prayer', icon: 'heart-outline' },
];

/**
 * Sticky composer card under the top bar.
 * Tap anywhere to open the create-post sheet with an optional preset.
 */
export function PostComposerCard({ onTap }: { onTap: (preset: ComposerPreset) => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar} accessible accessibilityLabel="Your avatar">
            <Text style={styles.avatarText}>Y</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a post"
            accessibilityHint="Opens the post composer"
            hitSlop={8}
            onPress={() => onTap('none')}
            style={({ pressed }) => [styles.prompt, pressed && styles.pressed]}
          >
            <Text style={styles.promptText}>Share a testimony, prayer, or verse...</Text>
          </Pressable>
        </View>
        <View style={styles.options}>
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              accessibilityRole="button"
              accessibilityLabel={`${opt.label} post`}
              accessibilityHint={`Compose a ${opt.label.toLowerCase()} post`}
              hitSlop={8}
              onPress={() => onTap(opt.key)}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Ionicons name={opt.icon} size={18} color={TokenColors.onSurfaceVariant} />
              <Text style={styles.optionText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12, zIndex: 1 },
  card: {
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    padding: 16,
    ...Shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
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
  prompt: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: AppColors.surfaceSunkenStone,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.7 },
  promptText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: AppColors.placeholder,
  },
  options: { flexDirection: 'row', marginTop: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  optionText: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: TokenColors.onSurfaceVariant,
    marginLeft: 6,
  },
});
