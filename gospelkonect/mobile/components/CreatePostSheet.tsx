import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { AppColors, Fonts, Shadows, TokenColors, TypeScale } from '../constants/theme';
import { PillButton } from './PillButton';
import type { ComposerPreset } from './PostComposerCard';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type NewPost = { text: string; preset: ComposerPreset; scripture?: string };

const CHIPS: { key: Exclude<ComposerPreset, 'none'>; label: string; icon: IconName }[] = [
  { key: 'photo', label: 'Photo', icon: 'image-outline' },
  { key: 'scripture', label: 'Scripture', icon: 'book-outline' },
  { key: 'prayer', label: 'Prayer', icon: 'heart-outline' },
];

/**
 * Bottom-sheet composer. Local only — submit prepends to the feed, no backend.
 */
export function CreatePostSheet({
  visible,
  preset,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  preset: ComposerPreset;
  onClose: () => void;
  onSubmit: (post: NewPost) => void;
}) {
  const [text, setText] = useState('');
  const [scripture, setScripture] = useState('');
  const [active, setActive] = useState<ComposerPreset>(preset);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setActive(preset);
      setError('');
      setSending(false);
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, preset]);

  const toggle = (key: Exclude<ComposerPreset, 'none'>) =>
    setActive((prev) => (prev === key ? 'none' : key));

  const share = () => {
    if (!text.trim()) {
      setError('Write something to share first.');
      return;
    }
    setSending(true);
    onSubmit({ text: text.trim(), preset: active, scripture: scripture.trim() || undefined });
    setText('');
    setScripture('');
    setError('');
    setSending(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss composer"
        onPress={onClose}
        style={styles.backdrop}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View
          accessible
          accessibilityRole="none"
          accessibilityViewIsModal
          accessibilityLabel="Create a post"
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Create post</Text>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={(v) => {
              setText(v);
              if (error) setError('');
            }}
            placeholder="Share a testimony, prayer, or verse..."
            placeholderTextColor={AppColors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Post text"
            style={styles.input}
          />
          {active === 'scripture' && (
            <View>
              <TextInput
                value={scripture}
                onChangeText={setScripture}
                placeholder="Scripture citation, e.g. Psalm 46:10"
                placeholderTextColor={AppColors.placeholder}
                accessibilityLabel="Scripture citation"
                style={styles.citeInput}
              />
              <View style={styles.versePreview}>
                <Text style={styles.verseText} numberOfLines={3}>
                  {text || 'Your verse will preview here.'}
                </Text>
              </View>
            </View>
          )}
          {active === 'prayer' && (
            <View style={styles.prayerBadge}>
              <Ionicons name="heart-outline" size={16} color={AppColors.prayerBadgeText} />
              <Text style={styles.prayerText}>Prayer request</Text>
            </View>
          )}
          {active === 'photo' && (
            <View style={styles.photoHint}>
              <Ionicons name="image-outline" size={16} color={TokenColors.onSurfaceVariant} />
              <Text style={styles.photoText}>Photo upload coming soon — describe it in text.</Text>
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.chips}>
            {CHIPS.map((chip) => {
              const selected = active === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${chip.label} tag`}
                  accessibilityState={{ selected }}
                  hitSlop={8}
                  onPress={() => toggle(chip.key)}
                  style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
                >
                  <Ionicons
                    name={chip.icon}
                    size={16}
                    color={selected ? TokenColors.onPrimary : TokenColors.onSurfaceVariant}
                  />
                  <Text style={selected ? styles.chipTextOn : styles.chipTextOff}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.footer}>
            <PillButton label="Cancel" variant="ghost" onPress={onClose} />
            <View style={styles.shareWrap}>
              <PillButton
                label={sending ? 'Sharing...' : 'Share'}
                onPress={share}
                disabled={!text.trim() || sending}
                loading={sending}
                accessibilityLabel="Share post"
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,28,45,0.45)' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: TokenColors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    padding: 20,
    paddingBottom: 28,
    ...Shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 9999,
    backgroundColor: AppColors.controlBorder,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.headlineSm.fontSize,
    fontWeight: '600',
    color: TokenColors.onSurface,
    marginBottom: 12,
  },
  input: {
    minHeight: 110,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSunkenStone,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    padding: 14,
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurface,
  },
  citeInput: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSunkenStone,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    paddingHorizontal: 14,
    marginTop: 10,
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodyMd.fontSize,
    color: TokenColors.onSurface,
  },
  versePreview: {
    marginTop: 10,
    backgroundColor: AppColors.surfaceAlabaster,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.sunGold,
    borderRadius: 8,
    padding: 12,
  },
  verseText: {
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    fontSize: TypeScale.bodyMd.fontSize,
    lineHeight: TypeScale.bodyMd.lineHeight,
    color: TokenColors.onSurface,
  },
  prayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: AppColors.prayerBadgeSurface,
    borderWidth: 1,
    borderColor: AppColors.prayerBadgeBorder,
    borderRadius: 9999,
    paddingHorizontal: 12,
    minHeight: 32,
  },
  prayerText: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: AppColors.prayerBadgeText,
    marginLeft: 6,
  },
  photoHint: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  photoText: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    color: TokenColors.onSurfaceVariant,
    marginLeft: 6,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: TypeScale.bodySm.fontSize,
    color: TokenColors.error,
    marginTop: 8,
  },
  chips: { flexDirection: 'row', marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: 9999,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  chipOff: { backgroundColor: AppColors.surfaceSunkenStone },
  chipOn: { backgroundColor: TokenColors.primaryContainer },
  chipTextOff: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: TokenColors.onSurfaceVariant,
    marginLeft: 6,
  },
  chipTextOn: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelMd.fontSize,
    fontWeight: '600',
    color: TokenColors.onPrimary,
    marginLeft: 6,
  },
  footer: { flexDirection: 'row', marginTop: 16, alignItems: 'center' },
  shareWrap: { flex: 1, marginLeft: 12 },
});
