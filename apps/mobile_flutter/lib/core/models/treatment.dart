import 'enums.dart';

class Medication {
  Medication({
    required this.name,
    required this.dose,
    required this.times,
    required this.startDate,
    this.endDate,
  });

  final String name;
  final String dose;
  final List<String> times;
  final String startDate;
  final String? endDate;

  factory Medication.fromJson(Map<String, dynamic> j) => Medication(
    name: j['name'] as String,
    dose: j['dose'] as String? ?? '',
    times: (j['times'] as List?)?.map((e) => e.toString()).toList() ?? const [],
    startDate: j['startDate'] as String? ?? '',
    endDate: j['endDate'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'name': name,
    'dose': dose,
    'times': times,
    'startDate': startDate,
    if (endDate != null) 'endDate': endDate,
  };
}

class TreatmentSchedule {
  TreatmentSchedule({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    required this.scheduledAt,
    required this.status,
    this.hospitalName,
    this.notes,
    this.medications,
    this.isPartnerRecord = false,
  });

  final String id;
  final String userId;
  final TreatmentType type; // IVF | IUI | FET | monitoring | other
  final String title;
  final String scheduledAt;
  final TreatmentStatus status; // scheduled | completed | cancelled
  final String? hospitalName;
  final String? notes;
  final List<Medication>? medications;

  /// 백엔드 GET /treatment 가 연결된 배우자의 기록에 붙여 내려주는 플래그.
  /// true 면 읽기 전용(수정·삭제 불가)이며 화면에서 "배우자" 로 구분 표시한다.
  final bool isPartnerRecord;

  /// 표시용 제목 — 배우자 기록이면 "배우자 · " 접두어를 붙인다.
  String displayTitle([String fallback = '']) {
    final base = title.isNotEmpty ? title : fallback;
    return isPartnerRecord ? '배우자 · $base' : base;
  }

  factory TreatmentSchedule.fromJson(Map<String, dynamic> j) =>
      TreatmentSchedule(
        id: j['id'] as String,
        userId: j['userId'] as String? ?? '',
        type: j['type'] as String? ?? 'other',
        title: j['title'] as String? ?? '',
        scheduledAt: j['scheduledAt'] as String,
        status: j['status'] as String? ?? 'scheduled',
        hospitalName: j['hospitalName'] as String?,
        notes: j['notes'] as String?,
        medications: (j['medications'] as List?)
            ?.map((e) => Medication.fromJson(e as Map<String, dynamic>))
            .toList(),
        isPartnerRecord: j['isPartnerRecord'] == true,
      );

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'type': type,
    'title': title,
    'scheduledAt': scheduledAt,
    'status': status,
    if (hospitalName != null) 'hospitalName': hospitalName,
    if (notes != null) 'notes': notes,
    if (medications != null)
      'medications': medications!.map((m) => m.toJson()).toList(),
  };
}
