import '../models/cycle.dart';

/// Port of packages/shared/lib/cycle.ts — ovulation/fertile-window date math.
/// Keep this in exact sync with the TS original; do not reimplement independently.
class CycleCalc {
  CycleCalc._();

  static List<CycleDay> calculateCycleDays(
    DateTime lastPeriodStart, {
    int cycleLength = 28,
    int periodLength = 5,
    int daysAhead = 60,
  }) {
    final days = <CycleDay>[];
    final ovulationDay = cycleLength - 14;
    final startLocal = DateTime(
      lastPeriodStart.year,
      lastPeriodStart.month,
      lastPeriodStart.day,
    );

    for (var i = 0; i < daysAhead; i++) {
      final date = startLocal.add(Duration(days: i));
      final dayOfCycle = (i % cycleLength) + 1;

      final isMenstruation = dayOfCycle <= periodLength;
      final isOvulation = dayOfCycle == ovulationDay;
      final isFertileWindow =
          dayOfCycle >= ovulationDay - 3 && dayOfCycle <= ovulationDay + 1;

      final String phase = isMenstruation
          ? 'menstrual'
          : dayOfCycle < ovulationDay - 3
          ? 'follicular'
          : (isOvulation || isFertileWindow)
          ? 'ovulation'
          : 'luteal';

      days.add(
        CycleDay(
          date: _formatDate(date),
          phase: phase,
          isOvulation: isOvulation,
          isFertileWindow: isFertileWindow,
          isMenstruation: isMenstruation,
          dayOfCycle: dayOfCycle,
        ),
      );
    }

    return days;
  }

  static DateTime getNextOvulationDate(
    DateTime lastPeriodStart, {
    int cycleLength = 28,
  }) {
    final ovulationDay = cycleLength - 14;
    final start = DateTime(
      lastPeriodStart.year,
      lastPeriodStart.month,
      lastPeriodStart.day,
    );
    return start.add(Duration(days: ovulationDay - 1));
  }

  static DateTime getNextPeriodDate(
    DateTime lastPeriodStart, {
    int cycleLength = 28,
  }) {
    final start = DateTime(
      lastPeriodStart.year,
      lastPeriodStart.month,
      lastPeriodStart.day,
    );
    return start.add(Duration(days: cycleLength));
  }

  static int getCurrentCycleDay(
    DateTime lastPeriodStart, {
    int cycleLength = 28,
  }) {
    final now = DateTime.now();
    final diffDays = now.difference(lastPeriodStart).inDays;
    return (diffDays % cycleLength) + 1;
  }

  static String _formatDate(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}
