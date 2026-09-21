import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api/users_api.dart';
import '../core/models/user_profile.dart';
import '../core/storage/local_cache.dart';
import 'providers.dart';

/// Port of packages/shared/store/userStore.ts (the app's single zustand
/// store) as a Riverpod StateNotifier. Preserves the original's
/// optimistic-update pattern: in-memory + local cache are updated
/// immediately, backend PATCH is fire-and-forget with errors swallowed —
/// this matches RN behavior exactly rather than "improving" it, since the
/// rewrite's goal is 1:1 behavioral parity.
class ProfileController extends StateNotifier<UserProfile?> {
  ProfileController(this._usersApi, this._localCache) : super(null);

  final UsersApi _usersApi;
  final LocalCache _localCache;

  void setProfile(UserProfile? profile) {
    state = profile;
  }

  Future<void> loadProfile() async {
    final json = await _localCache.loadProfileJson();
    if (json != null) {
      state = UserProfile.fromJson(json);
    }
  }

  /// Persists locally + fires a PATCH to the backend (errors are swallowed,
  /// matching the RN store's `.catch(() => {})`).
  Future<void> saveProfile(UserProfile profile) async {
    state = profile;
    await _localCache.saveProfileJson(profile.toJson());
    try {
      await _usersApi.updateProfile(
        UpdateProfilePayload(
          name: profile.name,
          partnerName: profile.partnerName,
          currentMode: profile.currentMode,
          treatmentStage: profile.treatmentStage,
          currentStage: profile.currentStage,
          stageStartedAt: profile.stageStartedAt,
          averageCycleLength: profile.averageCycleLength,
          averagePeriodLength: profile.averagePeriodLength,
        ),
      );
    } catch (_) {
      // Swallowed intentionally — mirrors userStore.ts saveProfile().
    }
  }

  /// GET from backend, merging in local-only stage fields that the server
  /// doesn't persist (mirrors userStore.ts syncProfile()).
  Future<void> syncProfile() async {
    try {
      final server = await _usersApi.getProfile();
      final merged = server.copyWith(
        currentStage: state?.currentStage,
        stageStartedAt: state?.stageStartedAt,
      );
      state = merged;
      await _localCache.saveProfileJson(merged.toJson());
    } catch (_) {
      // Keep whatever we already have cached/in-memory on failure.
    }
  }

  void setCurrentStage(String? stage, {String? startedAt}) {
    final current = state;
    if (current == null) return;
    state = current.copyWith(currentStage: stage, stageStartedAt: startedAt);
    _localCache.saveProfileJson(state!.toJson());
  }

  void setMode(String mode) {
    final current = state;
    if (current == null) return;
    state = current.copyWith(currentMode: mode);
    _localCache.saveProfileJson(state!.toJson());
  }

  /// RevenueCat 권한 변화 반영. 활성이면 즉시 active 로 올려 화면 잠금을 풀고,
  /// 비활성이면 서버(웹훅 반영값·체험 기간)를 다시 읽어 판정한다 — 체험 중인
  /// 사용자를 임의로 cancelled 로 내리지 않기 위함.
  Future<void> applyEntitlement(bool active) async {
    final current = state;
    if (current == null) return;
    if (active) {
      if (current.subscriptionStatus != 'active') {
        state = current.copyWith(subscriptionStatus: 'active');
        await _localCache.saveProfileJson(state!.toJson());
      }
      return;
    }
    await syncProfile();
  }

  Future<void> clearProfile() async {
    state = null;
    await _localCache.clearProfile();
  }
}

final profileControllerProvider =
    StateNotifierProvider<ProfileController, UserProfile?>((ref) {
      return ProfileController(
        ref.watch(usersApiProvider),
        ref.watch(localCacheProvider),
      );
    });
