import 'package:flutter/material.dart';

import '../models/cycle.dart';
import '../models/daily_note.dart';
import '../models/enums.dart';
import '../models/hormone_record.dart';
import '../models/treatment.dart';
import 'cycle.dart';

/// Port of packages/shared/hooks/useHomeData.ts.
class HomeTask {
  const HomeTask({
    required this.id,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.colorKey, // 'pink' | 'indigo'
    required this.done,
    this.route,
  });

  final String id;
  final IconData icon;
  final String title;
  final String subtitle;
  final String colorKey;
  final bool done;
  final String? route;
}

class QuickAction {
  const QuickAction({
    required this.icon,
    required this.label,
    required this.route,
    this.value,
  });
  final IconData icon;
  final String label;
  final String route;
  final String? value;
}

class WeekDay {
  const WeekDay({
    required this.label,
    required this.isToday,
    required this.recorded,
    this.recordIcon,
  });
  final String label;
  final bool isToday;
  final bool recorded;
  final IconData? recordIcon;
}

class HomeData {
  const HomeData({
    required this.todayCycleInfo,
    required this.currentCycleDay,
    required this.nextOvulationDate,
    required this.nextPeriodDate,
    required this.ovulationDDay,
    required this.periodDDay,
    required this.todayPhaseLabel,
    required this.todayTip,
    required this.isFertileWindow,
    required this.todayTasks,
    required this.weekStreak,
    required this.streakCount,
  });

  final CycleDay? todayCycleInfo;
  final int currentCycleDay;
  final DateTime nextOvulationDate;
  final DateTime nextPeriodDate;
  final String ovulationDDay;
  final String periodDDay;
  final String todayPhaseLabel;
  final String todayTip;
  final bool isFertileWindow;
  final List<HomeTask> todayTasks;
  final List<WeekDay> weekStreak;
  final int streakCount;
}

const Map<String, String> _phaseLabel = {
  'menstrual': '생리 중',
  'follicular': '난포기',
  'ovulation': '배란기',
  'luteal': '황체기',
};

const Map<String, String> _phaseTip = {
  'menstrual': '몸을 따뜻하게 하고 충분히 쉬어요. 무리하지 마세요.',
  'follicular': '자궁 내막이 자라는 시기예요. 균형 잡힌 영양을 챙겨요.',
  'ovulation': '지금은 가임기예요. 배란 테스트기를 체크하고 기초체온을 기록해보세요.',
  'luteal': '착상을 돕는 황체호르몬이 분비돼요. 편안한 마음을 유지해요.',
};

const Map<String, String> _iuiStageTip = {
  'stimulation': '몸을 따뜻하게 하고 충분히 쉬어요 💛',
  'monitoring': '배란 신호를 놓치지 마세요 🥚',
  'procedure': '오늘 시술 당일이에요. 긴장하지 마세요 💪',
  'luteal': '착상을 기다리는 소중한 시간이에요 🙏',
  'result': '오늘 판정일이에요. 어떤 결과든 함께할게요 🌸',
};

const Map<String, String> _ivfStageTip = {
  'stimulation': '약 잘 챙기고 무리하지 마세요 💛',
  'monitoring': '난포가 잘 자라고 있어요. 수분 충분히 드세요 💧',
  'retrieval': '채취 당일이에요. 공복 꼭 지켜주세요 ⚠️',
  'culture': '배아들이 열심히 자라는 중이에요 🌱',
  'transfer': '이식 당일이에요. 긴장 풀고 편안하게 💆',
  'luteal': '착상을 기다리는 소중한 2주예요 🙏',
  'result': '판정일이에요. 어떤 결과든 혼자가 아니에요 🌸',
};

const List<String> iuiStageOrder = [
  'stimulation',
  'monitoring',
  'procedure',
  'luteal',
  'result',
];
const List<String> ivfStageOrder = [
  'stimulation',
  'monitoring',
  'retrieval',
  'culture',
  'transfer',
  'luteal',
  'result',
];

class StageProgress {
  const StageProgress({required this.index, required this.total});
  final int index;
  final int total;
}

StageProgress getStageProgress(TreatmentMode mode, CurrentStage stage) {
  final order = mode == 'iui' ? iuiStageOrder : ivfStageOrder;
  final i = stage != null ? order.indexOf(stage) : -1;
  return StageProgress(index: i >= 0 ? i : 0, total: order.length);
}

List<QuickAction> getQuickActions(TreatmentMode mode, CurrentStage stage) {
  if (mode == 'natural' || stage == null) {
    return const [
      QuickAction(icon: Icons.thermostat_rounded, label: '기초체온 기록', route: '/records'),
      QuickAction(icon: Icons.egg_rounded, label: '배란테스트기 기록', route: '/records'),
    ];
  }
  if (mode == 'iui') {
    const map = {
      'stimulation': [
        QuickAction(icon: Icons.thermostat_rounded, label: '기초체온 기록', route: '/records'),
        QuickAction(icon: Icons.vaccines_rounded, label: '주사 기록하기', route: '/records'),
      ],
      'monitoring': [
        QuickAction(icon: Icons.thermostat_rounded, label: '기초체온 기록', route: '/records'),
        QuickAction(icon: Icons.egg_rounded, label: '배란테스트기 기록', route: '/records'),
      ],
      'procedure': [
        QuickAction(icon: Icons.local_hospital_rounded, label: '오늘 시술 기록', route: '/records'),
        QuickAction(icon: Icons.edit_note_rounded, label: '증상 기록', route: '/records'),
      ],
      'luteal': [
        QuickAction(icon: Icons.edit_note_rounded, label: '증상 기록', route: '/records'),
        QuickAction(icon: Icons.medication_rounded, label: '약물 체크', route: '/records'),
      ],
      'result': [
        QuickAction(icon: Icons.medical_information_rounded, label: 'hCG 수치 기록', route: '/records'),
        QuickAction(icon: Icons.sticky_note_2_rounded, label: '메모 남기기', route: '/records'),
      ],
    };
    return map[stage] ?? map['stimulation']!;
  }
  const map = {
    'stimulation': [
      QuickAction(icon: Icons.thermostat_rounded, label: '기초체온 기록', route: '/records'),
      QuickAction(icon: Icons.vaccines_rounded, label: '주사 기록하기', route: '/records'),
    ],
    'monitoring': [
      QuickAction(icon: Icons.bar_chart_rounded, label: '수치 기록 (E2·난포)', route: '/records'),
      QuickAction(icon: Icons.thermostat_rounded, label: '기초체온 기록', route: '/records'),
    ],
    'retrieval': [
      QuickAction(icon: Icons.assignment_rounded, label: '채취 결과 기록', route: '/records'),
      QuickAction(icon: Icons.edit_note_rounded, label: '컨디션 기록', route: '/records'),
    ],
    'culture': [
      QuickAction(icon: Icons.biotech_rounded, label: '배아 상태 기록', route: '/records'),
      QuickAction(icon: Icons.sticky_note_2_rounded, label: '메모 남기기', route: '/records'),
    ],
    'transfer': [
      QuickAction(icon: Icons.local_hospital_rounded, label: '이식 결과 기록', route: '/records'),
      QuickAction(icon: Icons.edit_note_rounded, label: '증상 기록', route: '/records'),
    ],
    'luteal': [
      QuickAction(icon: Icons.edit_note_rounded, label: '증상 기록', route: '/records'),
      QuickAction(icon: Icons.medication_rounded, label: '약물 체크', route: '/records'),
    ],
    'result': [
      QuickAction(icon: Icons.medical_information_rounded, label: 'hCG 수치 기록', route: '/records'),
      QuickAction(icon: Icons.sticky_note_2_rounded, label: '다음 계획 메모', route: '/records'),
    ],
  };
  return map[stage] ?? map['stimulation']!;
}

List<HomeTask> _getDefaultTasks(
  TreatmentMode mode,
  CurrentStage stage,
  HormoneRecord? todayHormone,
) {
  final bbt = HomeTask(
    id: 'bbt',
    icon: Icons.thermostat_rounded,
    title: '기초체온 기록',
    subtitle: todayHormone?.bbt != null
        ? '${todayHormone!.bbt}°C 기록됨'
        : '아직 기록 전',
    colorKey: 'pink',
    done: todayHormone?.bbt != null,
    route: '/records',
  );
  final opk = HomeTask(
    id: 'opk',
    icon: Icons.egg_rounded,
    title: '배란테스트기 기록',
    subtitle: todayHormone?.opkIndex != null
        ? 'OPK ${todayHormone!.opkIndex}/10'
        : '아직 기록 전',
    colorKey: 'indigo',
    done: todayHormone?.opkIndex != null,
    route: '/records',
  );

  if (mode == 'natural') {
    return [
      bbt,
      const HomeTask(
        id: 'folic',
        icon: Icons.medication_rounded,
        title: '엽산 챙기기',
        subtitle: '매일 꾸준히 복용해요',
        colorKey: 'indigo',
        done: false,
        route: '/records',
      ),
    ];
  }

  final iuiDefaults = <String, List<HomeTask>>{
    'stimulation': [
      const HomeTask(
        id: 'injection',
        icon: Icons.vaccines_rounded,
        title: '주사 맞기 확인',
        subtitle: '처방된 시간에 맞춰요',
        colorKey: 'pink',
        done: false,
        route: '/records',
      ),
      bbt,
    ],
    'monitoring': [opk, bbt],
    'procedure': const [
      HomeTask(
        id: 'clinic',
        icon: Icons.local_hospital_rounded,
        title: '시술 당일 — 병원 방문',
        subtitle: '예약 시간 확인하세요',
        colorKey: 'indigo',
        done: false,
      ),
      HomeTask(
        id: 'fasting',
        icon: Icons.warning_amber_rounded,
        title: '공복 여부 확인',
        subtitle: '시술 전 금식 여부 확인',
        colorKey: 'pink',
        done: false,
      ),
    ],
    'luteal': const [
      HomeTask(
        id: 'prog',
        icon: Icons.medication_rounded,
        title: '황체 보강제 복용 체크',
        subtitle: '처방대로 꾸준히',
        colorKey: 'pink',
        done: false,
        route: '/records',
      ),
      HomeTask(
        id: 'sym',
        icon: Icons.edit_note_rounded,
        title: '오늘 증상 기록',
        subtitle: '복통, 부기 등',
        colorKey: 'indigo',
        done: false,
        route: '/records',
      ),
    ],
    'result': const [
      HomeTask(
        id: 'hcg',
        icon: Icons.medical_information_rounded,
        title: 'β-hCG 채혈 결과 기록',
        subtitle: '오늘의 수치를 기록해요',
        colorKey: 'pink',
        done: false,
        route: '/records',
      ),
    ],
  };
  final ivfDefaults = <String, List<HomeTask>>{
    'stimulation': [
      const HomeTask(
        id: 'injection',
        icon: Icons.vaccines_rounded,
        title: '주사 맞기 확인',
        subtitle: '처방된 시간에 맞춰요',
        colorKey: 'pink',
        done: false,
        route: '/records',
      ),
      bbt,
    ],
    'monitoring': const [
      HomeTask(
        id: 'clinic',
        icon: Icons.local_hospital_rounded,
        title: '초음파·채혈 일정',
        subtitle: '오늘 검사가 있는지 확인',
        colorKey: 'indigo',
        done: false,
      ),
      HomeTask(
        id: 'hormone',
        icon: Icons.bar_chart_rounded,
        title: '수치 기록',
        subtitle: 'E2·난포 크기 기록',
        colorKey: 'pink',
        done: false,
        route: '/records',
      ),
    ],
    'retrieval': const [
      HomeTask(
        id: 'ret_clinic',
        icon: Icons.local_hospital_rounded,
        title: '채취 당일',
        subtitle: '병원 방문 준비',
        colorKey: 'indigo',
        done: false,
      ),
      HomeTask(
        id: 'fasting',
        icon: Icons.warning_amber_rounded,
        title: '공복 필수',
        subtitle: '마취 전 금식 지켜요',
        colorKey: 'pink',
        done: false,
      ),
    ],
    'culture': const [
      HomeTask(
        id: 'status',
        icon: Icons.call_rounded,
        title: '배아 상태 확인',
        subtitle: '병원 연락 여부 확인',
        colorKey: 'indigo',
        done: false,
      ),
      HomeTask(
        id: 'record',
        icon: Icons.edit_note_rounded,
        title: '수정 결과 기록',
        subtitle: '수정란 개수·상태',
        colorKey: 'pink',
        done: false,
        route: '/records',
      ),
    ],
    'transfer': const [
      HomeTask(
        id: 'tr_clinic',
        icon: Icons.local_hospital_rounded,
        title: '이식 당일',
        subtitle: '병원 방문 준비',
        colorKey: 'indigo',
        done: false,
      ),
      HomeTask(
        id: 'rest',
        icon: Icons.medication_rounded,
        title: '이식 후 안정',
        subtitle: '안정을 취해요',
        colorKey: 'pink',
        done: false,
      ),
    ],
    'luteal': const [
      HomeTask(
        id: 'prog',
        icon: Icons.medication_rounded,
        title: '황체 보강제 복용',
        subtitle: '처방대로 꾸준히',
        colorKey: 'pink',
        done: false,
        route: '/records',
      ),
      HomeTask(
        id: 'sym',
        icon: Icons.edit_note_rounded,
        title: '증상 기록',
        subtitle: '착상 증상 체크',
        colorKey: 'indigo',
        done: false,
        route: '/records',
      ),
      HomeTask(
        id: 'no_lift',
        icon: Icons.block_rounded,
        title: '무리 금지',
        subtitle: '무거운 것 들지 않기',
        colorKey: 'pink',
        done: false,
      ),
    ],
    'result': const [
      HomeTask(
        id: 'hcg',
        icon: Icons.medical_information_rounded,
        title: 'β-hCG 수치 기록',
        subtitle: '오늘의 수치를 기록해요',
        colorKey: 'pink',
        done: false,
        route: '/records',
      ),
      HomeTask(
        id: 'chat',
        icon: Icons.chat_bubble_rounded,
        title: '봄이에게 이야기하기',
        subtitle: 'AI 채팅으로 마음 나눠요',
        colorKey: 'indigo',
        done: false,
        route: '/chat',
      ),
    ],
  };

  final map = mode == 'iui' ? iuiDefaults : ivfDefaults;
  return map[stage ?? ''] ?? [bbt];
}

List<HomeTask> getTodayTasksByMode(
  TreatmentMode mode,
  CurrentStage stage,
  List<TreatmentSchedule> schedules,
  List<HormoneRecord> hormones,
  String todayStr,
) {
  final tasks = <HomeTask>[];
  final todaySchedules = schedules
      .where((s) => s.scheduledAt.split('T')[0] == todayStr)
      .toList();
  HormoneRecord? todayHormone;
  for (final h in hormones) {
    if (h.recordedAt.split('T')[0] == todayStr) {
      todayHormone = h;
      break;
    }
  }

  var i = 0;
  for (final s in todaySchedules.where(
    (s) => s.medications == null || s.medications!.isEmpty,
  )) {
    final time = s.scheduledAt.contains('T')
        ? _formatTime(DateTime.tryParse(s.scheduledAt))
        : '';
    tasks.add(
      HomeTask(
        id: 'sched_$i',
        icon: Icons.local_hospital_rounded,
        title: s.title,
        subtitle: [
          s.hospitalName,
          time,
        ].where((e) => e != null && e.isNotEmpty).join(' · '),
        colorKey: 'indigo',
        done: s.status == 'completed',
      ),
    );
    i++;
  }

  for (final s in todaySchedules.where(
    (s) => s.medications != null && s.medications!.isNotEmpty,
  )) {
    for (var j = 0; j < s.medications!.length; j++) {
      final med = s.medications![j];
      for (var k = 0; k < med.times.length; k++) {
        tasks.add(
          HomeTask(
            id: 'med_${s.id}_${j}_$k',
            icon: Icons.vaccines_rounded,
            title: '${med.name} ${med.dose}',
            subtitle: med.times[k],
            colorKey: 'pink',
            done: false,
          ),
        );
      }
    }
  }

  tasks.addAll(_getDefaultTasks(mode, stage, todayHormone));
  return tasks;
}

String? _formatTime(DateTime? dt) {
  if (dt == null) return null;
  final local = dt.toLocal();
  final h = local.hour.toString().padLeft(2, '0');
  final m = local.minute.toString().padLeft(2, '0');
  return '$h:$m';
}

String _dDayText(DateTime target, DateTime today) {
  final t = DateTime(target.year, target.month, target.day);
  final diff = t.difference(today).inDays;
  if (diff == 0) return 'D-Day';
  return diff > 0 ? 'D-$diff' : 'D+${diff.abs()}';
}

class _WeekStreakResult {
  const _WeekStreakResult(this.weekDays, this.count);
  final List<WeekDay> weekDays;
  final int count;
}

_WeekStreakResult _buildWeekStreak(
  TreatmentMode mode,
  List<HormoneRecord> hormones,
  List<DailyNote> diaries,
  List<TreatmentSchedule> schedules,
  DateTime today,
) {
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  final dayOfWeek =
      today.weekday % 7; // DateTime.weekday: Mon=1..Sun=7 -> Sun=0..Sat=6
  final monday = today.subtract(Duration(days: (dayOfWeek + 6) % 7));

  final recordedSet = <String>{};
  if (mode == 'natural') {
    for (final h in hormones) {
      recordedSet.add(h.recordedAt.split('T')[0]);
    }
    for (final d in diaries) {
      recordedSet.add(d.date);
    }
  } else {
    for (final h in hormones) {
      recordedSet.add(h.recordedAt.split('T')[0]);
    }
    for (final s in schedules.where((s) => s.status == 'completed')) {
      recordedSet.add(s.scheduledAt.split('T')[0]);
    }
    for (final d in diaries) {
      recordedSet.add(d.date);
    }
  }

  final scheduleIconMap = <String, IconData>{};
  for (final s in schedules.where((s) => s.status == 'completed')) {
    scheduleIconMap[s.scheduledAt.split('T')[0]] = Icons.local_hospital_rounded;
  }
  for (final h in hormones) {
    final d = h.recordedAt.split('T')[0];
    if ((h.injectionDrug != null || h.injectionDose != null) &&
        !scheduleIconMap.containsKey(d)) {
      scheduleIconMap[d] = Icons.vaccines_rounded;
    }
  }

  final weekDays = <WeekDay>[];
  final todayStr = _dateOnlyStr(today);
  for (var i = 0; i < 7; i++) {
    final d = monday.add(Duration(days: i));
    final dateStr = _dateOnlyStr(d);
    final isToday = dateStr == todayStr;
    final isFuture = d.isAfter(today);
    final hasRecord = !isFuture && recordedSet.contains(dateStr);
    weekDays.add(
      WeekDay(
        label: isToday ? '오늘' : dayLabels[d.weekday % 7],
        isToday: isToday,
        recorded: hasRecord,
        recordIcon: hasRecord ? scheduleIconMap[dateStr] : null,
      ),
    );
  }

  final todayIdx = weekDays.indexWhere((d) => d.isToday);
  var count = (todayIdx >= 0 && weekDays[todayIdx].recorded) ? 1 : 0;
  for (var i = todayIdx - 1; i >= 0; i--) {
    if (weekDays[i].recorded) {
      count++;
    } else {
      break;
    }
  }

  return _WeekStreakResult(weekDays, count);
}

String _dateOnlyStr(DateTime d) {
  final y = d.year.toString().padLeft(4, '0');
  final m = d.month.toString().padLeft(2, '0');
  final day = d.day.toString().padLeft(2, '0');
  return '$y-$m-$day';
}

HomeData buildHomeData({
  required TreatmentMode treatmentMode,
  required CurrentStage currentStage,
  required List<MenstrualCycle> cycles,
  required List<HormoneRecord> hormones,
  required List<TreatmentSchedule> schedules,
  required List<DailyNote> diaries,
}) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final todayStr = _dateOnlyStr(today);

  final latestCycle = cycles.isNotEmpty ? cycles.first : null;
  final cycleLength = latestCycle?.cycleLength ?? 28;
  final periodLength = latestCycle?.periodLength ?? 5;

  final lastPeriodStart = latestCycle != null
      ? DateTime.parse(latestCycle.startDate)
      : today.subtract(const Duration(days: 10));

  final cycleDays = CycleCalc.calculateCycleDays(
    lastPeriodStart,
    cycleLength: cycleLength,
    periodLength: periodLength,
    daysAhead: 60,
  );

  CycleDay? todayCycleInfo;
  for (final d in cycleDays) {
    if (d.date == todayStr) {
      todayCycleInfo = d;
      break;
    }
  }
  todayCycleInfo ??= cycleDays.isNotEmpty ? cycleDays.first : null;

  var nextOvulationDate = CycleCalc.getNextOvulationDate(
    lastPeriodStart,
    cycleLength: cycleLength,
  );
  while (nextOvulationDate.isBefore(today)) {
    nextOvulationDate = nextOvulationDate.add(Duration(days: cycleLength));
  }

  var nextPeriodDate = CycleCalc.getNextPeriodDate(
    lastPeriodStart,
    cycleLength: cycleLength,
  );
  while (nextPeriodDate.isBefore(today)) {
    nextPeriodDate = nextPeriodDate.add(Duration(days: cycleLength));
  }

  final currentCycleDay = CycleCalc.getCurrentCycleDay(
    lastPeriodStart,
    cycleLength: cycleLength,
  );

  final phase = todayCycleInfo?.phase ?? 'follicular';

  final todayTasks = getTodayTasksByMode(
    treatmentMode,
    currentStage,
    schedules,
    hormones,
    todayStr,
  );

  final streak = _buildWeekStreak(
    treatmentMode,
    hormones,
    diaries,
    schedules,
    today,
  );

  final stageTip = (treatmentMode != 'natural' && currentStage != null)
      ? ((treatmentMode == 'iui'
                ? _iuiStageTip[currentStage]
                : _ivfStageTip[currentStage]) ??
            '')
      : '';

  return HomeData(
    todayCycleInfo: todayCycleInfo,
    currentCycleDay: currentCycleDay,
    nextOvulationDate: nextOvulationDate,
    nextPeriodDate: nextPeriodDate,
    ovulationDDay: _dDayText(nextOvulationDate, today),
    periodDDay: _dDayText(nextPeriodDate, today),
    todayPhaseLabel: _phaseLabel[phase] ?? '난포기',
    todayTip: stageTip.isNotEmpty
        ? stageTip
        : (_phaseTip[phase] ?? _phaseTip['follicular']!),
    isFertileWindow: todayCycleInfo?.isFertileWindow ?? false,
    todayTasks: todayTasks,
    weekStreak: streak.weekDays,
    streakCount: streak.count,
  );
}
