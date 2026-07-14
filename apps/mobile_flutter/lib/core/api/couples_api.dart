import '../models/couple.dart';
import 'client.dart';

class InviteResult {
  InviteResult({required this.inviteCode, required this.expiresAt});
  final String inviteCode;
  final String expiresAt;

  factory InviteResult.fromJson(Map<String, dynamic> j) => InviteResult(
    inviteCode: j['inviteCode'] as String,
    expiresAt: j['expiresAt'] as String,
  );
}

class JoinResult {
  JoinResult({required this.coupleId, required this.partnerName});
  final String coupleId;
  final String partnerName;

  factory JoinResult.fromJson(Map<String, dynamic> j) => JoinResult(
    coupleId: j['coupleId'] as String,
    partnerName: j['partnerName'] as String? ?? '',
  );
}

class CouplesApi {
  CouplesApi(this._client);
  final ApiClient _client;

  /// OWNER: 초대코드 생성 (기존 코드 있으면 재발급)
  Future<InviteResult> invite() async {
    final res = await _client.post<Map<String, dynamic>>('/couples/invite');
    return InviteResult.fromJson(res.data!);
  }

  /// PARTNER: 초대코드로 연결
  Future<JoinResult> join(String code) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/couples/join',
      data: {'code': code},
    );
    return JoinResult.fromJson(res.data!);
  }

  Future<CoupleStatusResponse> me() async {
    final res = await _client.get<Map<String, dynamic>>('/couples/me');
    return CoupleStatusResponse.fromJson(res.data!);
  }

  Future<void> unlink(String coupleId) => _client.delete('/couples/$coupleId');
}
