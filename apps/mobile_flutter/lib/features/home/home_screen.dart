import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/domain/clinic_gate.dart';
import '../../core/domain/home_data.dart';
import '../../core/models/models.dart';
import '../../core/models/subsidy.dart';
import '../../core/push/local_notifications.dart';
import '../../core/purchases/purchases_service.dart';
import '../../core/theme/app_theme.dart';
import '../../state/auth_controller.dart';
import '../../state/profile_controller.dart';
import '../../state/providers.dart';
import '../../widgets/event_banner_slider.dart';
import '../subsidy/widgets/subsidy_hero_card.dart';
import 'hero_card.dart';

const List<BoxShadow> _bentoCardShadow = [
  BoxShadow(color: Color(0x0D000000), blurRadius: 4, offset: Offset(0, 1)),
];

/// Port of apps/mobile/app/(tabs)/index.tsx.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  List<MenstrualCycle> _cycles = [];
  List<HormoneRecord> _hormones = [];
  List<TreatmentSchedule> _schedules = [];
  List<DailyNote> _dailyNotes = [];
  CoupleStatusResponse? _coupleStatus;
  UserSubsidyProfile? _subsidyProfile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    try {
      await ref.read(profileControllerProvider.notifier).syncProfile();
      final results = await Future.wait([
        ref.read(cyclesApiProvider).getAll(),
        ref.read(hormonesApiProvider).getAll(),
        ref.read(treatmentApiProvider).getAll(),
        ref.read(dailyNotesApiProvider).getAll(),
      ]);
      final couple = await ref.read(couplesApiProvider).me().catchNull();
      final subsidyProfile = await ref
          .read(subsidyApiProvider)
          .getProfile()
          .catchNull();
      if (!mounted) return;
      setState(() {
        _cycles = results[0] as List<MenstrualCycle>;
        _hormones = results[1] as List<HormoneRecord>;
        _schedules = results[2] as List<TreatmentSchedule>;
        _dailyNotes = results[3] as List<DailyNote>;
        _coupleStatus = couple;
        _subsidyProfile = subsidyProfile;
        _loading = false;
      });

      final uid = ref.read(authControllerProvider).uid;
      if (uid != null) {
        PurchasesService.instance.identifyUser(uid).catchError((_) {});
      }
      final currentProfile = ref.read(profileControllerProvider);
      final isPremium =
          currentProfile != null && isPremiumProfile(currentProfile);
      LocalNotifications.instance
          .initNotifications(_schedules, isPremium: isPremium)
          .catchError((_) {});
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refreshCoupleStatus() async {
    final couple = await ref.read(couplesApiProvider).me().catchNull();
    if (mounted) setState(() => _coupleStatus = couple);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    final profile = ref.watch(profileControllerProvider);
    final treatmentMode = profile?.treatmentStage ?? 'natural';
    final currentStage = profile?.currentStage;

    final home = buildHomeData(
      treatmentMode: treatmentMode,
      currentStage: currentStage,
      cycles: _cycles,
      hormones: _hormones,
      schedules: _schedules,
      diaries: _dailyNotes,
    );

    final now = DateTime.now();
    final todayStr =
        '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    DailyNote? todayNote;
    for (final d in _dailyNotes) {
      if (d.date == todayStr) {
        todayNote = d;
        break;
      }
    }

    final hasCycleData = _cycles.isNotEmpty;

    final upcoming =
        _schedules
            .where(
              (s) =>
                  s.scheduledAt.split('T')[0].compareTo(todayStr) >= 0 &&
                  s.status != 'cancelled',
            )
            .toList()
          ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    final upcomingSchedules = upcoming.take(3).toList();

    final quickActions = getQuickActions(treatmentMode, currentStage);
    final quickA = quickActions[0];
    final quickB = quickActions[1];

    HormoneRecord? todayHormone;
    for (final h in _hormones) {
      if (h.recordedAt.split('T')[0] == todayStr) {
        todayHormone = h;
        break;
      }
    }
    final quickAValue =
        (treatmentMode == 'natural' &&
            quickA.icon == Icons.thermostat_rounded &&
            todayHormone?.bbt != null)
        ? '${todayHormone!.bbt}°C'
        : null;
    final quickBValue =
        (treatmentMode == 'natural' &&
            quickB.icon == Icons.egg_rounded &&
            todayHormone?.opkIndex != null)
        ? 'OPK ${todayHormone!.opkIndex}/10'
        : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            RefreshIndicator(
              onRefresh: _loadAll,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.local_florist_rounded,
                                  size: 18,
                                  color: AppColors.primary,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    '봄  |  ${profile?.name ?? '테스터'}님, 안녕하세요',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textDark,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              '오늘도 따뜻하게 함께할게요',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push('/settings'),
                        icon: const Icon(
                          Icons.settings_rounded,
                          size: 20,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const EventBannerSlider(position: 'home', height: 115),
                  _CoupleBadge(
                    status: _coupleStatus,
                    onReturn: _refreshCoupleStatus,
                  ),
                  Builder(
                    builder: (context) {
                      final isPremium =
                          profile != null && isPremiumProfile(profile);
                      final subsidyCard = SubsidyHeroCard(
                        profile: _subsidyProfile,
                        schedules: _schedules,
                        isPremium: isPremium,
                        onTap: () => context.push('/subsidy-calculator'),
                      );
                      final urgent = isSubsidyDeadlineUrgent(
                        _subsidyProfile,
                        _schedules,
                        isPremium,
                      );
                      final heroCard = HeroCard(
                        treatmentMode: treatmentMode,
                        currentStage: currentStage,
                        phase: home.todayCycleInfo?.phase ?? 'follicular',
                        cycleDay: home.currentCycleDay,
                        tip: home.todayTip,
                        dDay: home.ovulationDDay,
                        periodDDay: home.periodDDay,
                        isFertileWindow: home.isFertileWindow,
                        hasCycleData: hasCycleData,
                        upcomingSchedules: upcomingSchedules,
                      );

                      final taskSection =
                          (treatmentMode != 'natural' && currentStage == null)
                          ? _TaskRow(
                              icon: Icons.calendar_month_rounded,
                              title: '치료 단계를 설정하면 맞춤 할 일이 나와요',
                              subtitle: '지금 설정하러 가기 →',
                              done: false,
                              colorKey: 'indigo',
                              onTap: () => context.push('/settings'),
                            )
                          : Column(
                              children: home.todayTasks
                                  .map(
                                    (task) => Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 8,
                                      ),
                                      child: _TaskRow(
                                        icon: task.icon,
                                        title: task.title,
                                        subtitle: task.subtitle,
                                        done: task.done,
                                        colorKey: task.colorKey,
                                        onTap: task.route != null
                                            ? () => context.push(task.route!)
                                            : null,
                                      ),
                                    ),
                                  )
                                  .toList(),
                            );

                      return Column(
                        children: [
                          if (urgent) ...[
                            subsidyCard,
                            const SizedBox(height: 10),
                          ],
                          heroCard,
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: _QuickCard(
                                  icon: quickA.icon,
                                  label: quickA.label,
                                  value: quickAValue,
                                  onTap: () => context.push(quickA.route),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _QuickCard(
                                  icon: quickB.icon,
                                  label: quickB.label,
                                  value: quickBValue,
                                  onTap: () => context.push(quickB.route),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          taskSection,
                          const SizedBox(height: 10),
                          _MindCard(
                            note: todayNote,
                            onTap: () {
                              ref
                                  .read(
                                    pendingCalendarOpenDateProvider.notifier,
                                  )
                                  .state = todayStr;
                              context.go('/calendar');
                            },
                          ),
                          if (!urgent) ...[
                            const SizedBox(height: 16),
                            subsidyCard,
                          ],
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(
                            Icons.trending_up_rounded,
                            size: 16,
                            color: AppColors.primary,
                          ),
                          SizedBox(width: 6),
                          Text(
                            '이번 주 기록',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                      TextButton(
                        onPressed: () => context.push('/records'),
                        child: const Text(
                          '전체 보기 ›',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  _StreakCard(
                    weekDays: home.weekStreak,
                    streakCount: home.streakCount,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CoupleBadge extends StatelessWidget {
  const _CoupleBadge({required this.status, required this.onReturn});
  final CoupleStatusResponse? status;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    final linked = status?.linked ?? false;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          await context.push('/couple');
          onReturn();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: _bentoCardShadow,
          ),
          child: Row(
            children: [
              const Icon(
                Icons.favorite_rounded,
                size: 14,
                color: AppColors.primary,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  linked
                      ? '${status?.partnerName ?? '배우자'}님과 연결됨'
                      : '배우자 초대하기 (함께 일정·기록 공유)',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: linked ? FontWeight.w600 : FontWeight.w500,
                    color: linked
                        ? AppColors.textDark
                        : const Color(0xFF443734),
                  ),
                ),
              ),
              if (linked)
                const Text(
                  '›',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: const Text(
                    '초대하기',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF3C2828),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickCard extends StatelessWidget {
  const _QuickCard({
    required this.icon,
    required this.label,
    this.value,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final String? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: _bentoCardShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 22, color: AppColors.primary),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value ?? '기록하기 →',
              style: TextStyle(
                fontSize: value != null ? 16 : 11,
                fontWeight: value != null ? FontWeight.w700 : FontWeight.w400,
                color: value != null ? AppColors.textDark : AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.done,
    required this.colorKey,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool done;
  final String colorKey;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final Color iconBg;
    final Color iconFg;
    switch (colorKey) {
      case 'pink':
        iconBg = AppColors.surface;
        iconFg = AppColors.primary;
        break;
      case 'green':
        iconBg = AppColors.accentGreenLight;
        iconFg = AppColors.accentGreen;
        break;
      default:
        iconBg = AppColors.surfaceAlt;
        iconFg = AppColors.accentIndigo;
    }
    final dotBg = done ? AppColors.textMutedLight : iconFg;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: _bentoCardShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: Icon(icon, size: 18, color: iconFg),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: done ? AppColors.textMuted : AppColors.textDark,
                      decoration: done ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: dotBg, shape: BoxShape.circle),
            ),
          ],
        ),
      ),
    );
  }
}

class _MindCard extends StatelessWidget {
  const _MindCard({required this.note, required this.onTap});
  final DailyNote? note;
  final VoidCallback onTap;

  // Prototype text colors on the lavender card
  // (oklch(0.35 0.05 290) / oklch(0.4 0.04 290)).
  static const _title = Color(0xFF3A3653);
  static const _body = Color(0xFF47445C);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Row(
                  children: [
                    Icon(Icons.edit_note_rounded, size: 16, color: _title),
                    SizedBox(width: 6),
                    Text(
                      '오늘의 마음',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: _title,
                      ),
                    ),
                  ],
                ),
                Text(
                  '기록하러 가기 →',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _title,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  (note?.memo.isNotEmpty ?? false)
                      ? Icons.sentiment_satisfied_alt_rounded
                      : Icons.chat_bubble_outline_rounded,
                  size: 26,
                  color: _title,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: (note?.memo.isNotEmpty ?? false)
                      ? Text(
                          note!.memo,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            color: _body,
                            height: 1.4,
                          ),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              '오늘 기분을 기록해봐요',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: _title,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              '신체 수치 · 감정 · 메모를 한 곳에',
                              style: TextStyle(fontSize: 11.5, color: _body),
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  const _StreakCard({required this.weekDays, required this.streakCount});
  final List<WeekDay> weekDays;
  final int streakCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: _bentoCardShadow,
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: weekDays.map((day) {
              return Column(
                children: [
                  Text(
                    day.label,
                    style: TextStyle(
                      fontSize: 11,
                      color: day.isToday
                          ? AppColors.primary
                          : AppColors.textMuted,
                      fontWeight: day.isToday
                          ? FontWeight.w700
                          : FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: day.recorded
                          ? (day.isToday
                                ? AppColors.primaryLight
                                : AppColors.primary)
                          : AppColors.surface,
                      border: !day.recorded
                          ? Border.all(
                              color: day.isToday
                                  ? AppColors.primary
                                  : AppColors.primaryLight,
                              width: day.isToday ? 1.5 : 0.5,
                            )
                          : null,
                    ),
                    alignment: Alignment.center,
                    child: day.recorded
                        ? Icon(
                            day.recordIcon ?? Icons.check_rounded,
                            size: day.recordIcon != null ? 15 : 13,
                            color: day.recordIcon != null
                                ? Colors.white
                                : (day.isToday
                                      ? AppColors.primary
                                      : Colors.white),
                          )
                        : null,
                  ),
                ],
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          Text(
            streakCount > 0
                ? '$streakCount일 연속 기록 중이에요 🔥'
                : '오늘부터 기록을 시작해봐요 ✨',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}


extension _CatchNull<T> on Future<T> {
  Future<T?> catchNull() async {
    try {
      return await this;
    } catch (_) {
      return null;
    }
  }
}
