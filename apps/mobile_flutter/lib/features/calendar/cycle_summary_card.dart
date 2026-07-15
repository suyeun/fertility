import 'package:flutter/material.dart';

import '../../core/domain/mode_helpers.dart';
import '../../core/models/enums.dart';
import '../../core/theme/app_theme.dart';

/// Port of apps/mobile/components/calendar/CycleSummary.tsx.
class CycleSummaryCard extends StatelessWidget {
  const CycleSummaryCard({
    super.key,
    required this.nextOvulationDate,
    required this.nextPeriodDate,
    required this.currentCycleDay,
    required this.cycleLength,
    required this.mode,
    required this.currentStage,
    required this.stageDay,
    this.upcomingScheduleTitle,
    this.upcomingScheduleAt,
  });

  final DateTime nextOvulationDate;
  final DateTime nextPeriodDate;
  final int currentCycleDay;
  final int cycleLength;
  final TreatmentMode mode;
  final CurrentStage currentStage;
  final int? stageDay;
  final String? upcomingScheduleTitle;
  final String? upcomingScheduleAt;

  String _fmt(DateTime d) => '${d.month}월 ${d.day}일';

  @override
  Widget build(BuildContext context) {
    if (mode == 'natural') {
      final rows = [
        ('다음 배란일', _fmt(nextOvulationDate)),
        ('다음 생리 예정', _fmt(nextPeriodDate)),
        ('사이클 평균', '$cycleLength일'),
        ('오늘 사이클', '$currentCycleDay일째'),
      ];
      return _card('✨ 이번 달 요약', rows);
    }

    if (currentStage == null && upcomingScheduleTitle == null) {
      return const SizedBox.shrink();
    }

    final stageLabel = currentStage != null
        ? getStageLabelKo(mode, currentStage)
        : '미설정';

    String? upcomingDDay;
    if (upcomingScheduleAt != null) {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final datePart = upcomingScheduleAt!.split('T')[0];
      final schDate = DateTime.tryParse(datePart);
      if (schDate != null) {
        final diff = schDate.difference(today).inDays;
        upcomingDDay = diff == 0
            ? 'D-Day'
            : (diff > 0 ? 'D-$diff' : 'D+${diff.abs()}');
      }
    }

    final rows = [
      ('현재 단계', stageLabel),
      ('이번 사이클', '${stageDay ?? 0}일차'),
      if (upcomingScheduleTitle != null && upcomingDDay != null)
        ('다음 일정', '$upcomingDDay $upcomingScheduleTitle'),
    ];

    return _card('📊 치료 요약', rows);
  }

  Widget _card(String title, List<(String, String)> rows) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12).copyWith(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primaryLight, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 10),
          for (var i = 0; i < rows.length; i++)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 6),
              decoration: BoxDecoration(
                border: i < rows.length - 1
                    ? const Border(
                        bottom: BorderSide(
                          color: AppColors.surface,
                          width: 0.5,
                        ),
                      )
                    : null,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    rows[i].$1,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textMuted,
                    ),
                  ),
                  Text(
                    rows[i].$2,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
