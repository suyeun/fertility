import 'package:intl/intl.dart';

import '../models/subsidy.dart';

/// Port of the subsidy-navigator pseudocode — pure Dart, no widget/IO
/// dependencies (same shape as clinic_gate.dart).
class SubsidyLineItem {
  const SubsidyLineItem({required this.label, required this.amount});
  final String label;
  final int amount;
}

class SubsidyCalculationResult {
  const SubsidyCalculationResult({
    required this.eligible,
    this.totalMax = 0,
    this.lineItems = const [],
    this.localBenefits = const [],
    this.remainingCount = 0,
    this.warnings = const [],
    this.isStale = false,
    this.reason,
  });

  final bool eligible;
  final int totalMax;
  final List<SubsidyLineItem> lineItems;
  final List<AdditionalBenefit> localBenefits;
  final int remainingCount;
  final List<String> warnings;
  final bool isStale;
  final String? reason;

  factory SubsidyCalculationResult.notEligible(String reason) =>
      SubsidyCalculationResult(eligible: false, reason: reason);
}

/// Formats an amount with the mandatory "최대" (max) prefix — actual
/// disbursement depends on the recipient's co-pay, so the UI must never
/// present this as a guaranteed exact amount.
String formatMaxAmount(int amount) {
  return '최대 ${NumberFormat('#,###').format(amount)}원';
}

class SubsidyCalculator {
  const SubsidyCalculator._();

  static SubsidyCalculationResult calculate({
    required NationalRule national,
    SubsidyRegion? local,
    required String procedureKey, // ivf_fresh | ivf_frozen | iui
    required List<String> extraKeys,
    required UsedCounts used,
    bool hasBirthSinceStart = false,
  }) {
    final proc = national.procedures[procedureKey];
    if (proc == null) {
      return SubsidyCalculationResult.notEligible('알 수 없는 시술 종류예요.');
    }

    // 출산 시 지원 횟수가 리셋된다.
    final effectiveUsed = hasBirthSinceStart ? const UsedCounts() : used;

    final groupUsed = effectiveUsed.of(proc.countGroup);
    final remainingGroup = proc.countLimit - groupUsed;
    final remainingTotal = national.totalLimit - effectiveUsed.total;
    final remaining = remainingGroup < remainingTotal
        ? remainingGroup
        : remainingTotal;

    if (remaining <= 0) {
      return SubsidyCalculationResult.notEligible(
        '지원 횟수를 모두 사용했어요. 출산 후 횟수가 초기화돼요.',
      );
    }

    final baseAmount = local?.overrideAmount(procedureKey) ?? proc.maxAmount;

    final extraItems = extraKeys
        .map((k) {
          final e = national.extras[k];
          if (e == null) return null;
          return SubsidyLineItem(label: e.label, amount: e.maxAmount);
        })
        .whereType<SubsidyLineItem>()
        .toList();

    final localBenefits = local?.additionalBenefits ?? const [];

    final total =
        baseAmount + extraItems.fold<int>(0, (s, e) => s + e.amount);

    final warnings = <String>[
      '시술 시작 전 지원결정통지서를 발급받아야 지원돼요 (소급 불가)',
      if (local == null) '거주 지역의 세부 기준은 관할 보건소에서 최종 확인해주세요',
    ];

    return SubsidyCalculationResult(
      eligible: true,
      totalMax: total,
      lineItems: [
        SubsidyLineItem(label: proc.label, amount: baseAmount),
        ...extraItems,
      ],
      localBenefits: localBenefits,
      remainingCount: remaining,
      warnings: warnings,
      isStale: local?.isStale ?? true,
    );
  }
}
