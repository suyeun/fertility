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
