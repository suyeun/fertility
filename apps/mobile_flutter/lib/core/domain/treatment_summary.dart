import '../models/hormone_record.dart';
import '../models/treatment.dart';

/// 시술 기록 요약 — 산부인과·다른 병원에 가져갈 수 있게 회차별로 정리한 텍스트.
/// 사용자가 앱에 직접 입력한 자가 기록의 정돈된 요약본이며 의료 문서가 아니다.
class TreatmentCycleSummary {
  const TreatmentCycleSummary({
    required this.index,
    required this.startDate,
    required this.endDate,
    required this.type,
    required this.schedules,
    required this.records,
  });

  final int index;
  final String startDate;
  final String endDate;
  final String type; // IVF | IUI | FET
  final List<TreatmentSchedule> schedules;
  final List<HormoneRecord> records;
}

const _cycleAnchorTypes = {'IVF', 'IUI', 'FET'};

String _day(String iso) => iso.split('T')[0];

/// 회차 묶기: 지원금 대상 시술(IVF/IUI/FET) 일정을 기준으로, 그 사이의 일정·기록을 한 회차로 본다.
/// 기준 일정 사이 간격이 45일을 넘으면 새 회차로 나눈다.
List<TreatmentCycleSummary> buildTreatmentCycles(
  List<TreatmentSchedule> schedules,
  List<HormoneRecord> records,
) {
  final mine = schedules
      .where((s) => !s.isPartnerRecord && s.status != 'cancelled')
      .toList()
    ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
  if (mine.isEmpty) return const [];

  final groups = <List<TreatmentSchedule>>[];
  DateTime? lastAnchor;
  for (final s in mine) {
    final date = DateTime.tryParse(_day(s.scheduledAt));
    final isAnchor = _cycleAnchorTypes.contains(s.type);
    final startNew = groups.isEmpty ||
        (isAnchor &&
            lastAnchor != null &&
            date != null &&
            date.difference(lastAnchor).inDays > 45);
    if (startNew) groups.add([]);
    groups.last.add(s);
    if (isAnchor && date != null) lastAnchor = date;
  }

  final result = <TreatmentCycleSummary>[];
  for (var i = 0; i < groups.length; i++) {
    final g = groups[i];
    final start = _day(g.first.scheduledAt);
    final end = _day(g.last.scheduledAt);
    final anchor = g.firstWhere(
      (s) => _cycleAnchorTypes.contains(s.type),
      orElse: () => g.first,
    );
    final recs = records.where((r) {
      final d = _day(r.recordedAt);
      return d.compareTo(start) >= 0 && d.compareTo(end) <= 0;
    }).toList()
      ..sort((a, b) => a.recordedAt.compareTo(b.recordedAt));
    result.add(
      TreatmentCycleSummary(
        index: i + 1,
        startDate: start,
        endDate: end,
        type: _cycleAnchorTypes.contains(anchor.type) ? anchor.type : 'other',
        schedules: g,
        records: recs,
      ),
    );
  }
  return result;
}

const _typeLabel = {'IVF': '시험관(채취)', 'IUI': '인공수정', 'FET': '배아 이식', 'other': '기타'};

String _fmtNum(num? v, [String unit = '']) => v == null ? '-' : '$v$unit';

/// 공유용 텍스트. 이모지·마케팅 문구 없이 사실만 나열한다.
String formatTreatmentSummary(
  List<TreatmentCycleSummary> cycles, {
  String? userName,
  DateTime? generatedAt,
}) {
  final b = StringBuffer();
  final now = generatedAt ?? DateTime.now();
  b.writeln('[BOM] 시술 자가 기록 요약');
  if (userName != null && userName.isNotEmpty) b.writeln('작성자: $userName');
  b.writeln('생성일: ${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}');
  b.writeln('총 ${cycles.length}회차');
  b.writeln();

  for (final c in cycles) {
    b.writeln('■ ${c.index}회차 · ${_typeLabel[c.type] ?? c.type} · ${c.startDate} ~ ${c.endDate}');
    for (final s in c.schedules) {
      final done = s.status == 'completed' ? '완료' : '예정';
      final hospital = (s.hospitalName ?? '').isNotEmpty ? ' @${s.hospitalName}' : '';
      b.writeln('  - ${_day(s.scheduledAt)} ${s.title} ($done)$hospital');
      for (final m in s.medications ?? const <Medication>[]) {
        b.writeln('      약물: ${m.name} ${m.dose} ${m.times.join('/')} ${m.startDate}~${m.endDate ?? ''}');
      }
    }
    // 수치: 값이 있는 항목만
    final lines = <String>[];
    for (final r in c.records) {
      final parts = <String>[];
      if (r.follicleCount != null) parts.add('난포 ${r.follicleCount}개');
      if (r.maxFollicle != null) parts.add('최대난포 ${r.maxFollicle}mm');
      if (r.endometriumThickness != null) parts.add('내막 ${_fmtNum(r.endometriumThickness, 'mm')}');
      if (r.estradiol != null) parts.add('E2 ${_fmtNum(r.estradiol)}');
      if (r.lh != null) parts.add('LH ${_fmtNum(r.lh)}');
      if (r.progesterone != null) parts.add('P4 ${_fmtNum(r.progesterone)}');
      if (r.totalOocytes != null) parts.add('채취 ${r.totalOocytes}개');
      if (r.matureOocytes != null) parts.add('성숙 ${r.matureOocytes}개');
      if (r.twoPN != null) parts.add('수정 ${r.twoPN}개');
      if (r.blastocyst != null) parts.add('배반포 ${r.blastocyst}개');
      if (r.frozenEmbryo != null) parts.add('동결 ${r.frozenEmbryo}개');
      if (r.transferredEmbryos != null) parts.add('이식 ${r.transferredEmbryos}개');
      if (r.embryoGrade != null) parts.add('등급 ${r.embryoGrade}');
      if (r.hcgLevel != null) parts.add('hCG ${_fmtNum(r.hcgLevel)}');
      if (r.judgmentResult != null) parts.add('판정 ${r.judgmentResult}');
      if (parts.isNotEmpty) lines.add('  · ${_day(r.recordedAt)} ${parts.join(', ')}');
    }
    if (lines.isNotEmpty) {
      b.writeln('  [수치 기록]');
      lines.forEach(b.writeln);
    }
    b.writeln();
  }
  b.writeln('※ 본 요약은 사용자가 앱에 직접 입력한 자가 기록입니다. 진단서·소견서가 아니며 진료 참고 자료로만 활용하세요.');
  return b.toString();
}
