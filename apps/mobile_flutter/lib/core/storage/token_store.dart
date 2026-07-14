import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Mirrors apps/mobile/lib/auth.ts — secure JWT + minimal user blob storage.
/// Keeps an in-memory cache so the dio interceptor can attach the auth header
/// synchronously without awaiting SecureStorage on every request.
class TokenStore {
  TokenStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _tokenKey = 'bom_access_token';
  static const _userKey = 'bom_user';

  final FlutterSecureStorage _storage;
  String? _cachedToken;

  String? get cachedToken => _cachedToken;

  Future<void> hydrate() async {
    _cachedToken = await _storage.read(key: _tokenKey);
  }

  Future<String?> getToken() async {
    if (_cachedToken != null) return _cachedToken;
    _cachedToken = await _storage.read(key: _tokenKey);
    return _cachedToken;
  }

  Future<void> setToken(String? token) async {
    _cachedToken = token;
    if (token == null) {
      await _storage.delete(key: _tokenKey);
    } else {
      await _storage.write(key: _tokenKey, value: token);
    }
  }

  Future<void> saveUser({required String uid, required String email}) async {
    await _storage.write(
      key: _userKey,
      value: jsonEncode({'uid': uid, 'email': email}),
    );
  }

  Future<Map<String, String>?> loadUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null) return null;
    final map = jsonDecode(raw) as Map<String, dynamic>;
    return map.map((key, value) => MapEntry(key, value.toString()));
  }

  Future<void> clearAuth() async {
    _cachedToken = null;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
  }
}
