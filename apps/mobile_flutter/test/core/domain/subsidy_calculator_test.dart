import 'package:flutter_test/flutter_test.dart';

import 'package:bom_mobile/core/domain/subsidy_calculator.dart';
import 'package:bom_mobile/core/models/subsidy.dart';

NationalRule _national() => NationalRule(
  version: '2026-07',
  totalLimit: 25,
  procedures: {
    'ivf_fresh': ProcedureRule(
      label: '체외수정(신선배아)',
      maxAmount: 1100000,
      countLimit: 20,
      countGroup: 'ivf',
    ),
    'ivf_frozen': ProcedureRule(
      label: '체외수정(동결배아)',
      maxAmount: 500000,
      countLimit: 20,
      countGroup: 'ivf',
    ),
    'iui': ProcedureRule(
      label: '인공수정',
      maxAmount: 300000,
      countLimit: 5,
      countGroup: 'iui',
    ),
  },
  extras: {
    'miscarriage_prevention': ExtraRule(label: '유산방지제', maxAmount: 200000),
  },
  eligibilityNotes: const [],
);

SubsidyRegion _seoul({String? lastVerified, Map<String, int>? overrides}) =>
    SubsidyRegion(
      regionCode: '11',
      regionName: '서울특별시',
      overrides: overrides ?? const {},
      additionalBenefits: const [],
      applyChannels: const ['정부24'],
      lastVerified: lastVerified ?? DateTime.now().toIso8601String(),
    );

void main() {
  group('SubsidyCalculator.calculate', () {
    test('지자체 오버라이드가 있으면 지자체 금액을 채택한다', () {
      final result = SubsidyCalculator.calculate(
        national: _national(),
        local: _seoul(overrides: {'ivf_fresh': 1200000}),
        procedureKey: 'ivf_fresh',
        extraKeys: const [],
        used: const UsedCounts(),
      );
      expect(result.eligible, isTrue);
      expect(result.totalMax, 1200000);
      expect(result.lineItems.first.amount, 1200000);
    });

    test('IVF 그룹 20회를 모두 사용하면 지원 대상이 아니다', () {
      final result = SubsidyCalculator.calculate(
        national: _national(),
        local: null,
        procedureKey: 'ivf_fresh',
        extraKeys: const [],
        used: const UsedCounts(ivf: 20),
      );
      expect(result.eligible, isFalse);
      expect(result.remainingCount, 0);
    });

    test('IUI 5회 중 4회 사용 시 남은 횟수는 1회다', () {
      final result = SubsidyCalculator.calculate(
        national: _national(),
        local: null,
        procedureKey: 'iui',
        extraKeys: const [],
        used: const UsedCounts(iui: 4),
      );
      expect(result.eligible, isTrue);
      expect(result.remainingCount, 1);
    });

    test('IVF+IUI 합산 25회에 도달하면 개별 한도 미달이어도 소진 처리한다', () {
      final result = SubsidyCalculator.calculate(
        national: _national(),
        local: null,
        procedureKey: 'ivf_fresh',
        extraKeys: const [],
        used: const UsedCounts(ivf: 15, iui: 10),
      );
      expect(result.eligible, isFalse);
    });

    test('출산 이력이 있으면 횟수가 리셋되어 재계산된다', () {
      final result = SubsidyCalculator.calculate(
        national: _national(),
        local: null,
        procedureKey: 'ivf_fresh',
        extraKeys: const [],
        used: const UsedCounts(ivf: 20),
        hasBirthSinceStart: true,
      );
      expect(result.eligible, isTrue);
      expect(result.remainingCount, greaterThan(0));
    });

    test('미등록 지역은 국가기준으로 계산하고 보건소 확인 경고를 포함한다', () {
      final result = SubsidyCalculator.calculate(
        national: _national(),
        local: null,
        procedureKey: 'ivf_fresh',
        extraKeys: const [],
        used: const UsedCounts(),
      );
      expect(result.eligible, isTrue);
      expect(result.totalMax, 1100000);
      expect(
        result.warnings.any((w) => w.contains('관할 보건소')),
        isTrue,
      );
      expect(result.isStale, isTrue);
    });

    test('지자체 정보가 6개월 이상 오래되면 isStale이 true다', () {
      final staleRegion = _seoul(
        lastVerified: DateTime.now()
            .subtract(const Duration(days: 200))
            .toIso8601String(),
      );
      final result = SubsidyCalculator.calculate(
        national: _national(),
        local: staleRegion,
        procedureKey: 'ivf_fresh',
        extraKeys: const [],
        used: const UsedCounts(),
      );
      expect(result.isStale, isTrue);
    });

    test('금액 문자열은 항상 "최대" 프리픽스를 포함한다', () {
      expect(formatMaxAmount(870000), '최대 870,000원');
    });

    test('신선배아와 동결배아는 서로 다른 국가기준 금액이 적용된다', () {
      final fresh = SubsidyCalculator.calculate(
        national: _national(),
        local: null,
        procedureKey: 'ivf_fresh',
        extraKeys: const [],
        used: const UsedCounts(),
      );
      final frozen = SubsidyCalculator.calculate(
        national: _national(),
        local: null,
        procedureKey: 'ivf_frozen',
        extraKeys: const [],
        used: const UsedCounts(),
      );
      expect(fresh.totalMax, 1100000);
      expect(frozen.totalMax, 500000);
      expect(fresh.totalMax, isNot(equals(frozen.totalMax)));
    });
  });
}
