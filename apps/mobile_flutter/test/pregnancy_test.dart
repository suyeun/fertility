import 'package:bom_mobile/core/domain/pregnancy.dart';
import 'package:bom_mobile/core/models/user_profile.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final lmp = DateTime(2026, 6, 1);

  test('주수·일수·분기 계산', () {
    expect(gestationalAge(lmp, today: DateTime(2026, 6, 1)).label, '임신 0주 0일');
    final ga = gestationalAge(lmp, today: DateTime(2026, 8, 27)); // 87일
    expect(ga.weeks, 12);
    expect(ga.days, 3);
    expect(ga.trimester, 1);
    expect(gestationalAge(lmp, today: DateTime(2026, 9, 7)).trimester, 2); // 14주 0일
    expect(gestationalAge(lmp, today: DateTime(2026, 12, 14)).trimester, 3); // 28주
  });

  test('미래 LMP 는 0주 0일', () {
    expect(gestationalAge(lmp, today: DateTime(2026, 5, 20)).totalDays, 0);
  });

  test('출산 예정일 = LMP + 280일', () {
    expect(dueDate(lmp), DateTime(2027, 3, 8));
    expect(daysUntilDueDate(lmp, today: DateTime(2027, 3, 1)), 7);
  });

  test('이식일 기준 LMP 환산 (5일 배아 = 이식일 − 19일)', () {
    final transfer = DateTime(2026, 6, 20);
    expect(lmpFromTransfer(transfer, 5), DateTime(2026, 6, 1));
    expect(lmpFromTransfer(transfer, 3), DateTime(2026, 6, 3));
  });

  test('다음 산전 검사는 현재 주수 이후 첫 항목', () {
    expect(nextPrenatalCheck(5)!.key, 'us_early');
    expect(nextPrenatalCheck(9)!.key, 'screen1');
    expect(nextPrenatalCheck(13)!.key, 'screen1');
    expect(nextPrenatalCheck(30)!.key, 'us_growth');
    expect(nextPrenatalCheck(42), isNull);
  });

  test('주수별 안내는 빈 문자열이 아니고 41주 이후도 있다', () {
    for (var w = 0; w <= 42; w++) {
      expect(weeklyTip(w).isNotEmpty, isTrue);
    }
  });

  test('폴백 지원 항목 데이터에 확인일·면책이 있다', () {
    expect(defaultBirthBenefits.length, greaterThanOrEqualTo(5));
    expect(birthBenefitsVerifiedAt, matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')));
    expect(birthBenefitsDisclaimer, contains('확인'));
    expect(defaultBirthBenefitsData.source, 'offline');
  });

  test('서버 응답 파싱 · 빈 응답은 폴백', () {
    final parsed = BirthBenefitsData.fromJson({
      'verifiedAt': '2026-03-01',
      'disclaimer': '서버 면책 문구',
      'source': 'config',
      'items': [
        {'id': 'voucher', 'title': '바우처', 'amount': '100만 원', 'when': '임신 확인 후', 'how': '정부24'},
        {'id': '', 'title': '무효', 'amount': '', 'when': '', 'how': ''},
      ],
    }).orFallback();
    expect(parsed.source, 'config');
    expect(parsed.verifiedAt, '2026-03-01');
    expect(parsed.items.length, 1);
    expect(parsed.items.single.url, isNull);

    final empty = BirthBenefitsData.fromJson({'items': []}).orFallback();
    expect(empty.source, 'offline');
    expect(empty.items.length, defaultBirthBenefits.length);
  });

  test('UserProfile 임신 필드 파싱·copyWith 해제', () {
    final p = UserProfile.fromJson({
      'id': 'u',
      'email': 'e',
      'name': 'n',
      'treatmentStage': 'pregnant',
      'pregnancyLmpDate': '2026-06-01',
    });
    expect(p.isPregnantMode, isTrue);
    expect(p.pregnancyLmpDate, '2026-06-01');
    final kept = p.copyWith(name: 'x');
    expect(kept.pregnancyLmpDate, '2026-06-01');
    final cleared = p.copyWith(treatmentStage: 'natural', pregnancyLmpDate: null);
    expect(cleared.pregnancyLmpDate, isNull);
    expect(cleared.toJson().containsKey('pregnancyLmpDate'), isFalse);
  });
}
