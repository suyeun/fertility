import 'package:bom_mobile/core/domain/prescription_scan.dart';
import 'package:flutter_test/flutter_test.dart';

ScanItem _i(String name, {String? date, String? time, String kind = 'injection', String dose = '', String conf = 'high', String notes = ''}) =>
    ScanItem(date: date, time: time, kind: kind, name: name, dose: dose, notes: notes, confidence: conf);

void main() {
  final fallback = DateTime(2026, 3, 1);

  test('같은 약(이름·용량)은 한 초안으로 묶여 날짜 범위와 시각 목록이 된다', () {
    final drafts = buildScanDrafts([
      _i('고날에프', date: '2026-03-02', time: '20:00', dose: '150IU'),
      _i('고날에프', date: '2026-03-03', time: '20:00', dose: '150IU'),
      _i('고날에프', date: '2026-03-04', time: '20:00', dose: '150IU', conf: 'low'),
      _i('크리논', date: '2026-03-10', time: '09:00', kind: 'vaginal'),
      _i('크리논', date: '2026-03-10', time: '21:00', kind: 'vaginal'),
    ], fallback);
    expect(drafts.length, 2);
    final gonal = drafts.first;
    expect(gonal.medicationName, '고날에프');
    expect(gonal.startDateStr, '2026-03-02');
    expect(gonal.endDateStr, '2026-03-04');
    expect(gonal.dayCount, 3);
    expect(gonal.times, ['20:00']);
    expect(gonal.confidence, 'low'); // 묶인 항목 중 가장 낮은 확신도
    final crinone = drafts[1];
    expect(crinone.times, ['09:00', '21:00']);
  });

  test('방문·검사는 건별 초안이고, 날짜가 없으면 기준일을 쓴다', () {
    final drafts = buildScanDrafts([
      _i('초음파', kind: 'visit', time: '10:00'),
      _i('채혈', kind: 'test', date: '2026-03-05'),
    ], fallback);
    expect(drafts.length, 2);
    expect(drafts[0].startDateStr, '2026-03-01');
    expect(drafts[0].scheduleTime, '10:00');
    expect(drafts[1].scheduleTime, '09:00');
  });

  test('저장 페이로드: 약물은 medications 에, 검사는 monitoring 타입으로', () {
    final drafts = buildScanDrafts([
      _i('오비드렐', date: '2026-03-10', time: '21:30', dose: '250mcg', notes: '시각 엄수'),
      _i('채혈', kind: 'test', date: '2026-03-12', time: '08:00'),
    ], fallback);
    final med = drafts[0].toSavePayload();
    expect(med['type'], 'other');
    expect(med['scheduledAt'], '2026-03-10T21:30');
    expect((med['medications'] as List).single['name'], '오비드렐');
    expect((med['medications'] as List).single['times'], ['21:30']);
    expect(med['notes'], '시각 엄수');
    final test_ = drafts[1].toSavePayload();
    expect(test_['type'], 'monitoring');
    expect(test_['medications'], isEmpty);
  });

  test('약 이름을 지우면 약물 없이 일정만 저장된다', () {
    final d = buildScanDrafts([_i('고날에프', date: '2026-03-02', time: '20:00')], fallback).single;
    d.medicationName = '';
    d.title = '주사';
    expect(d.toSavePayload()['medications'], isEmpty);
    expect(d.toSavePayload()['title'], '주사');
  });

  test('ScanResult 파싱은 이름 없는 항목을 걸러낸다', () {
    final r = ScanResult.fromJson({
      'items': [
        {'name': '두파스톤', 'kind': 'oral', 'date': '2026-03-01', 'time': '09:00', 'dose': '', 'notes': '', 'confidence': 'high'},
        {'name': '', 'kind': 'oral'},
      ],
      'warnings': ['흐림'],
      'detectedReferenceDate': '2026-03-01',
    });
    expect(r.items.length, 1);
    expect(r.warnings, ['흐림']);
    expect(r.detectedReferenceDate, '2026-03-01');
  });

  test('ScanResult 에 quota 가 있으면 파싱하고, 없으면 null', () {
    final withQuota = ScanResult.fromJson({
      'items': [],
      'warnings': [],
      'quota': {'isPremium': false, 'freeLimit': 2, 'freeUsed': 1, 'dailyLimit': 20, 'dailyUsed': 0, 'remaining': 1, 'allowed': true, 'label': '무료 체험 1회 남았어요'},
    });
    expect(withQuota.quota!.remaining, 1);
    expect(withQuota.quota!.allowed, isTrue);
    expect(ScanResult.fromJson({'items': [], 'warnings': []}).quota, isNull);
  });
}
