import { Pressable, StyleSheet, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { AppColors, TokenColors, TypeScale, Fonts } from '../constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'amber' | 'ghost';
  accessibilityLabel?: string;
};

/**
 * Pill CTA — 48h, rounded-full.
 * primary: royal cerulean / white text (default).
 * amber: sun-gold for "Pray Now / Join" urgency.
 * ghost: transparent + hairline border.
 * States: default / pressed (0.9 opacity + scale handled by RN) /
 * disabled / loading (aria-busy + spinner).
 */
export function PillButton({ label, onPress, disabled, loading, variant = 'primary', accessibilityLabel }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'amber' && styles.amber,
        variant === 'ghost' && styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        { opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1 } as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? AppColors.neutralDark : '#FFFFFF'} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'ghost' && styles.ghostLabel,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    minWidth: 44,
    borderRadius: 9999,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: { backgroundColor: AppColors.royalCerulean },
  amber: { backgroundColor: AppColors.sunGold },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: {},
  label: {
    fontFamily: Fonts.display,
    fontSize: TypeScale.labelLg.fontSize,
    lineHeight: TypeScale.labelLg.lineHeight,
    fontWeight: TypeScale.labelLg.weight,
    letterSpacing: 0.3,
    color: TokenColors.onPrimary,
  },
  ghostLabel: { color: AppColors.neutralDark },
});
