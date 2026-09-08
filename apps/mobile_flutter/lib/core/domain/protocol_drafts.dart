import '../models/protocol_template.dart';
import '../models/treatment.dart';

/// 템플릿 단계 하나에서 만들어진, 사용자가 수정 가능한 일정 초안.
class ProtocolDraft {
  ProtocolDraft({
    required this.step,
    required this.date,
    required this.time,
    required this.title,
    this.include = true,
    this.medicationName = '',
    this.medicationDose = '',
    this.hospitalName = '',
  });

  final ProtocolStep step;
  DateTime date; // 날짜(시각 없음)
  String time; // HH:mm
  String title;
  bool include;
  String medicationName;
  String medicationDose;
  String hospitalName;

  String get dateStr =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  String get scheduledAt => '${dateStr}T$time';

  /// 투약 슬롯이 있고 사용자가 이름을 입력했을 때만 약물이 붙는다.
  Medication? buildMedication() {
    if (!step.hasMedication || medicationName.trim().isEmpty) return null;
    final days = step.medicationDays ?? 1;
    final end = date.add(Duration(days: days - 1));
    return Medication(
      name: medicationName.trim(),
      dose: medicationDose.trim(),
      times: step.medicationTimes,
      startDate: dateStr,
      endDate:
          '${end.year}-${end.month.toString().padLeft(2, '0')}-${end.day.toString().padLeft(2, '0')}',
    );
  }

  Map<String, dynamic> toSavePayload() {
    final med = buildMedication();
    return {
      'type': step.backendType,
      'title': title.trim(),
      'scheduledAt': scheduledAt,
      'status': 'scheduled',
      'hospitalName': hospitalName,
      'notes': step.note ?? '',
      'medications': med == null ? <Map<String, dynamic>>[] : [med.toJson()],
    };
  }
}

/// 기준일과 템플릿으로 초안 목록을 만든다. offsetFrom 이 있으면 그 단계 날짜 기준으로 계산한다.
/// 알 수 없는 offsetFrom 은 기준일로 대체한다.
List<ProtocolDraft> buildProtocolDrafts(
  ProtocolTemplate template,
  DateTime anchor, {
  String hospitalName = '',
}) {
  final base = DateTime(anchor.year, anchor.month, anchor.day);
  final resolved = <String, DateTime>{};
  final drafts = <ProtocolDraft>[];

  for (final step in template.steps) {
    final from = step.offsetFrom != null
        ? (resolved[step.offsetFrom!] ?? base)
        : base;
    final date = from.add(Duration(days: step.offsetDays));
    resolved[step.key] = date;
    drafts.add(
      ProtocolDraft(
        step: step,
        date: date,
        time: step.hour,
        title: step.title,
        hospitalName: hospitalName,
      ),
    );
  }
  drafts.sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
  return drafts;
}

/// 템플릿의 mode 가 현재 치료 모드와 맞는 것만.
List<ProtocolTemplate> templatesForMode(
  List<ProtocolTemplate> all,
  String treatmentMode,
) => all.where((t) => t.mode == treatmentMode).toList();
