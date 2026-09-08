import 'package:flutter/material.dart';

import '../../../core/domain/subsidy_calculator.dart';
import '../../../core/models/subsidy.dart';
import '../../../core/models/treatment.dart';
import '../../../core/theme/app_theme.dart';

enum _SubsidyCardState { empty, calculated, deadlineSoon }

SubsidyCalculationRecord? subsidyLatestCalculation(
  UserSubsidyProfile? profile,
) {
  final calcs = profile?.calculations;
  if (calcs == null || calcs.isEmpty) return null;
  return calcs.last;
}

int? subsidyDaysUntilDeadline(
  UserSubsidyProfile? profile,
  List<TreatmentSchedule> schedules,
) {
  final latest = subsidyLatestCalculation(profile);
  if (latest?.linkedScheduleId == null) return null;
  TreatmentSchedule? schedule;
  for (final s in schedules) {
    if (s.id == latest!.linkedScheduleId) {
      schedule = s;
      break;
    }
  }
  final scheduledAt = schedule != null
      ? DateTime.tryParse(schedule.scheduledAt)
      : null;
  if (scheduledAt == null) return null;
  return scheduledAt.difference(DateTime.now()).inDays;
}

/// 마감 임박(구독자 전용) 상태 여부 — 홈 화면이 카드 배치 순서를 정할 때도 재사용한다.
bool isSubsidyDeadlineUrgent(
  UserSubsidyProfile? profile,
  List<TreatmentSchedule> schedules,
  bool isPremium,
) {
  if (!isPremium) return false;
  final days = subsidyDaysUntilDeadline(profile, schedules);
  return days != null && days >= 0 && days <= 3;
}

/// 홈 대시보드 진입점(A) — 3-state 히어로 카드.
/// 시술 권유/효과를 암시하지 않고, 순수 재무·행정 안내 문구만 사용한다.
class SubsidyHeroCard extends StatelessWidget {
  const SubsidyHeroCard({
    super.key,
    required this.profile,
    required this.schedules,
    required this.isPremium,
    required this.onTap,
    this.onProgressTap,
  });

  final UserSubsidyProfile? profile;
  final List<TreatmentSchedule> schedules;
  final bool isPremium;
  final VoidCallback onTap;

  /// 마감 임박 카드에서 신청 진행 관리로 이동. 없으면 onTap 을 쓴다.
  final VoidCallback? onProgressTap;

  SubsidyCalculationRecord? get _latest => subsidyLatestCalculation(profile);

  int? get _daysUntilDeadline =>
      subsidyDaysUntilDeadline(profile, schedules);

  _SubsidyCardState get _state {
    if (_latest == null) return _SubsidyCardState.empty;
    if (isSubsidyDeadlineUrgent(profile, schedules, isPremium)) {
      return _SubsidyCardState.deadlineSoon;
    }
    return _SubsidyCardState.calculated;
  }

  @override
  Widget build(BuildContext context) {
    switch (_state) {
      case _SubsidyCardState.deadlineSoon:
        return _card(
          onTapOverride: onProgressTap,
          background: const Color(0xFFFFF8E1),
          border: const Color(0xFFFDE68A),
          child: Row(
            children: [
              const Text('⚠️', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '지원결정통지서 발급 마감 D-${_daysUntilDeadline ?? 0}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF92400E),
                  ),
                ),
              ),
              const Text(
                '확인하기 ›',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF92400E),
                ),
              ),
            ],
          ),
        );
      case _SubsidyCardState.calculated:
        return _card(
          background: AppColors.accentGreenLight,
          border: AppColors.accentGreen,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '예상 지원금',
                      style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      formatMaxAmount(_latest!.estimatedTotal),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.accentGreen,
                      ),
                    ),
                  ],
                ),
              ),
              const Text(
                '상세 보기 ›',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentGreen,
                ),
              ),
            ],
          ),
        );
      case _SubsidyCardState.empty:
        return _card(
          background: Colors.white,
          border: AppColors.primaryLight,
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  '이번 시술, 지원금 얼마나 받을 수 있을까요?',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textDark,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.accentGreen,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  '계산해보기',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        );
    }
  }

  Widget _card({
    required Color background,
    required Color border,
    required Widget child,
    VoidCallback? onTapOverride,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTapOverride ?? onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: border),
        ),
        child: child,
      ),
    );
  }
}
