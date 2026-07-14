import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Mirrors AsyncStorage usage on the RN side: cached user profile JSON
/// (bom_user_profile) and per-date medication-checked flags
/// (med_checked_${date}) from apps/mobile/app/(tabs)/calendar/index.tsx.
class LocalCache {
  static const _profileKey = 'bom_user_profile';

  Future<void> saveProfileJson(Map<String, dynamic> json) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_profileKey, jsonEncode(json));
  }

  Future<Map<String, dynamic>?> loadProfileJson() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_profileKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> clearProfile() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_profileKey);
  }

  Future<void> setMedicationChecked(
    String dateStr,
    Set<String> checkedIds,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('med_checked_$dateStr', checkedIds.toList());
  }

  Future<Set<String>> getMedicationChecked(String dateStr) async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList('med_checked_$dateStr') ?? const []).toSet();
  }
}
