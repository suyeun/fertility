import 'enums.dart';

class CycleDay {
  CycleDay({
    required this.date,
    required this.phase,
    required this.isOvulation,
    required this.isFertileWindow,
    required this.isMenstruation,
    required this.dayOfCycle,
  });

  final String date;
  final CyclePhase phase;
  final bool isOvulation;
  final bool isFertileWindow;
  final bool isMenstruation;
  final int dayOfCycle;
}

class MenstrualCycle {
  MenstrualCycle({
    required this.id,
    required this.userId,
    required this.startDate,
    this.endDate,
    required this.cycleLength,
    required this.periodLength,
    this.notes,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String startDate;
  final String? endDate;
  final int cycleLength;
  final int periodLength;
  final String? notes;
  final String createdAt;

  factory MenstrualCycle.fromJson(Map<String, dynamic> json) => MenstrualCycle(
    id: json['id'] as String,
    userId: json['userId'] as String? ?? '',
    startDate: json['startDate'] as String,
    endDate: json['endDate'] as String?,
    cycleLength: (json['cycleLength'] as num?)?.toInt() ?? 28,
    periodLength: (json['periodLength'] as num?)?.toInt() ?? 5,
    notes: json['notes'] as String?,
    createdAt: json['createdAt'] as String? ?? '',
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'startDate': startDate,
    if (endDate != null) 'endDate': endDate,
    'cycleLength': cycleLength,
    'periodLength': periodLength,
    if (notes != null) 'notes': notes,
    'createdAt': createdAt,
  };
}
