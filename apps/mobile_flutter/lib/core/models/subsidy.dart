/// 난임 시술 지원금 규칙/프로필 모델.
/// 규칙(national/local)은 원격(백엔드 API → Firestore config 문서)에서
/// 로드되어 앱 업데이트 없이 갱신 가능하다.
class ProcedureRule {
  ProcedureRule({
    required this.label,
    required this.maxAmount,
    required this.countLimit,
    required this.countGroup,
  });

  final String label;
  final int maxAmount;
  final int countLimit;
  final String countGroup; // ivf | iui

  factory ProcedureRule.fromJson(Map<String, dynamic> j) => ProcedureRule(
    label: j['label'] as String? ?? '',
    maxAmount: (j['maxAmount'] as num?)?.toInt() ?? 0,
    countLimit: (j['countLimit'] as num?)?.toInt() ?? 0,
    countGroup: j['countGroup'] as String? ?? 'ivf',
  );
}

class ExtraRule {
  ExtraRule({required this.label, required this.maxAmount});

  final String label;
  final int maxAmount;

  factory ExtraRule.fromJson(Map<String, dynamic> j) => ExtraRule(
    label: j['label'] as String? ?? '',
    maxAmount: (j['maxAmount'] as num?)?.toInt() ?? 0,
  );
}

class NationalRule {
  NationalRule({
    this.version,
    this.effectiveDate,
    required this.totalLimit,
    required this.procedures,
    required this.extras,
    required this.eligibilityNotes,
    this.disclaimer,
  });

  final String? version;
  final String? effectiveDate;
  final int totalLimit;
  final Map<String, ProcedureRule> procedures;
  final Map<String, ExtraRule> extras;
  final List<String> eligibilityNotes;
  final String? disclaimer;

  factory NationalRule.fromJson(Map<String, dynamic> j) => NationalRule(
    version: j['version'] as String?,
    effectiveDate: j['effectiveDate'] as String?,
    totalLimit: (j['totalLimit'] as num?)?.toInt() ?? 25,
    procedures: (j['procedures'] as Map<String, dynamic>? ?? const {}).map(
      (k, v) => MapEntry(k, ProcedureRule.fromJson(v as Map<String, dynamic>)),
    ),
    extras: (j['extras'] as Map<String, dynamic>? ?? const {}).map(
      (k, v) => MapEntry(k, ExtraRule.fromJson(v as Map<String, dynamic>)),
    ),
    eligibilityNotes:
        (j['eligibilityNotes'] as List?)?.map((e) => e.toString()).toList() ??
        const [],
    disclaimer: j['disclaimer'] as String?,
  );
}

class AdditionalBenefit {
  AdditionalBenefit({
    required this.id,
    required this.label,
    this.description,
    this.maxAmount,
    this.amountNote,
  });

  final String id;
  final String label;
  final String? description;
  final int? maxAmount;
  final String? amountNote;

  factory AdditionalBenefit.fromJson(Map<String, dynamic> j) =>
      AdditionalBenefit(
        id: j['id'] as String? ?? '',
        label: j['label'] as String? ?? '',
        description: j['description'] as String?,
        maxAmount: (j['maxAmount'] as num?)?.toInt(),
        amountNote: j['amountNote'] as String?,
      );
}

class SubsidyRegion {
  SubsidyRegion({
    required this.regionCode,
    required this.regionName,
    required this.overrides,
    required this.additionalBenefits,
    this.residencyNote,
    required this.applyChannels,
    this.sourceUrl,
    this.lastVerified,
  });

  final String regionCode;
  final String regionName;
  final Map<String, int> overrides; // procedureKey -> override amount
  final List<AdditionalBenefit> additionalBenefits;
  final String? residencyNote;
  final List<String> applyChannels;
  final String? sourceUrl;
  final String? lastVerified;

  bool get isStale {
    if (lastVerified == null) return true;
    final verified = DateTime.tryParse(lastVerified!);
    if (verified == null) return true;
    final sixMonthsAgo = DateTime.now().subtract(const Duration(days: 182));
    return verified.isBefore(sixMonthsAgo);
  }

  int? overrideAmount(String procedureKey) => overrides[procedureKey];

  factory SubsidyRegion.fromJson(Map<String, dynamic> j) => SubsidyRegion(
    regionCode: j['regionCode'] as String? ?? '',
    regionName: j['regionName'] as String? ?? '',
    overrides: (j['overrides'] as Map<String, dynamic>? ?? const {}).map(
      (k, v) => MapEntry(k, (v as num).toInt()),
    ),
    additionalBenefits:
        (j['additionalBenefits'] as List?)
            ?.map((e) => AdditionalBenefit.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const [],
    residencyNote: j['residencyNote'] as String?,
    applyChannels:
        (j['applyChannels'] as List?)?.map((e) => e.toString()).toList() ??
        const [],
    sourceUrl: j['sourceUrl'] as String?,
    lastVerified: j['lastVerified'] as String?,
  );
}

class LocalRule {
  LocalRule({required this.regions});

  final List<SubsidyRegion> regions;

  SubsidyRegion? findByCode(String? code) {
    if (code == null) return null;
    for (final r in regions) {
      if (r.regionCode == code) return r;
    }
    return null;
  }

  factory LocalRule.fromJson(Map<String, dynamic> j) => LocalRule(
    regions:
        (j['regions'] as List?)
            ?.map((e) => SubsidyRegion.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const [],
  );
}

class SubsidyCalculationRecord {
  SubsidyCalculationRecord({
    required this.id,
    required this.createdAt,
    required this.procedure,
    required this.extras,
    required this.estimatedTotal,
    this.linkedScheduleId,
  });

  final String id;
  final String createdAt;
  final String procedure;
  final List<String> extras;
  final int estimatedTotal;
  final String? linkedScheduleId;

  factory SubsidyCalculationRecord.fromJson(Map<String, dynamic> j) =>
      SubsidyCalculationRecord(
        id: j['id'] as String? ?? '',
        createdAt: j['createdAt'] as String? ?? '',
        procedure: j['procedure'] as String? ?? '',
        extras:
            (j['extras'] as List?)?.map((e) => e.toString()).toList() ??
            const [],
        estimatedTotal: (j['estimatedTotal'] as num?)?.toInt() ?? 0,
        linkedScheduleId: j['linkedScheduleId'] as String?,
      );

  Map<String, dynamic> toJson() => {
    'procedure': procedure,
    'extras': extras,
    'estimatedTotal': estimatedTotal,
    if (linkedScheduleId != null) 'linkedScheduleId': linkedScheduleId,
  };
}

/// 회차(시술 일정)별 지원금 신청 진행 상태.
/// 시각 필드가 null 이면 미완료. docsChecked 는 서류 체크리스트(docId → 준비됨).
class SubsidyApplication {
  const SubsidyApplication({
    required this.scheduleId,
    this.noticeIssuedAt,
    this.procedureDoneAt,
    this.claimSubmittedAt,
    this.docsChecked = const {},
    this.updatedAt,
  });

  final String scheduleId;
  final String? noticeIssuedAt;
  final String? procedureDoneAt;
  final String? claimSubmittedAt;
  final Map<String, bool> docsChecked;
  final String? updatedAt;

  factory SubsidyApplication.fromJson(String scheduleId, Map<String, dynamic> j) =>
      SubsidyApplication(
        scheduleId: j['scheduleId'] as String? ?? scheduleId,
        noticeIssuedAt: j['noticeIssuedAt'] as String?,
        procedureDoneAt: j['procedureDoneAt'] as String?,
        claimSubmittedAt: j['claimSubmittedAt'] as String?,
        docsChecked: (j['docsChecked'] as Map<String, dynamic>? ?? const {}).map(
          (k, v) => MapEntry(k, v == true),
        ),
        updatedAt: j['updatedAt'] as String?,
      );
}

class UsedCounts {
  const UsedCounts({this.ivf = 0, this.iui = 0});

  final int ivf;
  final int iui;

  int of(String group) => group == 'iui' ? iui : ivf;
  int get total => ivf + iui;

  factory UsedCounts.fromJson(Map<String, dynamic>? j) => UsedCounts(
    ivf: (j?['ivf'] as num?)?.toInt() ?? 0,
    iui: (j?['iui'] as num?)?.toInt() ?? 0,
  );

  Map<String, dynamic> toJson() => {'ivf': ivf, 'iui': iui};
}

class UserSubsidyProfile {
  UserSubsidyProfile({
    this.regionCode,
    this.marriageType,
    required this.usedCounts,
    this.birthsSinceStart = 0,
    required this.calculations,
    required this.checklistState,
    this.applications = const {},
  });

  final String? regionCode;
  final String? marriageType; // legal | defacto
  final UsedCounts usedCounts;
  final int birthsSinceStart;
  final List<SubsidyCalculationRecord> calculations;
  final Map<String, bool> checklistState;

  /// scheduleId → 신청 진행 상태
  final Map<String, SubsidyApplication> applications;

  SubsidyApplication? applicationFor(String scheduleId) =>
      applications[scheduleId];

  factory UserSubsidyProfile.fromJson(Map<String, dynamic> j) =>
      UserSubsidyProfile(
        regionCode: j['regionCode'] as String?,
        marriageType: j['marriageType'] as String?,
        usedCounts: UsedCounts.fromJson(
          j['usedCounts'] as Map<String, dynamic>?,
        ),
        birthsSinceStart: (j['birthsSinceStart'] as num?)?.toInt() ?? 0,
        calculations:
            (j['calculations'] as List?)
                ?.map(
                  (e) => SubsidyCalculationRecord.fromJson(
                    e as Map<String, dynamic>,
                  ),
                )
                .toList() ??
            const [],
        checklistState:
            (j['checklistState'] as Map<String, dynamic>? ?? const {}).map(
              (k, v) => MapEntry(k, v as bool),
            ),
        applications:
            (j['applications'] as Map<String, dynamic>? ?? const {}).map(
              (k, v) => MapEntry(
                k,
                SubsidyApplication.fromJson(k, v as Map<String, dynamic>),
              ),
            ),
      );
}
