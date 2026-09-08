import '../models/subsidy.dart';
import '../models/treatment.dart';

/// 지원금 신청 진행 단계 — 통지서 발급 → 시술 완료 → 청구 완료.
enum SubsidyStep { notice, procedure, claim }

/// 단계별 긴급도. 화면 색상과 안내 문구 결정에만 쓴다.
enum SubsidyUrgency { none, soon, overdue }

/// 지원금 대상 시술 유형 (local_notifications 와 동일 기준).
const subsidyEligibleTypes = {'IVF', 'IUI', 'FET'};

/// 청구 권장 기한 — 시술 종료 후 1개월 이내 (지자체 공통 기준, 상세는 보건소 확인).
const _claimDeadlineDays = 30;
const _claimSoonDays = 14;
const _noticeSoonDays = 7;

class SubsidyStepState {
  const SubsidyStepState({
    required this.step,
    required this.done,
    required this.doneAt,
    required this.urgency,
    required this.hint,
  });

  final SubsidyStep step;
  final bool done;
  final String? doneAt;
  final SubsidyUrgency urgency;
  final String hint;
}

class SubsidyProgress {
  const SubsidyProgress({
    required this.schedule,
    required this.application,
    required this.steps,
  });

  final TreatmentSchedule schedule;
  final SubsidyApplication? application;
  final List<SubsidyStepState> steps;

  int get doneCount => steps.where((s) => s.done).length;
  bool get allDone => doneCount == steps.length;

  /// 가장 먼저 처리해야 할 미완료 단계.
  SubsidyStepState? get nextStep {
    for (final s in steps) {
      if (!s.done) return s;
    }
    return null;
  }

  SubsidyUrgency get urgency => nextStep?.urgency ?? SubsidyUrgency.none;
}

/// 시술 일정 하나의 신청 진행 상태를 계산한다.
/// 시술 완료 단계는 사용자 체크 또는 일정 status == completed 로 자동 인정한다.
SubsidyProgress buildSubsidyProgress(
  TreatmentSchedule schedule,
  SubsidyApplication? application, {
  DateTime? now,
}) {
  final today = now ?? DateTime.now();
  final scheduledAt = DateTime.tryParse(schedule.scheduledAt) ?? today;
  final procedureDate = DateTime(
    scheduledAt.year,
    scheduledAt.month,
    scheduledAt.day,
  );
  final todayDate = DateTime(today.year, today.month, today.day);
  final daysToProcedure = procedureDate.difference(todayDate).inDays;

  // 1) 지원결정통지서 — 시술 시작 전에 발급되어야 하며 소급되지 않는다.
  final noticeDone = application?.noticeIssuedAt != null;
  final SubsidyUrgency noticeUrgency;
  final String noticeHint;
  if (noticeDone) {
    noticeUrgency = SubsidyUrgency.none;
    noticeHint = '발급 완료';
  } else if (daysToProcedure < 0) {
    noticeUrgency = SubsidyUrgency.overdue;
    noticeHint = '시술일이 지났어요 — 미발급이면 이번 회차는 지원이 어려울 수 있어요';
  } else if (daysToProcedure <= _noticeSoonDays) {
    noticeUrgency = SubsidyUrgency.soon;
    noticeHint = daysToProcedure == 0
        ? '오늘이 시술일 — 시술 전 발급 필수'
        : '시술 D-$daysToProcedure — 정부24 · e보건소 · 관할 보건소에서 신청';
  } else {
    noticeUrgency = SubsidyUrgency.none;
    noticeHint = '시술 시작 전 발급 (소급 불가)';
  }

  // 2) 시술 완료
  final procedureDone =
      application?.procedureDoneAt != null || schedule.status == 'completed';
  final procedureHint = procedureDone
      ? '시술 완료'
      : daysToProcedure > 0
      ? '시술 예정 D-$daysToProcedure'
      : '시술 후 체크하면 청구 안내가 시작돼요';

  // 3) 청구 — 시술 종료 후 1개월 이내 권장
  final claimDone = application?.claimSubmittedAt != null;
  final daysSinceProcedure = -daysToProcedure;
  final SubsidyUrgency claimUrgency;
  final String claimHint;
  if (claimDone) {
    claimUrgency = SubsidyUrgency.none;
    claimHint = '청구 완료';
  } else if (!procedureDone) {
    claimUrgency = SubsidyUrgency.none;
    claimHint = '시술 후 영수증 · 세부내역서로 관할 보건소에 청구';
  } else if (daysSinceProcedure > _claimDeadlineDays) {
    claimUrgency = SubsidyUrgency.overdue;
    claimHint = '시술 후 $daysSinceProcedure일 경과 — 기한을 넘겼을 수 있어요, 보건소에 확인';
  } else if (daysSinceProcedure >= _claimSoonDays) {
    claimUrgency = SubsidyUrgency.soon;
    claimHint =
        '시술 후 $daysSinceProcedure일 — 1개월 이내 청구 권장 (남은 ${_claimDeadlineDays - daysSinceProcedure}일)';
  } else {
    claimUrgency = SubsidyUrgency.none;
    claimHint = '영수증 · 세부내역서를 챙겨 1개월 이내 청구';
  }

  return SubsidyProgress(
    schedule: schedule,
    application: application,
    steps: [
      SubsidyStepState(
        step: SubsidyStep.notice,
        done: noticeDone,
        doneAt: application?.noticeIssuedAt,
        urgency: noticeUrgency,
        hint: noticeHint,
      ),
      SubsidyStepState(
        step: SubsidyStep.procedure,
        done: procedureDone,
        doneAt: application?.procedureDoneAt,
        urgency: SubsidyUrgency.none,
        hint: procedureHint,
      ),
      SubsidyStepState(
        step: SubsidyStep.claim,
        done: claimDone,
        doneAt: application?.claimSubmittedAt,
        urgency: claimUrgency,
        hint: claimHint,
      ),
    ],
  );
}

/// 진행 관리 대상 일정 — 내 일정 중 지원금 대상 유형, 취소 제외, 최근순.
List<TreatmentSchedule> subsidyTrackableSchedules(
  List<TreatmentSchedule> schedules,
) {
  final list = schedules
      .where(
        (s) =>
            !s.isPartnerRecord &&
            s.status != 'cancelled' &&
            subsidyEligibleTypes.contains(s.type),
      )
      .toList();
  list.sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));
  return list;
}

String subsidyStepLabel(SubsidyStep step) {
  switch (step) {
    case SubsidyStep.notice:
      return '지원결정통지서 발급';
    case SubsidyStep.procedure:
      return '시술 완료';
    case SubsidyStep.claim:
      return '시술비 청구';
  }
}

/// API 필드명 매핑.
String subsidyStepField(SubsidyStep step) {
  switch (step) {
    case SubsidyStep.notice:
      return 'noticeIssuedAt';
    case SubsidyStep.procedure:
      return 'procedureDoneAt';
    case SubsidyStep.claim:
      return 'claimSubmittedAt';
  }
}

/// 서류 체크리스트 (docId, 라벨). docId 는 SubsidyApplication.docsChecked 의 키.
const subsidyRequiredDocs = <({String id, String label})>[
  (id: 'diagnosis', label: '난임진단서 (정부지정 난임시술 의료기관 발급)'),
  (id: 'notice', label: '지원결정통지서 (시술 시작 전 필수 발급)'),
  (id: 'insurance', label: '건강보험 자격확인서'),
  (id: 'receipt', label: '시술비 영수증 · 세부내역서'),
];
