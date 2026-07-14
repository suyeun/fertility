import 'package:flutter/material.dart';

/// Parses a '#rrggbb' hex string (as used by schedule_helpers.dart marker
/// colors) into a Color.
Color colorFromHex(String hex) {
  final clean = hex.replaceFirst('#', '');
  return Color(int.parse('FF$clean', radix: 16));
}
