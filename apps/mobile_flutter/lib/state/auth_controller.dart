import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api/auth_api.dart';
import '../core/push/local_notifications.dart';
import '../core/storage/token_store.dart';
import 'profile_controller.dart';
import 'providers.dart';

/// Centralizes the auth/onboarding gate that RN scattered across each
/// screen's own mount effect ((tabs)/index.tsx, calendar, records, ...).
/// Same decision rules, single place: go_router's redirect reads this.
enum AuthStatus { unknown, unauthenticated, needsOnboarding, authenticated }

class AuthState {
  const AuthState({required this.status, this.uid, this.email});
  final AuthStatus status;
  final String? uid;
  final String? email;
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref, this._authApi, this._tokenStore)
    : super(const AuthState(status: AuthStatus.unknown)) {
    _bootstrap();
  }

  final Ref _ref;
  final AuthApi _authApi;
  final TokenStore _tokenStore;

  Future<void> _bootstrap() async {
    await _tokenStore.hydrate();
    final token = _tokenStore.cachedToken;
    if (token == null) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }
    await _validateAndLoadProfile();
  }

  Future<void> _validateAndLoadProfile() async {
    try {
      final me = await _authApi.me();
      final profileController = _ref.read(profileControllerProvider.notifier);
      await profileController.syncProfile();
      final profile = _ref.read(profileControllerProvider);

      final needsOnboarding = profile?.treatmentStage == null;
      state = AuthState(
        status: needsOnboarding
            ? AuthStatus.needsOnboarding
            : AuthStatus.authenticated,
        uid: me['uid'] as String? ?? me['id'] as String?,
        email: me['email'] as String?,
      );
    } catch (_) {
      await logout();
    }
  }

  Future<void> login(String email, String password) async {
    final result = await _authApi.login(email, password);
    await _tokenStore.setToken(result.accessToken);
    await _tokenStore.saveUser(uid: result.uid, email: result.email);
    // Fire-and-forget, matches RN login screen's registerPushToken().catch(() => {}).
    LocalNotifications.instance.registerPushToken();
    await _validateAndLoadProfile();
  }

  Future<void> signup({
    required String email,
    required String password,
    required String name,
    String? partnerName,
  }) async {
    final result = await _authApi.signup(
      email: email,
      password: password,
      name: name,
      partnerName: partnerName,
    );
    await _tokenStore.setToken(result.accessToken);
    await _tokenStore.saveUser(uid: result.uid, email: result.email);
    LocalNotifications.instance.registerPushToken();
    await _validateAndLoadProfile();
  }

  /// Called once onboarding completes and the profile now has a treatmentStage.
  void markOnboarded() {
    state = AuthState(
      status: AuthStatus.authenticated,
      uid: state.uid,
      email: state.email,
    );
  }

  Future<void> logout() async {
    await _tokenStore.clearAuth();
    await _ref.read(profileControllerProvider.notifier).clearProfile();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    return AuthController(
      ref,
      ref.watch(authApiProvider),
      ref.watch(tokenStoreProvider),
    );
  },
);
