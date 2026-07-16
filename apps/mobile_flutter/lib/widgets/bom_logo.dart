import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

/// Minimal single-tone brand mark — replaces the 🌸 emoji (which renders as
/// a busy, inconsistent multi-color glyph across devices/fonts) with a
/// clean line icon in a soft circular badge, matching the app's flat
/// pastel-pink aesthetic.
class BomLogoMark extends StatelessWidget {
  const BomLogoMark({super.key, this.size = 64});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(color: AppColors.surface, shape: BoxShape.circle),
      child: Icon(Icons.local_florist_rounded, color: AppColors.primary, size: size * 0.52),
    );
  }
}
