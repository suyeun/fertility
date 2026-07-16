import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/domain/schedule_helpers.dart';
import '../../core/models/enums.dart';
import '../../core/models/treatment.dart';
import '../../core/theme/color_utils.dart';

const Map<String, ({IconData icon, String label})> _phaseBadge = {
  'menstrual': (icon: Icons.water_drop_rounded, label: '생리기'),
  'follicular': (icon: Icons.eco_rounded, label: '난포기'),
  'ovulation': (icon: Icons.star_rounded, label: '배란기'),
  'luteal': (icon: Icons.wb_sunny_rounded, label: '황체기'),
};

String _getDDay(DateTime target) {
  final t = DateTime(target.year, target.month, target.day);
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final diff = t.difference(today).inDays;
  if (diff == 0) return 'D-Day';
  return diff > 0 ? 'D-$diff' : 'D+${diff.abs()}';
}

/// Port of the HeroCard component in apps/mobile/app/(tabs)/index.tsx.
class HeroCard extends StatelessWidget {
  const HeroCard({
    super.key,
    required this.treatmentMode,
    required this.currentStage,
    required this.phase,
    required this.cycleDay,
    required this.tip,
    required this.dDay,
    required this.periodDDay,
    required this.isFertileWindow,
    required this.hasCycleData,
    required this.upcomingSchedules,
  });

  final TreatmentMode treatmentMode;
  final CurrentStage currentStage;
  final String phase;
  final int cycleDay;
  final String tip;
  final String dDay;
  final String periodDDay;
  final bool isFertileWindow;
  final bool hasCycleData;
  final List<TreatmentSchedule> upcomingSchedules;

  @override
  Widget build(BuildContext context) {
    if (treatmentMode == 'natural' && !hasCycleData) {
      return _card(
        color: const Color(0xFFFF8FAB),
        onTap: () => context.push('/settings'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              '🌱 자연임신 준비 중',
              style: TextStyle(fontSize: 11, color: Color(0xE6FFFFFF)),
            ),
            SizedBox(height: 8),
            Text(
              '생리 시작일을 입력하면\n주기를 알려드려요',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white,
                fontWeight: FontWeight.w700,
                height: 1.3,
              ),
            ),
            SizedBox(height: 12),
            _CtaPill(text: '생리 정보 입력하러 가기 →'),
          ],
        ),
      );
    }

    if (treatmentMode == 'natural') {
      final effectivePhase = (isFertileWindow && phase == 'follicular')
          ? 'follicular'
          : phase;
      final badge = _phaseBadge[effectivePhase] ?? _phaseBadge['follicular']!;
      final isGaim = isFertileWindow && phase == 'follicular';

      String dDayText;
      String dDayLabel;
      if (phase == 'menstrual') {
        dDayText = '$cycleDay일차';
        dDayLabel = '생리';
      } else if (phase == 'ovulation') {
        dDayText = '오늘 🌟';
        dDayLabel = '배란 예정일';
      } else if (phase == 'luteal') {
        dDayText = periodDDay;
        dDayLabel = '생리 예정';
      } else {
        dDayText = dDay;
        dDayLabel = '배란까지';
      }

      return _card(
        color: const Color(0xFFFF8FAB),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '🌱 자연임신 준비 중',
                  style: TextStyle(fontSize: 11, color: Color(0xBFFFFFFF)),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: isGaim ? 0.28 : 0.22),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(badge.icon, size: 14, color: Colors.white),
                      const SizedBox(width: 5),
                      Text(
                        isGaim ? '가임기' : badge.label,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '사이클 $cycleDay일째',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xD9FFFFFF),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    tip,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.white,
                      height: 1.4,
                    ),
                  ),
                ),
                if (isFertileWindow || phase == 'ovulation') ...[
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      '💗 지금은 가임기! 오늘 타이밍을 놓치지 마세요',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            Positioned(
              top: 0,
              right: 0,
              child: _DdayBadge(num: dDayText, label: dDayLabel),
            ),
          ],
        ),
      );
    }

    // IUI/IVF
    final modeLabel = treatmentMode == 'iui' ? 'IUI 인공수정' : 'IVF 시험관';
    final modeIcon = treatmentMode == 'iui'
        ? Icons.vaccines_rounded
        : Icons.biotech_rounded;
    final bgColor = treatmentMode == 'iui'
        ? const Color(0xFFA855F7)
        : const Color(0xFF7C3AED);

    if (upcomingSchedules.isEmpty) {
      return _card(
        color: bgColor,
        onTap: () => context.push('/calendar'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(modeIcon, size: 12, color: const Color(0xBFFFFFFF)),
                const SizedBox(width: 5),
                Text(
                  modeLabel,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xBFFFFFFF),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              '다가오는 일정이 없어요',
              style: TextStyle(
                fontSize: 18,
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              '캘린더에서 일정을 등록해보세요',
              style: TextStyle(fontSize: 13, color: Color(0xD9FFFFFF)),
            ),
            const SizedBox(height: 14),
            const _CtaPill(text: '일정 추가하러 가기 →'),
          ],
        ),
      );
    }

    final next = upcomingSchedules.first;
    final nextDate = DateTime.tryParse(next.scheduledAt) ?? DateTime.now();
    final nextDateStr = '${nextDate.month}월 ${nextDate.day}일';
    final nextDDay = _getDDay(nextDate);
    final nextMarker = getScheduleMarkerStyle(next.type);
    final showIcon = nextMarker.icon == Icons.circle_rounded
        ? Icons.event_rounded
        : nextMarker.icon;

    return _card(
      color: bgColor,
      onTap: () => context.push('/calendar'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(modeIcon, size: 12, color: const Color(0xBFFFFFFF)),
              const SizedBox(width: 5),
              Text(
                '$modeLabel · 다가오는 일정',
                style: const TextStyle(fontSize: 11, color: Color(0xBFFFFFFF)),
              ),
            ],
          ),
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: colorFromHex(nextMarker.color),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Icon(showIcon, size: 18, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        next.title.isNotEmpty ? next.title : nextMarker.label,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$nextDateStr · ${_timeOf(next.scheduledAt)}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xCCFFFFFF),
                        ),
                      ),
                      if (next.hospitalName != null) ...[
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(
                              Icons.local_hospital_rounded,
                              size: 11,
                              color: Color(0xB3FFFFFF),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              next.hospitalName!,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xB3FFFFFF),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                _DdayBadge(num: nextDDay, label: null),
              ],
            ),
          ),
          ...upcomingSchedules.skip(1).map((s) {
            final d = DateTime.tryParse(s.scheduledAt) ?? DateTime.now();
            final m = getScheduleMarkerStyle(s.type);
            return Container(
              margin: const EdgeInsets.only(bottom: 4),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: colorFromHex(m.color),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${s.title.isNotEmpty ? s.title : m.label}  ·  ${d.month}월 ${d.day}일  ${_getDDay(d)}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xE6FFFFFF),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  static String _timeOf(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final local = dt.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  Widget _card({
    required Color color,
    required Widget child,
    VoidCallback? onTap,
  }) {
    final content = Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(22),
      ),
      child: child,
    );
    if (onTap == null) return content;
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: onTap,
      child: content,
    );
  }
}

class _CtaPill extends StatelessWidget {
  const _CtaPill({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: Color(0xFF7C3AED),
        ),
      ),
    );
  }
}

class _DdayBadge extends StatelessWidget {
  const _DdayBadge({required this.num, this.label});
  final String num;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.25),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [
          Text(
            num,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          if (label != null)
            Text(
              label!,
              style: const TextStyle(fontSize: 10, color: Color(0xCCFFFFFF)),
            ),
        ],
      ),
    );
  }
}
