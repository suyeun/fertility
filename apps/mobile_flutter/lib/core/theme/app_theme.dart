import 'package:flutter/material.dart';

/// Palette lifted from the original RN app's inline styles (apps/mobile/app/(tabs)/index.tsx etc).
class AppColors {
  AppColors._();

  static const background = Color(0xFFFFF8F9);
  static const surface = Color(0xFFFFF0F4);
  static const surfaceAlt = Color(0xFFEEF2FF);
  static const primary = Color(0xFFFF8FAB);
  static const primaryLight = Color(0xFFFFD6E0);
  static const primaryPale = Color(0xFFFFB3C6);
  static const accentPurple = Color(0xFF7C3AED);
  static const accentPurpleLight = Color(0xFFA855F7);
  static const accentIndigo = Color(0xFF818CF8);
  static const textDark = Color(0xFF5A3042);
  static const textMuted = Color(0xFFB07080);
  static const textMutedLight = Color(0xFFD4A0B0);
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
