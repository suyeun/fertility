import 'package:bom_mobile/core/domain/treatment_summary.dart';
import 'package:bom_mobile/core/models/hormone_record.dart';
import 'package:bom_mobile/core/models/treatment.dart';
import 'package:flutter_test/flutter_test.dart';

TreatmentSchedule _s(String id, String date, String type, String title,
        {String status = 'completed', bool partner = false}) =>
    TreatmentSchedule(
      id: id,
      userId: 'u',
      type: type,
      title: title,
      scheduledAt: '${date}T09:00',
      status: status,
      isPartnerRecord: partner,
    );

HormoneRecord _r(String date, Map<String, dynamic> extra) =>
    HormoneRecord.fromJson({'id': date, 'userId': 'u', 'recordedAt': date, ...extra});

void main() {
  test('기준 시술 간격 45일 초과면 새 회차, 배우자·취소 일정은 제외', () {
    final cycles = buildTreatmentCycles([
      _s('a1', '2026-03-01', 'other', '주사 시작'),
      _s('a2', '2026-03-12', 'IVF', '채취'),
      _s('a3', '2026-03-15', 'FET', '이식'),
      _s('a4', '2026-03-26', 'monitoring', '판정'),
      _s('b1', '2026-06-10', 'IVF', '채취', status: 'scheduled'),
      _s('x', '2026-06-11', 'IVF', '배우자', partner: true),
      _s('c', '2026-06-12', 'IUI', '취소됨', status: 'cancelled'),
    ], []);
    expect(cycles.length, 2);
    expect(cycles[0].index, 1);
    expect(cycles[0].type, 'IVF');
    expect(cycles[0].schedules.length, 4);
    expect(cycles[0].startDate, '2026-03-01');
    expect(cycles[0].endDate, '2026-03-26');
    expect(cycles[1].schedules.map((s) => s.id), ['b1']);
  });

  test('회차 기간 안의 수치 기록만 붙는다', () {
    final cycles = buildTreatmentCycles(
      [_s('a', '2026-03-10', 'IVF', '채취'), _s('b', '2026-03-13', 'FET', '이식')],
      [
        _r('2026-03-09', {'follicleCount': 8}),
        _r('2026-03-12', {'totalOocytes': 10, 'matureOocytes': 8}),
        _r('2026-04-20', {'hcgLevel': 120}),
      ],
    );
    expect(cycles.single.records.length, 1);
    expect(cycles.single.records.single.totalOocytes, 10);
  });

  test('공유 텍스트에 회차·일정·수치·면책이 들어간다', () {
    final cycles = buildTreatmentCycles(
      [_s('a', '2026-03-10', 'IVF', '난자 채취')],
      [_r('2026-03-10', {'totalOocytes': 10, 'twoPN': 7})],
    );
    final text = formatTreatmentSummary(cycles, userName: '수연', generatedAt: DateTime(2026, 9, 21));
    expect(text, contains('작성자: 수연'));
    expect(text, contains('1회차 · 시험관(채취)'));
    expect(text, contains('2026-03-10 난자 채취 (완료)'));
    expect(text, contains('채취 10개, 수정 7개'));
    expect(text, contains('진단서·소견서가 아니며'));
  });

  test('기록이 없으면 빈 목록', () {
    expect(buildTreatmentCycles([], []), isEmpty);
  });
}
