import 'package:bom_mobile/core/domain/protocol_drafts.dart';
import 'package:bom_mobile/core/models/protocol_template.dart';
import 'package:flutter_test/flutter_test.dart';

ProtocolTemplate _ivf() => const ProtocolTemplate(
  id: 'ivf',
  mode: 'ivf',
  label: 'IVF',
  anchorLabel: '주사 시작일',
  description: '',
  disclaimer: '예시',
  steps: [
    ProtocolStep(
      key: 'stim',
      title: '주사 시작',
      chipValue: 'injection',
      backendType: 'other',
      offsetDays: 0,
      hour: '20:00',
      medicationTimes: ['20:00'],
      medicationDays: 10,
    ),
    ProtocolStep(
      key: 'retrieval',
      title: '채취',
      chipValue: 'retrieval',
      backendType: 'IVF',
      offsetDays: 12,
      hour: '08:00',
    ),
    ProtocolStep(
      key: 'transfer',
      title: '이식',
      chipValue: 'transfer',
      backendType: 'FET',
      offsetDays: 3,
      offsetFrom: 'retrieval',
      hour: '10:00',
    ),
    ProtocolStep(
      key: 'beta',
      title: '판정',
      chipValue: 'bloodtest',
      backendType: 'monitoring',
      offsetDays: 11,
      offsetFrom: 'transfer',
      hour: '09:00',
    ),
  ],
);

void main() {
  final anchor = DateTime(2026, 9, 1);

  test('기준일 오프셋과 단계 간 체인 오프셋을 계산한다', () {
    final drafts = buildProtocolDrafts(_ivf(), anchor);
    expect(drafts.length, 4);
    expect(drafts[0].dateStr, '2026-09-01'); // stim D0
    expect(drafts[1].dateStr, '2026-09-13'); // retrieval D12
    expect(drafts[2].dateStr, '2026-09-16'); // transfer = retrieval + 3
    expect(drafts[3].dateStr, '2026-09-27'); // beta = transfer + 11
    expect(drafts[1].scheduledAt, '2026-09-13T08:00');
  });

  test('약물 이름을 입력하지 않으면 약물 없이 저장된다 (템플릿은 약물을 채우지 않음)', () {
    final d = buildProtocolDrafts(_ivf(), anchor).first;
    expect(d.step.hasMedication, isTrue);
    expect(d.buildMedication(), isNull);
    expect(d.toSavePayload()['medications'], isEmpty);
  });

  test('약물 이름을 입력하면 투약 기간이 계산되어 붙는다', () {
    final d = buildProtocolDrafts(_ivf(), anchor).first;
    d.medicationName = '고날에프';
    d.medicationDose = '150IU';
    final med = d.buildMedication()!;
    expect(med.times, ['20:00']);
    expect(med.startDate, '2026-09-01');
    expect(med.endDate, '2026-09-10'); // 10일
    expect(d.toSavePayload()['medications'], hasLength(1));
  });

  test('사용자가 날짜를 수정하면 payload 에 반영된다', () {
    final d = buildProtocolDrafts(_ivf(), anchor)[1];
    d.date = DateTime(2026, 9, 14);
    d.time = '07:30';
    expect(d.toSavePayload()['scheduledAt'], '2026-09-14T07:30');
    expect(d.toSavePayload()['type'], 'IVF');
    expect(d.toSavePayload()['status'], 'scheduled');
  });

  test('알 수 없는 offsetFrom 은 기준일로 대체한다', () {
    final t = ProtocolTemplate(
      id: 'x',
      mode: 'iui',
      label: '',
      anchorLabel: '',
      description: '',
      disclaimer: '',
      steps: const [
        ProtocolStep(
          key: 'a',
          title: 'a',
          chipValue: 'other',
          backendType: 'other',
          offsetDays: 2,
          offsetFrom: 'missing',
          hour: '09:00',
        ),
      ],
    );
    expect(buildProtocolDrafts(t, anchor).single.dateStr, '2026-09-03');
  });

  test('치료 모드별 템플릿 필터', () {
    final all = [_ivf(), _ivf()].toList()
      ..add(
        const ProtocolTemplate(
          id: 'iui',
          mode: 'iui',
          label: '',
          anchorLabel: '',
          description: '',
          disclaimer: '',
          steps: [],
        ),
      );
    expect(templatesForMode(all, 'iui').length, 1);
    expect(templatesForMode(all, 'ivf').length, 2);
    expect(templatesForMode(all, 'natural'), isEmpty);
  });
}
