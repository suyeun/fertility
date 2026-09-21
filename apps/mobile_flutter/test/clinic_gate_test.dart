import 'package:bom_mobile/core/domain/clinic_gate.dart';
import 'package:bom_mobile/core/models/user_profile.dart';
import 'package:bom_mobile/core/purchases/purchases_service.dart';
import 'package:flutter_test/flutter_test.dart';

UserProfile _profile(String status, {String? trialEndsAt, String? expiresAt}) =>
    UserProfile.fromJson({
      'id': 'u1',
      'email': 't@example.com',
      'name': '테스트',
      'subscriptionStatus': status,
      if (trialEndsAt != null) 'trialEndsAt': trialEndsAt,
      if (expiresAt != null) 'subscriptionExpiresAt': expiresAt,
    });

void main() {
  tearDown(() => PurchasesService.instance.debugSetEntitlement(null));

  test('RevenueCat 권한이 활성이면 Firestore 상태와 무관하게 프리미엄', () {
    PurchasesService.instance.debugSetEntitlement(true);
    expect(isPremiumProfile(_profile('cancelled')), isTrue);
  });

  test('RevenueCat 권한이 비활성이어도 유효한 체험 기간이면 프리미엄 (서버 판정 보조)', () {
    PurchasesService.instance.debugSetEntitlement(false);
    final future = DateTime.now().add(const Duration(days: 3)).toIso8601String();
    expect(isPremiumProfile(_profile('trial', trialEndsAt: future)), isTrue);
  });

  test('권한 미확인(null) + 체험 만료 → 잠김', () {
    final past = DateTime.now().subtract(const Duration(days: 1)).toIso8601String();
    expect(isPremiumProfile(_profile('trial', trialEndsAt: past)), isFalse);
  });

  test('취소 상태는 만료일 전까지 프리미엄, 지나면 잠김', () {
    final future = DateTime.now().add(const Duration(days: 2)).toIso8601String();
    final past = DateTime.now().subtract(const Duration(days: 2)).toIso8601String();
    expect(isPremiumProfile(_profile('cancelled', expiresAt: future)), isTrue);
    expect(isPremiumProfile(_profile('cancelled', expiresAt: past)), isFalse);
  });

  test('무료 사용자는 첫 일정 1건만, 두 번째부터 잠김', () {
    const free = ClinicGateContext(isPremium: false, existingScheduleCount: 0);
    const freeSecond = ClinicGateContext(isPremium: false, existingScheduleCount: 1);
    expect(canUseClinicScheduler(ClinicFeature.registerFirstSchedule, free), isTrue);
    expect(canUseClinicScheduler(ClinicFeature.registerFirstSchedule, freeSecond), isFalse);
    expect(canUseClinicScheduler(ClinicFeature.medicationReminder, free), isFalse);
  });
}
