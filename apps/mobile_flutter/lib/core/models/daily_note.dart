/// 캘린더 일별 상세의 메모/컨디션 — 감정일기(diary_entries)를 대체.
/// 날짜당 1건 upsert (백엔드가 `${userId}_${date}` 결정론적 문서ID 사용).
class DailyNote {
  DailyNote({
    required this.id,
    required this.userId,
    required this.date,
    required this.memo,
    this.condition,
    required this.migratedFromDiary,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final String date;
  final String memo;
  final int? condition; // 1(많이 힘듦) ~ 5(좋음)
  final bool migratedFromDiary;
  final String createdAt;
  final String updatedAt;

  factory DailyNote.fromJson(Map<String, dynamic> j) => DailyNote(
    id: j['id'] as String,
    userId: j['userId'] as String? ?? '',
    date: j['date'] as String,
    memo: j['memo'] as String? ?? '',
    condition: (j['condition'] as num?)?.toInt(),
    migratedFromDiary: j['migratedFromDiary'] as bool? ?? false,
    createdAt: j['createdAt'] as String? ?? '',
    updatedAt: j['updatedAt'] as String? ?? '',
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'date': date,
    'memo': memo,
    if (condition != null) 'condition': condition,
    'migratedFromDiary': migratedFromDiary,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
  };
}
