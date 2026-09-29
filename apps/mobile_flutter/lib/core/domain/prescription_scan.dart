import '../models/treatment.dart';

/// 처방전·주사 일정표 인식 결과 → 편집 가능한 일정 초안 (순수 로직, 위젯·IO 없음).
///
/// 원칙: 인식 결과는 항상 초안이다. 사용자가 날짜·시각·약 이름·용량을 확인하고 저장 버튼을 눌러야
/// 일정이 되며, 자동 저장은 없다.

class ScanItem {
  const ScanItem({
    required this.date,
    required this.time,
    required this.kind,
    required this.name,
    required this.dose,
    required this.notes,
    required this.confidence,
  });

  final String? date; // YYYY-MM-DD
  final String? time; // HH:mm
  final String kind; // injection | oral | vaginal | patch | visit | test | other
  final String name;
  final String dose;
  final String notes;
  final String confidence; // high | medium | low

  bool get isMedication => const {'injection', 'oral', 'vaginal', 'patch'}.contains(kind);

  factory ScanItem.fromJson(Map<String, dynamic> j) => ScanItem(
    date: j['date'] as String?,
    time: j['time'] as String?,
    kind: j['kind'] as String? ?? 'other',
    name: j['name'] as String? ?? '',
    dose: j['dose'] as String? ?? '',
    notes: j['notes'] as String? ?? '',
    confidence: j['confidence'] as String? ?? 'medium',
  );
}

/// 스캔 잔여 횟수 — 무료 평생 2회, 프리미엄 하루 20회 (서버가 계산).
class ScanQuota {
  const ScanQuota({
    required this.isPremium,
    required this.freeLimit,
    required this.freeUsed,
    required this.dailyLimit,
    required this.dailyUsed,
    required this.remaining,
    required this.allowed,
    required this.label,
  });
  final bool isPremium;
  final int freeLimit;
  final int freeUsed;
  final int dailyLimit;
  final int dailyUsed;
  final int remaining;
  final bool allowed;
  final String label;

  factory ScanQuota.fromJson(Map<String, dynamic> j) => ScanQuota(
    isPremium: j['isPremium'] == true,
    freeLimit: (j['freeLimit'] as num?)?.toInt() ?? 2,
    freeUsed: (j['freeUsed'] as num?)?.toInt() ?? 0,
    dailyLimit: (j['dailyLimit'] as num?)?.toInt() ?? 20,
    dailyUsed: (j['dailyUsed'] as num?)?.toInt() ?? 0,
    remaining: (j['remaining'] as num?)?.toInt() ?? 0,
    allowed: j['allowed'] == true,
    label: j['label'] as String? ?? '',
  );
}

class ScanResult {
  const ScanResult({
    required this.items,
    required this.warnings,
    this.detectedReferenceDate,
    this.quota,
  });
  final List<ScanItem> items;
  final List<String> warnings;
  final String? detectedReferenceDate;

  /// 이번 스캔을 반영한 잔여 횟수
  final ScanQuota? quota;

  factory ScanResult.fromJson(Map<String, dynamic> j) => ScanResult(
    items: (j['items'] as List? ?? const [])
        .map((e) => ScanItem.fromJson(e as Map<String, dynamic>))
        .where((i) => i.name.isNotEmpty)
        .toList(),
    warnings: (j['warnings'] as List? ?? const []).map((e) => e.toString()).toList(),
    detectedReferenceDate: j['detectedReferenceDate'] as String?,
    quota: j['quota'] is Map<String, dynamic>
        ? ScanQuota.fromJson(j['quota'] as Map<String, dynamic>)
        : null,
  );
}

/// 저장 단위. 약물은 (이름, 용량) 로 묶어 한 일정 + 여러 투약 시각으로, 방문·검사는 건별로.
class ScanDraft {
  ScanDraft({
    required this.kind,
    required this.title,
    required this.startDate,
    required this.endDate,
    required this.times,
    this.medicationName = '',
    this.medicationDose = '',
    this.notes = '',
    this.confidence = 'medium',
    this.include = true,
    this.hospitalName = '',
  });

  final String kind;
  String title;
  DateTime startDate;
  DateTime endDate;
  List<String> times; // 정렬된 HH:mm
  String medicationName;
  String medicationDose;
  String notes;
  final String confidence; // 묶인 항목 중 가장 낮은 확신도
  bool include;
  String hospitalName;

  bool get isMedication => const {'injection', 'oral', 'vaginal', 'patch'}.contains(kind);
  int get dayCount => endDate.difference(startDate).inDays + 1;

  String get startDateStr => _d(startDate);
  String get endDateStr => _d(endDate);

  /// 일정 시각: 첫 투약 시각 또는 09:00
  String get scheduleTime => times.isNotEmpty ? times.first : '09:00';

  String get typeLabel {
    switch (kind) {
      case 'injection':
        return '주사';
      case 'oral':
        return '경구약';
      case 'vaginal':
        return '질정';
      case 'patch':
        return '패치';
      case 'visit':
        return '병원 방문';
      case 'test':
        return '검사';
      default:
        return '기타';
    }
  }

  Map<String, dynamic> toSavePayload() {
    final backendType = kind == 'test' || kind == 'visit' ? 'monitoring' : 'other';
    final med = isMedication && medicationName.trim().isNotEmpty
        ? Medication(
            name: medicationName.trim(),
            dose: medicationDose.trim(),
            times: List<String>.from(times.isEmpty ? const ['09:00'] : times),
            startDate: startDateStr,
            endDate: endDateStr,
          )
        : null;
    return {
      'type': backendType,
      'title': title.trim().isEmpty ? '$typeLabel 일정' : title.trim(),
      'scheduledAt': '${startDateStr}T$scheduleTime',
      'status': 'scheduled',
      'hospitalName': hospitalName,
      'notes': notes,
      'medications': med == null ? <Map<String, dynamic>>[] : [med.toJson()],
    };
  }
}

String _d(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

DateTime? _parseDate(String? s) => s == null ? null : DateTime.tryParse(s);

const _confidenceRank = {'high': 2, 'medium': 1, 'low': 0};

/// 인식 항목을 초안으로 묶는다. 날짜가 없는 항목은 [fallbackDate] 를 쓴다.
List<ScanDraft> buildScanDrafts(List<ScanItem> items, DateTime fallbackDate) {
  final fallback = DateTime(fallbackDate.year, fallbackDate.month, fallbackDate.day);
  final drafts = <ScanDraft>[];
  final medGroups = <String, ScanDraft>{};
  final medConfidence = <String, int>{};

  for (final it in items) {
    final date = _parseDate(it.date) ?? fallback;
    if (it.isMedication) {
      final key = '${it.kind}|${it.name.trim().toLowerCase()}|${it.dose.trim().toLowerCase()}';
      final existing = medGroups[key];
      final rank = _confidenceRank[it.confidence] ?? 1;
      if (existing == null) {
        final d = ScanDraft(
          kind: it.kind,
          title: it.name.trim(),
          startDate: date,
          endDate: date,
          times: it.time != null ? [it.time!] : [],
          medicationName: it.name.trim(),
          medicationDose: it.dose.trim(),
          notes: it.notes,
          confidence: it.confidence,
        );
        medGroups[key] = d;
        medConfidence[key] = rank;
        drafts.add(d);
      } else {
        if (date.isBefore(existing.startDate)) existing.startDate = date;
        if (date.isAfter(existing.endDate)) existing.endDate = date;
        if (it.time != null && !existing.times.contains(it.time)) {
          existing.times = [...existing.times, it.time!]..sort();
        }
        if (it.notes.isNotEmpty && !existing.notes.contains(it.notes)) {
          existing.notes = existing.notes.isEmpty ? it.notes : '${existing.notes} · ${it.notes}';
        }
        final r = medConfidence[key] ?? 1;
        if (rank < r) {
          medConfidence[key] = rank;
          // 가장 낮은 확신도로 교체
          final idx = drafts.indexOf(existing);
          drafts[idx] = ScanDraft(
            kind: existing.kind,
            title: existing.title,
            startDate: existing.startDate,
            endDate: existing.endDate,
            times: existing.times,
            medicationName: existing.medicationName,
            medicationDose: existing.medicationDose,
            notes: existing.notes,
            confidence: it.confidence,
            include: existing.include,
          );
          medGroups[key] = drafts[idx];
        }
      }
    } else {
      drafts.add(
        ScanDraft(
          kind: it.kind,
          title: it.name.trim(),
          startDate: date,
          endDate: date,
          times: it.time != null ? [it.time!] : [],
          notes: it.notes,
          confidence: it.confidence,
        ),
      );
    }
  }

  drafts.sort((a, b) {
    final c = a.startDate.compareTo(b.startDate);
    return c != 0 ? c : a.scheduleTime.compareTo(b.scheduleTime);
  });
  return drafts;
}
