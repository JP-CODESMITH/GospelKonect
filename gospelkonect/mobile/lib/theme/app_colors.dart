import 'package:flutter/material.dart';

/// Material 3 role tokens from DESIGN.md frontmatter (`Serene Fellowship`).
abstract final class TokenColors {
  static const surface = Color(0xFFF9F9FF);
  static const surfaceDim = Color(0xFFCFDAF2);
  static const surfaceBright = Color(0xFFF9F9FF);
  static const surfaceContainerLowest = Color(0xFFFFFFFF);
  static const surfaceContainerLow = Color(0xFFF0F3FF);
  static const surfaceContainer = Color(0xFFE7EEFF);
  static const surfaceContainerHigh = Color(0xFFDEE8FF);
  static const surfaceContainerHighest = Color(0xFFD8E3FB);
  static const onSurface = Color(0xFF111C2D);
  static const onSurfaceVariant = Color(0xFF444651);
  static const inverseSurface = Color(0xFF263143);
  static const onInverseSurface = Color(0xFFECF1FF);
  static const outline = Color(0xFF757682);
  static const outlineVariant = Color(0xFFC5C5D3);
  static const surfaceTint = Color(0xFF4059AA);

  static const primary = Color(0xFF00236F);
  static const onPrimary = Color(0xFFFFFFFF);
  static const primaryContainer = Color(0xFF1E3A8A);
  static const onPrimaryContainer = Color(0xFF90A8FF);
  static const inversePrimary = Color(0xFFB6C4FF);

  static const secondary = Color(0xFF904D00);
  static const onSecondary = Color(0xFFFFFFFF);
  static const secondaryContainer = Color(0xFFFE932C);
  static const onSecondaryContainer = Color(0xFF663500);

  static const tertiary = Color(0xFF193000);
  static const onTertiary = Color(0xFFFFFFFF);
  static const tertiaryContainer = Color(0xFF294800);
  static const onTertiaryContainer = Color(0xFF87BB4B);

  static const error = Color(0xFFBA1A1A);
  static const onError = Color(0xFFFFFFFF);
  static const errorContainer = Color(0xFFFFDAD6);
  static const onErrorContainer = Color(0xFF93000A);

  static const primaryFixed = Color(0xFFDCE1FF);
  static const primaryFixedDim = Color(0xFFB6C4FF);
  static const onPrimaryFixed = Color(0xFF00164E);
  static const onPrimaryFixedVariant = Color(0xFF264191);
  static const secondaryFixed = Color(0xFFFFDCC3);
  static const secondaryFixedDim = Color(0xFFFFB77D);
  static const onSecondaryFixed = Color(0xFF2F1500);
  static const onSecondaryFixedVariant = Color(0xFF6E3900);
  static const tertiaryFixed = Color(0xFFBBF37C);
  static const tertiaryFixedDim = Color(0xFFA0D663);
  static const onTertiaryFixed = Color(0xFF0F2000);
  static const onTertiaryFixedVariant = Color(0xFF2E4F00);
}

/// Brand accents from DESIGN.md prose (`Colors`, `Components`, `Elevation`).
abstract final class AppColors {
  /// Royal Cerulean — primary actions, active tabs, primary navigation.
  static const royalCerulean = Color(0xFF1E3A8A);

  /// Warm Sun-Gold — secondary/urgent actions, highlights, reactions.
  static const sunGold = Color(0xFFD97706);

  /// Serene Olive — prayer status, answered prayers, growth.
  static const sereneOlive = Color(0xFF4D7C0F);

  /// Love/blessing reactions and urgent prayer needs only.
  static const reactionRose = Color(0xFFE11D48);

  static const neutralDark = Color(0xFF1E293B);
  static const neutralMuted = Color(0xFF64748B);
  static const placeholder = Color(0xFF94A3B8);

  static const borderSubtle = Color(0xFFE2E8F0);
  static const controlBorder = Color(0xFFCBD5E1);

  static const surfaceAlabaster = Color(0xFFF8FAFC);
  static const surfacePureWhite = Color(0xFFFFFFFF);
  static const surfaceSunkenStone = Color(0xFFF1F5F9);

  static const prayerBadgeSurface = Color(0xFFECFDF5);
  static const prayerBadgeBorder = Color(0xFFD1FAE5);
  static const prayerBadgeText = Color(0xFF047857);

  static const shadowCard = Color(0x0F1E293B);
  static const shadowWarm = Color(0x381E3A8A);
}
