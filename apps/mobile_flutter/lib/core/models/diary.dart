import 'enums.dart';

class DiaryEntry {
  DiaryEntry({
    required this.id,
    required this.userId,
    required this.date,
    required this.mood,
    required this.content,
    this.aiAnalysis,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String date;
  final Mood mood;
  final String content;
  final String? aiAnalysis;
  final String createdAt;

  factory DiaryEntry.fromJson(Map<String, dynamic> j) => DiaryEntry(
    id: j['id'] as String,
    userId: j['userId'] as String? ?? '',
    date: j['date'] as String,
    mood: j['mood'] as String? ?? 'neutral',
    content: j['content'] as String? ?? '',
    aiAnalysis: j['aiAnalysis'] as String?,
    createdAt: j['createdAt'] as String? ?? '',
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'date': date,
    'mood': mood,
    'content': content,
    if (aiAnalysis != null) 'aiAnalysis': aiAnalysis,
    'createdAt': createdAt,
  };
}

class AIChatMessage {
  AIChatMessage({
    required this.role,
    required this.content,
    required this.timestamp,
  });

  final String role; // user | assistant
  final String content;
  final String timestamp;

  factory AIChatMessage.fromJson(Map<String, dynamic> j) => AIChatMessage(
    role: j['role'] as String,
    content: j['content'] as String? ?? '',
    timestamp: j['timestamp'] as String? ?? '',
  );

  Map<String, dynamic> toJson() => {
    'role': role,
    'content': content,
    'timestamp': timestamp,
  };
}
