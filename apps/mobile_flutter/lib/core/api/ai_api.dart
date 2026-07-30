import 'dart:convert';

import 'package:dio/dio.dart';

import '../models/chat_message.dart';
import 'client.dart';

/// Note: aiApi.streamChat exists here for contract-parity with
/// packages/shared/lib/api.ts, but the chat screen itself remains a
/// "coming soon" placeholder in this rewrite (see features/chat), matching
/// the original RN app which also never wired this up to a real UI.
class AiApi {
  AiApi(this._client);
  final ApiClient _client;

  Future<void> streamChat(
    List<Map<String, String>> messages,
    void Function(String token) onToken, {
    String? mode,
  }) async {
    final response = await _client.dio.post<ResponseBody>(
      '/ai/chat',
      data: {'messages': messages, if (mode != null) 'mode': mode},
      options: Options(
        responseType: ResponseType.stream,
        sendTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );
    final stream = response.data!.stream;
    await for (final chunk in stream) {
      onToken(utf8.decode(chunk, allowMalformed: true));
    }
  }

  Future<List<AIChatMessage>> getHistory() async {
    final res = await _client.get<List<dynamic>>('/ai/history');
    return (res.data ?? const [])
        .map((e) => AIChatMessage.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> saveHistory(List<Map<String, dynamic>> messages) =>
      _client.post('/ai/history', data: {'messages': messages});
}
