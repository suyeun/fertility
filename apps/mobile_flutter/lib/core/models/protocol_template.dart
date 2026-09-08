/// 시술 회차 프로토콜 템플릿 — 백엔드 GET /treatment/templates.
/// "예시 일정" 이며 사용자가 날짜·시간을 확인·수정한 뒤 저장한다.
/// 약물 이름·용량은 템플릿에 없고 투약 시각 슬롯만 있다 (사용자 입력).
class ProtocolStep {
  const ProtocolStep({
    required this.key,
    required this.title,
    required this.chipValue,
    required this.backendType,
    required this.offsetDays,
    this.offsetFrom,
    required this.hour,
    this.medicationTimes = const [],
    this.medicationDays,
    this.note,
  });

  final String key;
  final String title;
  final String chipValue; // injection | monitoring | bloodtest | retrieval | transfer | iui | other
  final String backendType; // IVF | IUI | FET | monitoring | other
  final int offsetDays;
  final String? offsetFrom;
  final String hour; // HH:mm
  final List<String> medicationTimes;
  final int? medicationDays;
  final String? note;

  bool get hasMedication => medicationTimes.isNotEmpty;

  factory ProtocolStep.fromJson(Map<String, dynamic> j) => ProtocolStep(
    key: j['key'] as String? ?? '',
    title: j['title'] as String? ?? '',
    chipValue: j['chipValue'] as String? ?? 'other',
    backendType: j['backendType'] as String? ?? 'other',
    offsetDays: (j['offsetDays'] as num?)?.toInt() ?? 0,
    offsetFrom: j['offsetFrom'] as String?,
    hour: j['hour'] as String? ?? '09:00',
    medicationTimes:
        (j['medicationTimes'] as List?)?.map((e) => e.toString()).toList() ??
        const [],
    medicationDays: (j['medicationDays'] as num?)?.toInt(),
    note: j['note'] as String?,
  );
}

class ProtocolTemplate {
  const ProtocolTemplate({
    required this.id,
    required this.mode,
    required this.label,
    required this.anchorLabel,
    required this.description,
    required this.disclaimer,
    required this.steps,
  });

  final String id;
  final String mode; // ivf | iui
  final String label;
  final String anchorLabel;
  final String description;
  final String disclaimer;
  final List<ProtocolStep> steps;

  factory ProtocolTemplate.fromJson(Map<String, dynamic> j) => ProtocolTemplate(
    id: j['id'] as String? ?? '',
    mode: j['mode'] as String? ?? 'ivf',
    label: j['label'] as String? ?? '',
    anchorLabel: j['anchorLabel'] as String? ?? '기준일',
    description: j['description'] as String? ?? '',
    disclaimer: j['disclaimer'] as String? ?? '',
    steps: (j['steps'] as List? ?? const [])
        .map((e) => ProtocolStep.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}
