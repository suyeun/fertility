import '../models/cycle.dart';
import 'cycle.dart';

/// Port of packages/shared/hooks/useCycleCalendar.ts.
class CalendarDay {
  const CalendarDay({
    required this.date,
    required this.dayNum,
    required this.isCurrentMonth,
    required this.isToday,
    this.cycleInfo,
  });

  final DateTime date;
  final int dayNum;
  final bool isCurrentMonth;
  final bool isToday;
  final CycleDay? cycleInfo;
}

class HistoricalCycle {
  const HistoricalCycle({
    required this.startDate,
    this.endDate,
    this.cycleLength,
    this.periodLength,
  });
  final String startDate;
  final String? endDate;
  final int? cycleLength;
  final int? periodLength;
}

String toLocalDateStr(DateTime d) {
  final y = d.year.toString().padLeft(4, '0');
  final m = d.month.toString().padLeft(2, '0');
  final day = d.day.toString().padLeft(2, '0');
  return '$y-$m-$day';
}

class CycleCalendarData {
  const CycleCalendarData({
    required this.calendarDays,
    required this.nextOvulationDate,
    required this.nextPeriodDate,
    required this.currentCycleDay,
    required this.todayPhaseLabel,
  });

  final List<CalendarDay> calendarDays;
  final DateTime nextOvulationDate;
  final DateTime nextPeriodDate;
  final int currentCycleDay;
  final String todayPhaseLabel;
}

Map<String, CycleDay> _buildCycleDayMap(
  DateTime? lastPeriodStart,
  int cycleLength,
  int periodLength,
  List<HistoricalCycle>? allCycles,
) {
  final map = <String, CycleDay>{};
  if (lastPeriodStart == null) return map;

  final cycleDays = CycleCalc.calculateCycleDays(
    lastPeriodStart,
    cycleLength: cycleLength,
    periodLength: periodLength,
    daysAhead: 120,
  );
  for (final d in cycleDays) {
    map[d.date] = d;
  }

  if (allCycles != null && allCycles.length > 1) {
    for (final cycle in allCycles.skip(1)) {
      final start = DateTime.tryParse(cycle.startDate);
      if (start == null) continue;
      final pLen = cycle.periodLength ?? periodLength;
      final cLen = cycle.cycleLength ?? cycleLength;
      final days = CycleCalc.calculateCycleDays(
        start,
        cycleLength: cLen,
        periodLength: pLen,
        daysAhead: pLen + 2,
      );
      for (final d in days) {
        if (d.isMenstruation && !map.containsKey(d.date)) {
          map[d.date] = d;
        }
      }
    }
  }

  return map;
}

List<CalendarDay> _buildCalendarDays(
  DateTime viewDate,
  DateTime today,
  Map<String, CycleDay> cycleDayMap,
) {
  final y = viewDate.year;
  final m = viewDate.month;
  final firstOfMonth = DateTime(y, m, 1);
  final startDow =
      firstOfMonth.weekday % 7; // Sun=0..Sat=6, matches JS getDay()
  final daysInMonth = DateTime(y, m + 1, 0).day;
  final prevMonthDays = DateTime(y, m, 0).day;

  final days = <CalendarDay>[];

  for (var i = startDow - 1; i >= 0; i--) {
    final date = DateTime(y, m - 1, prevMonthDays - i);
    final key = toLocalDateStr(date);
    days.add(
      CalendarDay(
        date: date,
        dayNum: date.day,
        isCurrentMonth: false,
        isToday: date.isAtSameMomentAs(today),
        cycleInfo: cycleDayMap[key],
      ),
    );
  }

  for (var d = 1; d <= daysInMonth; d++) {
    final date = DateTime(y, m, d);
    final key = toLocalDateStr(date);
    days.add(
      CalendarDay(
        date: date,
        dayNum: d,
        isCurrentMonth: true,
        isToday: date.isAtSameMomentAs(today),
        cycleInfo: cycleDayMap[key],
      ),
    );
  }

  final remaining = 42 - days.length;
  for (var i = 1; i <= remaining; i++) {
    final date = DateTime(y, m + 1, i);
    final key = toLocalDateStr(date);
    days.add(
      CalendarDay(
        date: date,
        dayNum: i,
        isCurrentMonth: false,
        isToday: date.isAtSameMomentAs(today),
        cycleInfo: cycleDayMap[key],
      ),
    );
  }

  return days;
}

const Map<String, String> _todayPhaseLabelBase = {
  'menstrual': '생리 중',
  'follicular': '난포기',
  'luteal': '황체기',
};

CycleCalendarData buildCycleCalendarData({
  required DateTime viewDate,
  required DateTime? lastPeriodStart,
  int cycleLength = 28,
  int periodLength = 5,
  List<HistoricalCycle>? allCycles,
}) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);

  final cycleDayMap = _buildCycleDayMap(
    lastPeriodStart,
    cycleLength,
    periodLength,
    allCycles,
  );
  final calendarDays = _buildCalendarDays(viewDate, today, cycleDayMap);

  DateTime nextOvulationDate = today;
  DateTime nextPeriodDate = today;
  var currentCycleDay = 0;

  if (lastPeriodStart != null) {
    nextOvulationDate = CycleCalc.getNextOvulationDate(
      lastPeriodStart,
      cycleLength: cycleLength,
    );
    while (nextOvulationDate.isBefore(today)) {
      nextOvulationDate = nextOvulationDate.add(Duration(days: cycleLength));
    }
    nextPeriodDate = CycleCalc.getNextPeriodDate(
      lastPeriodStart,
      cycleLength: cycleLength,
    );
    while (nextPeriodDate.isBefore(today)) {
      nextPeriodDate = nextPeriodDate.add(Duration(days: cycleLength));
    }
    currentCycleDay = CycleCalc.getCurrentCycleDay(
      lastPeriodStart,
      cycleLength: cycleLength,
    );
  }

  final todayInfo = cycleDayMap[toLocalDateStr(today)];
  String todayPhaseLabel = '—';
  if (todayInfo != null) {
    if (todayInfo.phase == 'ovulation') {
      todayPhaseLabel = todayInfo.isOvulation ? '배란일' : '가임기';
    } else {
      todayPhaseLabel = _todayPhaseLabelBase[todayInfo.phase] ?? '—';
    }
  }

  return CycleCalendarData(
    calendarDays: calendarDays,
    nextOvulationDate: nextOvulationDate,
    nextPeriodDate: nextPeriodDate,
    currentCycleDay: currentCycleDay,
    todayPhaseLabel: todayPhaseLabel,
  );
}

String formatKorDate(DateTime date) => '${date.month}월 ${date.day}일';
