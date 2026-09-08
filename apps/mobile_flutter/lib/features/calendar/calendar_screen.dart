import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/domain/calendar_data.dart';
import '../../core/domain/clinic_gate.dart';
import '../../core/domain/schedule_helpers.dart';
import '../../core/models/models.dart';
import '../../core/push/local_notifications.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/color_utils.dart';
import '../../state/profile_controller.dart';
import '../../state/providers.dart';
import '../../widgets/paywall_modal.dart';
import '../subsidy/widgets/subsidy_inline_banner.dart';
import 'cycle_summary_card.dart';
import 'day_cell.dart';
import 'day_detail_modal.dart';
import 'schedule_modal.dart';

const _weekdays = ['일', '월', '화', '수', '목', '금', '토'];

class LegendItem {
  const LegendItem({required this.color, required this.label, this.icon});
  final Color color;
  final String label;
  final IconData? icon;
}

List<LegendItem> getLegend(TreatmentMode mode) {
  if (mode == 'natural') {
    return const [
      LegendItem(color: Color(0xFFFFDCDB), label: '생리'),
      LegendItem(color: Color(0xFFEAE8FF), label: '가임기'),
      LegendItem(color: AppColors.primary, label: '배란일'),
      LegendItem(
        color: AppColors.primaryDark,
        label: '관계일',
        icon: Icons.favorite_rounded,
      ),
    ];
  }
  if (mode == 'iui') {
    return const [
      LegendItem(color: Color(0xFFFFDCDB), label: '생리'),
      LegendItem(color: Color(0xFFEAE8FF), label: '가임기'),
      LegendItem(color: AppColors.primary, label: '배란일'),
      LegendItem(
        color: AppColors.primary,
        label: '인공수정',
        icon: Icons.star_rounded,
      ),
      LegendItem(
        color: AppColors.accentPurpleLight,
        label: '초음파',
        icon: Icons.circle_rounded,
      ),
      LegendItem(
        color: Color(0xFF60A5FA),
        label: '주사',
        icon: Icons.circle_rounded,
      ),
    ];
  }
  return const [
    LegendItem(color: Color(0xFFFFDCDB), label: '생리'),
    LegendItem(
      color: Color(0xFF2DD4BF),
      label: '이식',
      icon: Icons.favorite_rounded,
    ),
    LegendItem(
      color: Color(0xFFF97316),
      label: '채취',
      icon: Icons.adjust_rounded,
    ),
    LegendItem(
      color: AppColors.accentPurpleLight,
      label: '초음파',
      icon: Icons.circle_rounded,
    ),
    LegendItem(
      color: Color(0xFF60A5FA),
      label: '주사',
      icon: Icons.circle_rounded,
    ),
    LegendItem(
      color: Color(0xFFFBBF24),
      label: '판정일',
      icon: Icons.star_outline_rounded,
    ),
  ];
}

/// 캘린더 일별 상세의 5단계 감정 컨디션 (감정일기 mood를 대체).
const conditionOptions = [
  (condition: 5, emoji: '😊', label: '좋음'),
  (condition: 4, emoji: '🙂', label: '괜찮음'),
  (condition: 3, emoji: '😐', label: '보통'),
  (condition: 2, emoji: '😔', label: '힘듦'),
  (condition: 1, emoji: '😢', label: '많이 힘듦'),
];

/// Port of apps/mobile/app/(tabs)/calendar/index.tsx — the largest screen.
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  List<MenstrualCycle> _cycles = [];
  List<TreatmentSchedule> _schedules = [];
  List<HormoneRecord> _hormones = [];
  List<DailyNote> _dailyNotes = [];
  bool _loading = true;

  DateTime _viewDate = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime? _selectedDate;

  StageSuggestion? _stageSuggestion;
  TreatmentSchedule? _subsidyEligibleSchedule;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ref.read(cyclesApiProvider).getAll(),
        ref.read(hormonesApiProvider).getAll(),
        ref.read(treatmentApiProvider).getAll(),
        ref.read(dailyNotesApiProvider).getAll(),
      ]);
      if (!mounted) return;
      setState(() {
        _cycles = results[0] as List<MenstrualCycle>;
        _hormones = results[1] as List<HormoneRecord>;
        _schedules = results[2] as List<TreatmentSchedule>;
        _dailyNotes = results[3] as List<DailyNote>;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refreshSchedules() async {
    final updated = await ref.read(treatmentApiProvider).getAll();
    if (mounted) setState(() => _schedules = updated);
  }

  Future<void> _refreshCycles() async {
    final updated = await ref.read(cyclesApiProvider).getAll();
    if (mounted) setState(() => _cycles = updated);
  }

  Future<void> _refreshDailyNotes() async {
    final updated = await ref.read(dailyNotesApiProvider).getAll();
    if (mounted) setState(() => _dailyNotes = updated);
  }

  String get _todayStr => toLocalDateStr(DateTime.now());

  String get _selectedDateStr =>
      _selectedDate != null ? toLocalDateStr(_selectedDate!) : _todayStr;

  List<MenstrualCycle> get _sortedCycles {
    final list = [..._cycles];
    list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  MenstrualCycle? get _latestCycle =>
      _sortedCycles.isNotEmpty ? _sortedCycles.first : null;

  DateTime? get _lastPeriod =>
      _latestCycle != null ? DateTime.tryParse(_latestCycle!.startDate) : null;

  int get _cycleLength => _latestCycle?.cycleLength ?? 28;
  int get _periodLength => _latestCycle?.periodLength ?? 5;

  void _openScheduleModal({String? presetDate}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ScheduleModal(
        selectedDateStr: presetDate ?? _selectedDateStr,
        treatmentMode: _treatmentMode,
        isPremium: _isPremium,
        existingScheduleCount: _schedules.length,
        onPaywall: (source) {
          Navigator.of(context).pop();
          showPaywallModal(context, source: source);
        },
        onSaved: (suggestion) async {
          Navigator.of(context).pop();
          await _refreshSchedules();
          final schedulesForAlerts = _isPremium
              ? _schedules
              : _schedules
                    .map(
                      (s) => TreatmentSchedule(
                        id: s.id,
                        userId: s.userId,
                        type: s.type,
                        title: s.title,
                        scheduledAt: s.scheduledAt,
                        status: s.status,
                        hospitalName: s.hospitalName,
                        notes: s.notes,
                      ),
                    )
                    .toList();
          LocalNotifications.instance.rescheduleMedicationAlerts(
            schedulesForAlerts,
          );
          if (suggestion != null && mounted) {
            setState(() => _stageSuggestion = suggestion);
          }
        },
        onSubsidyEligible: (schedule) {
          if (!mounted) return;
          setState(() => _subsidyEligibleSchedule = schedule);
          if (_isPremium) {
            LocalNotifications.instance.rescheduleSubsidyAlerts([
              ..._schedules,
              schedule,
            ]);
          }
        },
      ),
    );
  }

  void _openDayDetailModal(DateTime date) {
    setState(() => _selectedDate = date);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DayDetailModal(
        selectedDateStr: toLocalDateStr(date),
        treatmentMode: _treatmentMode,
        isPremium: _isPremium,
        cycles: _cycles,
        schedules: _schedules,
        hormones: _hormones,
        cycleLength: _cycleLength,
        periodLength: _periodLength,
        onPeriodSaved: () async {
          await _refreshCycles();
        },
        onOpenScheduleModal: () {
          Navigator.of(context).pop();
          _openScheduleModal(presetDate: toLocalDateStr(date));
        },
        onGoRecords: () {
          Navigator.of(context).pop();
          context.push('/records');
        },
        onPaywall: (source) {
          Navigator.of(context).pop();
          showPaywallModal(context, source: source);
        },
        onNoteSaved: _refreshDailyNotes,
      ),
    );
  }

  UserProfile? get _profile => ref.watch(profileControllerProvider);
  bool get _isPremium => _profile != null ? isPremiumProfile(_profile!) : false;
  TreatmentMode get _treatmentMode => _profile?.treatmentStage ?? 'natural';
  CurrentStage get _currentStage => _profile?.currentStage;

  @override
  Widget build(BuildContext context) {
    ref.listen<String?>(pendingCalendarOpenDateProvider, (previous, next) {
      if (next == null) return;
      final date = DateTime.tryParse(next);
      ref.read(pendingCalendarOpenDateProvider.notifier).state = null;
      if (date == null) return;
      setState(() => _viewDate = DateTime(date.year, date.month, 1));
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _openDayDetailModal(date);
      });
    });

    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    final calendarData = buildCycleCalendarData(
      viewDate: _viewDate,
      lastPeriodStart: _lastPeriod,
      cycleLength: _cycleLength,
      periodLength: _periodLength,
      allCycles: _sortedCycles
          .map(
            (c) => HistoricalCycle(
              startDate: c.startDate,
              endDate: c.endDate,
              cycleLength: c.cycleLength,
              periodLength: c.periodLength,
            ),
          )
          .toList(),
    );

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final stageStartedAt = _profile?.stageStartedAt;
    final stageDay = stageStartedAt != null
        ? (today.difference(DateTime.tryParse(stageStartedAt) ?? today).inDays +
                  1)
              .clamp(1, 999999)
        : null;

    final upcoming =
        _schedules
            .where(
              (s) =>
                  s.scheduledAt.compareTo(_todayStr) >= 0 &&
                  s.status != 'cancelled',
            )
            .toList()
          ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    final upcomingSchedule = upcoming.isNotEmpty ? upcoming.first : null;

    final showNaturalCta = _treatmentMode == 'natural' && _cycles.isEmpty;
    final showClinicCta = _treatmentMode != 'natural' && _schedules.isEmpty;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            ListView(
              padding: const EdgeInsets.symmetric(vertical: 12),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            onPressed: () => setState(
                              () => _viewDate = DateTime(
                                _viewDate.year,
                                _viewDate.month - 1,
                                1,
                              ),
                            ),
                            icon: const Icon(
                              Icons.chevron_left,
                              color: AppColors.textDark,
                            ),
                          ),
                          Text(
                            '${_viewDate.year}년 ${_viewDate.month}월',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textDark,
                            ),
                          ),
                          IconButton(
                            onPressed: () => setState(
                              () => _viewDate = DateTime(
                                _viewDate.year,
                                _viewDate.month + 1,
                                1,
                              ),
                            ),
                            icon: const Icon(
                              Icons.chevron_right,
                              color: AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          _headerBtn(
                            Icons.edit_note_rounded,
                            '기록하기',
                            () => context.push('/records'),
                          ),
                          const SizedBox(width: 8),
                          _headerBtn(
                            Icons.add_rounded,
                            '일정 추가',
                            () => _openScheduleModal(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: _weekdays.asMap().entries.map((e) {
                          final color = e.key == 0
                              ? const Color(0xFFC57670)
                              : (e.key == 6
                                    ? const Color(0xFF4C759F)
                                    : AppColors.textMuted);
                          return Expanded(
                            child: Center(
                              child: Text(
                                e.value,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: color,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final cellWidth = (constraints.maxWidth - 28) / 7;
                          return Wrap(
                            children: calendarData.calendarDays.map((day) {
                              final dateStr = toLocalDateStr(day.date);
                              HormoneRecord? dayHormone;
                              for (final h in _hormones) {
                                if (h.recordedAt == dateStr ||
                                    h.recordedAt.split('T')[0] == dateStr) {
                                  dayHormone = h;
                                  break;
                                }
                              }
                              final daySchedules = _schedules
                                  .where(
                                    (s) =>
                                        s.scheduledAt.split('T')[0] == dateStr,
                                  )
                                  .toList();
                              final hasNote = _dailyNotes.any(
                                (n) =>
                                    n.date == dateStr &&
                                    (n.memo.isNotEmpty ||
                                        n.condition != null),
                              );
                              final markers = <DayMarker>[
                                ...daySchedules.map((s) {
                                  final style = getScheduleMarkerStyle(s.type);
                                  return DayMarker(
                                    color: colorFromHex(style.color),
                                    icon: style.icon,
                                  );
                                }),
                                if (dayHormone?.injectionDrug != null ||
                                    dayHormone?.injectionDose != null)
                                  const DayMarker(color: Color(0xFF4C759F)),
                                if (hasNote)
                                  const DayMarker(
                                    color: AppColors.accentPurpleLight,
                                  ),
                              ];
                              return DayCell(
                                day: day,
                                cellWidth: cellWidth,
                                isSelected:
                                    _selectedDate != null &&
                                    _selectedDate!.isAtSameMomentAs(day.date),
                                hasIntercourse: dayHormone?.intercourse == true,
                                markers: markers.isNotEmpty ? markers : null,
                                onTap: _openDayDetailModal,
                              );
                            }).toList(),
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 28,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: getLegend(_treatmentMode)
                              .map(
                                (l) => Padding(
                                  padding: const EdgeInsets.only(right: 14),
                                  child: Row(
                                    children: [
                                      l.icon != null
                                          ? Icon(
                                              l.icon!,
                                              size: 12,
                                              color: l.color,
                                            )
                                          : Container(
                                              width: 8,
                                              height: 8,
                                              decoration: BoxDecoration(
                                                color: l.color,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                      const SizedBox(width: 4),
                                      Text(
                                        l.label,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                      const SizedBox(height: 8),
                      CycleSummaryCard(
                        nextOvulationDate: calendarData.nextOvulationDate,
                        nextPeriodDate: calendarData.nextPeriodDate,
                        currentCycleDay: calendarData.currentCycleDay,
                        cycleLength: _cycleLength,
                        mode: _treatmentMode,
                        currentStage: _currentStage,
                        stageDay: stageDay,
                        upcomingScheduleTitle: upcomingSchedule?.title,
                        upcomingScheduleAt: upcomingSchedule?.scheduledAt,
                      ),
                      if (showNaturalCta)
                        _ctaBox(
                          icon: Icons.water_drop_rounded,
                          title: '생리 시작일을 기록해보세요',
                          sub: '첫 생리 시작일을 기록하면\n가임기·배란일 예측을 시작해드려요.',
                          ctaText: '+ 첫 생리 시작일 기록하기',
                          onCta: () => _openScheduleModal(),
                        ),
                      if (showClinicCta)
                        _ctaBox(
                          icon: _treatmentMode == 'iui'
                              ? Icons.vaccines_rounded
                              : Icons.biotech_rounded,
                          title: '오늘 시술 일정을 등록해보세요',
                          sub: _treatmentMode == 'iui'
                              ? '초음파, 채혈, 주사 일정을 기록하면 치료 흐름을 한눈에 볼 수 있어요.'
                              : '난포 모니터링, 이식, 채취 일정을 기록해요.',
                          ctaText: '+ 오늘 일정 등록하기',
                          onCta: () =>
                              _openScheduleModal(presetDate: _todayStr),
                          linkText: '생리 시작일도 기록하기 →',
                          onLink: () => _openDayDetailModal(today),
                        ),
                      const SizedBox(height: 8),
                      const Text(
                        '날짜를 탭하면 기록을 확인하거나 추가할 수 있어요',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textMutedLight,
                        ),
                      ),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
              ],
            ),
            if (_subsidyEligibleSchedule != null)
              Positioned(
                top: 8,
                left: 16,
                right: 16,
                child: SubsidyInlineBanner(
                  showRange: _subsidyEligibleSchedule!.type == 'IVF' ||
                      _subsidyEligibleSchedule!.type == 'FET',
                  onConfirm: () {
                    final schedule = _subsidyEligibleSchedule!;
                    setState(() => _subsidyEligibleSchedule = null);
                    final query = schedule.type == 'IUI'
                        ? '?procedure=iui'
                        : '';
                    context.push('/subsidy-calculator$query');
                  },
                  onDismiss: () =>
                      setState(() => _subsidyEligibleSchedule = null),
                ),
              ),
            if (_stageSuggestion != null) _stageSuggestionSheet(),
          ],
        ),
      ),
    );
  }

  Widget _headerBtn(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: AppColors.textDark),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _ctaBox({
    required IconData icon,
    required String title,
    required String sub,
    required String ctaText,
    required VoidCallback onCta,
    String? linkText,
    VoidCallback? onLink,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primaryLight),
      ),
      child: Column(
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            sub,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: onCta, child: Text(ctaText)),
          if (linkText != null) ...[
            const SizedBox(height: 8),
            TextButton(
              onPressed: onLink,
              child: Text(
                linkText,
                style: const TextStyle(color: AppColors.primary, fontSize: 12),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _stageSuggestionSheet() {
    final suggestion = _stageSuggestion!;
    return Positioned.fill(
      child: Container(
        color: Colors.black.withValues(alpha: 0.4),
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '단계 이동 제안',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textDark,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  suggestion.message,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textMuted,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          backgroundColor: AppColors.surface,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: BorderSide.none,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: () =>
                            setState(() => _stageSuggestion = null),
                        child: const Text(
                          '나중에',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: () async {
                          final profile = ref.read(profileControllerProvider);
                          if (profile != null) {
                            ref
                                .read(profileControllerProvider.notifier)
                                .setCurrentStage(
                                  suggestion.nextStage,
                                  startedAt: toLocalDateStr(DateTime.now()),
                                );
                            await ref
                                .read(profileControllerProvider.notifier)
                                .saveProfile(
                                  ref.read(profileControllerProvider)!,
                                );
                          }
                          setState(() => _stageSuggestion = null);
                        },
                        child: Text(
                          '${suggestion.label}(으)로 이동',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
