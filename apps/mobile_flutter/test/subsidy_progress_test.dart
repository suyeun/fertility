import 'package:bom_mobile/core/domain/subsidy_progress.dart';
import 'package:bom_mobile/core/models/subsidy.dart';
import 'package:bom_mobile/core/models/treatment.dart';
import 'package:flutter_test/flutter_test.dart';

TreatmentSchedule _schedule({
  required DateTime at,
  String status = 'scheduled',
  String type = 'IVF',
  bool partner = false,
}) => TreatmentSchedule(
  id: 's1',
  userId: 'u1',
  type: type,
  title: '채취',
  scheduledAt: at.toIso8601String(),
  status: status,
  isPartnerRecord: partner,
);

void main() {
  final now = DateTime(2026, 9, 8, 12);

  test('시술 D-3, 통지서 미발급 → 첫 단계 soon', () {
    final p = buildSubsidyProgress(
      _schedule(at: now.add(const Duration(days: 3))),
      null,
      now: now,
    );
    expect(p.doneCount, 0);
    expect(p.nextStep!.step, SubsidyStep.notice);
    expect(p.nextStep!.urgency, SubsidyUrgency.soon);
  });

  test('시술일 지났는데 통지서 미발급 → overdue', () {
    final p = buildSubsidyProgress(
      _schedule(at: now.subtract(const Duration(days: 2))),
      null,
      now: now,
    );
    expect(p.steps[0].urgency, SubsidyUrgency.overdue);
  });

  test('일정 completed 면 시술 단계 자동 인정, 청구 안내 시작', () {
    final p = buildSubsidyProgress(
      _schedule(at: now.subtract(const Duration(days: 5)), status: 'completed'),
      const SubsidyApplication(scheduleId: 's1', noticeIssuedAt: '2026-08-20'),
      now: now,
    );
    expect(p.steps[1].done, isTrue);
    expect(p.doneCount, 2);
    expect(p.nextStep!.step, SubsidyStep.claim);
    expect(p.steps[2].urgency, SubsidyUrgency.none);
  });

  test('시술 후 20일 미청구 → soon, 35일 → overdue', () {
    final app = const SubsidyApplication(
      scheduleId: 's1',
      noticeIssuedAt: '2026-07-01',
      procedureDoneAt: '2026-07-20',
    );
    final soon = buildSubsidyProgress(
      _schedule(at: now.subtract(const Duration(days: 20))),
      app,
      now: now,
    );
    expect(soon.steps[2].urgency, SubsidyUrgency.soon);
    final overdue = buildSubsidyProgress(
      _schedule(at: now.subtract(const Duration(days: 35))),
      app,
      now: now,
    );
    expect(overdue.steps[2].urgency, SubsidyUrgency.overdue);
  });

  test('세 단계 모두 완료 → allDone', () {
    final p = buildSubsidyProgress(
      _schedule(at: now.subtract(const Duration(days: 10))),
      const SubsidyApplication(
        scheduleId: 's1',
        noticeIssuedAt: '2026-08-20',
        procedureDoneAt: '2026-08-29',
        claimSubmittedAt: '2026-09-05',
      ),
      now: now,
    );
    expect(p.allDone, isTrue);
    expect(p.urgency, SubsidyUrgency.none);
  });

  test('대상 일정 필터: 배우자·취소·비대상 유형 제외, 최근순', () {
    final list = subsidyTrackableSchedules([
      _schedule(at: now.subtract(const Duration(days: 1))),
      _schedule(at: now, partner: true),
      _schedule(at: now, status: 'cancelled'),
      _schedule(at: now, type: 'monitoring'),
      _schedule(at: now.add(const Duration(days: 1)), type: 'FET'),
    ]);
    expect(list.length, 2);
    expect(list.first.type, 'FET');
  });

  test('프로필 JSON 의 applications 파싱', () {
    final profile = UserSubsidyProfile.fromJson({
      'applications': {
        'abc': {
          'noticeIssuedAt': '2026-09-01T00:00:00.000Z',
          'docsChecked': {'diagnosis': true, 'receipt': false},
        },
      },
    });
    final app = profile.applicationFor('abc');
    expect(app, isNotNull);
    expect(app!.scheduleId, 'abc');
    expect(app.noticeIssuedAt, isNotNull);
    expect(app.docsChecked['diagnosis'], isTrue);
    expect(app.docsChecked['receipt'], isFalse);
  });
}
