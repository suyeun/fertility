import 'package:flutter/material.dart';

/// Warm cream/rose palette — ported from the Claude Design prototype
/// ("Bom App Prototype.dc.html", oklch-based) via precise oklch→sRGB conversion.
class AppColors {
  AppColors._();

  static const background = Color(0xFFFCF3EE);
  static const surface = Color(0xFFF8F0ED);
  static const surfaceAlt = Color(0xFFEAE9F8);
  static const primary = Color(0xFFE19796);
  static const primaryLight = Color(0xFFF6C2BD);
  static const primaryPale = Color(0xFFEDA9A8);
  static const primaryDark = Color(0xFFC57576);
  static const accentPurple = Color(0xFF5F49AB);
  static const accentPurpleLight = Color(0xFF8675D4);
  static const accentIndigo = Color(0xFF8675D4);
  static const accentGreen = Color(0xFF254326);
  static const accentGreenLight = Color(0xFFCAE7CA);
  static const textDark = Color(0xFF2B1E1C);
  static const textMuted = Color(0xFF7D6D6B);
  static const textMutedLight = Color(0xFF8C7C79);
  static const white = Color(0xFFFFFFFF);
  static const error = Color(0xFFDC2626);
}

class AppTheme {
  AppTheme._();

  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      fontFamily: 'Pretendard',
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        surface: AppColors.background,
        error: AppColors.error,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: AppColors.background,
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(
        bodyColor: AppColors.textDark,
        displayColor: AppColors.textDark,
        fontFamily: 'Pretendard',
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        centerTitle: false,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.white,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMutedLight,
        showUnselectedLabels: true,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Pretendard',
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}
