import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Design system from DESIGN.md — `Serene Fellowship`.
abstract final class AppTheme {
  static const _displayFont = 'PlusJakartaSans';
  static const _bodyFont = 'Inter';

  static ColorScheme colorScheme() => const ColorScheme(
        brightness: Brightness.light,
        primary: TokenColors.primary,
        onPrimary: TokenColors.onPrimary,
        primaryContainer: TokenColors.primaryContainer,
        onPrimaryContainer: TokenColors.onPrimaryContainer,
        primaryFixed: TokenColors.primaryFixed,
        primaryFixedDim: TokenColors.primaryFixedDim,
        onPrimaryFixed: TokenColors.onPrimaryFixed,
        onPrimaryFixedVariant: TokenColors.onPrimaryFixedVariant,
        inversePrimary: TokenColors.inversePrimary,
        secondary: TokenColors.secondary,
        onSecondary: TokenColors.onSecondary,
        secondaryContainer: TokenColors.secondaryContainer,
        onSecondaryContainer: TokenColors.onSecondaryContainer,
        secondaryFixed: TokenColors.secondaryFixed,
        secondaryFixedDim: TokenColors.secondaryFixedDim,
        onSecondaryFixed: TokenColors.onSecondaryFixed,
        onSecondaryFixedVariant: TokenColors.onSecondaryFixedVariant,
        tertiary: TokenColors.tertiary,
        onTertiary: TokenColors.onTertiary,
        tertiaryContainer: TokenColors.tertiaryContainer,
        onTertiaryContainer: TokenColors.onTertiaryContainer,
        tertiaryFixed: TokenColors.tertiaryFixed,
        tertiaryFixedDim: TokenColors.tertiaryFixedDim,
        onTertiaryFixed: TokenColors.onTertiaryFixed,
        onTertiaryFixedVariant: TokenColors.onTertiaryFixedVariant,
        error: TokenColors.error,
        onError: TokenColors.onError,
        errorContainer: TokenColors.errorContainer,
        onErrorContainer: TokenColors.onErrorContainer,
        surface: TokenColors.surface,
        onSurface: TokenColors.onSurface,
        surfaceDim: TokenColors.surfaceDim,
        surfaceBright: TokenColors.surfaceBright,
        surfaceContainerLowest: TokenColors.surfaceContainerLowest,
        surfaceContainerLow: TokenColors.surfaceContainerLow,
        surfaceContainer: TokenColors.surfaceContainer,
        surfaceContainerHigh: TokenColors.surfaceContainerHigh,
        surfaceContainerHighest: TokenColors.surfaceContainerHighest,
        onSurfaceVariant: TokenColors.onSurfaceVariant,
        outline: TokenColors.outline,
        outlineVariant: TokenColors.outlineVariant,
        shadow: Colors.black,
        scrim: Colors.black,
        inverseSurface: TokenColors.inverseSurface,
        onInverseSurface: TokenColors.onInverseSurface,
        surfaceTint: TokenColors.surfaceTint,
      );

  static TextTheme textTheme(ColorScheme scheme) => TextTheme(
        displayLarge: TextStyle(
          fontFamily: _displayFont,
          fontSize: 34,
          height: 42 / 34,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.68,
          color: scheme.onSurface,
        ),
        headlineLarge: TextStyle(
          fontFamily: _displayFont,
          fontSize: 26,
          height: 34 / 26,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.39,
          color: scheme.onSurface,
        ),
        headlineMedium: TextStyle(
          fontFamily: _displayFont,
          fontSize: 20,
          height: 28 / 20,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
          color: scheme.onSurface,
        ),
        headlineSmall: TextStyle(
          fontFamily: _displayFont,
          fontSize: 17,
          height: 24 / 17,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.085,
          color: scheme.onSurface,
        ),
        titleLarge: TextStyle(
          fontFamily: _displayFont,
          fontSize: 17,
          height: 24 / 17,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.085,
          color: scheme.onSurface,
        ),
        titleMedium: TextStyle(
          fontFamily: _displayFont,
          fontSize: 15,
          height: 20 / 15,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.15,
          color: scheme.onSurface,
        ),
        titleSmall: TextStyle(
          fontFamily: _displayFont,
          fontSize: 13,
          height: 16 / 13,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.13,
          color: scheme.onSurface,
        ),
        bodyLarge: TextStyle(
          fontFamily: _bodyFont,
          fontSize: 17,
          height: 28 / 17,
          fontWeight: FontWeight.w400,
          letterSpacing: -0.17,
          color: scheme.onSurface,
        ),
        bodyMedium: TextStyle(
          fontFamily: _bodyFont,
          fontSize: 15,
          height: 24 / 15,
          fontWeight: FontWeight.w400,
          color: scheme.onSurface,
        ),
        bodySmall: TextStyle(
          fontFamily: _bodyFont,
          fontSize: 13,
          height: 18 / 13,
          fontWeight: FontWeight.w400,
          color: scheme.onSurfaceVariant,
        ),
        labelLarge: TextStyle(
          fontFamily: _displayFont,
          fontSize: 15,
          height: 20 / 15,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.15,
          color: scheme.onSurface,
        ),
        labelMedium: TextStyle(
          fontFamily: _displayFont,
          fontSize: 13,
          height: 16 / 13,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.13,
          color: scheme.onSurface,
        ),
        labelSmall: TextStyle(
          fontFamily: _displayFont,
          fontSize: 11,
          height: 14 / 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.22,
          color: scheme.onSurface,
        ),
      );

  static ThemeData light() {
    final scheme = colorScheme();
    final textTheme = AppTheme.textTheme(scheme);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      fontFamily: _bodyFont,
      textTheme: textTheme,

      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.headlineMedium,
      ),

      cardTheme: CardThemeData(
        color: TokenColors.surfaceContainerLowest,
        elevation: 1,
        shadowColor: AppColors.shadowCard,
        surfaceTintColor: Colors.transparent,
        clipBehavior: Clip.antiAlias,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderSubtle),
        ),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.royalCerulean,
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 24),
          elevation: 0,
          textStyle: textTheme.labelLarge,
          shape: const StadiumBorder(),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.neutralDark,
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 24),
          textStyle: textTheme.labelLarge,
          side: const BorderSide(color: AppColors.borderSubtle),
          shape: const StadiumBorder(),
        ),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surfaceSunkenStone,
        selectedColor: AppColors.royalCerulean,
        labelStyle: textTheme.labelMedium?.copyWith(
          color: AppColors.neutralMuted,
        ),
        secondaryLabelStyle: textTheme.labelMedium?.copyWith(
          color: Colors.white,
        ),
        side: BorderSide.none,
        shape: const StadiumBorder(),
        showCheckmark: false,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceAlabaster,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: AppColors.placeholder,
        ),
        border: _inputBorder(AppColors.borderSubtle),
        enabledBorder: _inputBorder(AppColors.borderSubtle),
        focusedBorder: _inputBorder(AppColors.royalCerulean, width: 1.5),
        errorBorder: _inputBorder(TokenColors.error),
        focusedErrorBorder: _inputBorder(TokenColors.error, width: 1.5),
      ),

      dividerTheme: const DividerThemeData(
        color: AppColors.borderSubtle,
        thickness: 1,
        space: 1,
      ),

      checkboxTheme: CheckboxThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        side: const BorderSide(color: AppColors.controlBorder, width: 2),
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? AppColors.royalCerulean
              : Colors.white,
        ),
        checkColor: const WidgetStatePropertyAll(Colors.white),
      ),

      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? AppColors.royalCerulean
              : AppColors.controlBorder,
        ),
      ),

      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppColors.royalCerulean,
        foregroundColor: Colors.white,
        elevation: 6,
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: TokenColors.surfaceContainerLowest,
        elevation: 0,
        shadowColor: AppColors.shadowCard,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderSubtle),
        ),
        titleTextStyle: textTheme.headlineMedium,
        contentTextStyle: textTheme.bodyMedium,
      ),

      textSelectionTheme: TextSelectionThemeData(
        cursorColor: AppColors.royalCerulean,
        selectionColor: AppColors.royalCerulean.withValues(alpha: 0.2),
        selectionHandleColor: AppColors.royalCerulean,
      ),
    );
  }

  /// Amber secondary action — "Pray Now", "Join Fellowship".
  static ButtonStyle amberAction(TextTheme textTheme) =>
      ElevatedButton.styleFrom(
        backgroundColor: AppColors.sunGold,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        elevation: 0,
        textStyle: textTheme.labelLarge,
        shape: const StadiumBorder(),
      );

  static OutlineInputBorder _inputBorder(Color color, {double width = 1}) =>
      OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: color, width: width),
      );
}
