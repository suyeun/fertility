import '../models/subsidy.dart';
import 'client.dart';

class SubsidyRules {
  SubsidyRules({required this.national, required this.local});

  final NationalRule national;
  final LocalRule local;
}

class SubsidyApi {
  SubsidyApi(this._client);
  final ApiClient _client;

  Future<SubsidyRules> getRules() async {
    final res = await _client.get<Map<String, dynamic>>('/subsidy/rules');
    final data = res.data ?? const {};
    return SubsidyRules(
      national: NationalRule.fromJson(
        data['national'] as Map<String, dynamic>? ?? const {},
      ),
      local: LocalRule.fromJson(
        data['local'] as Map<String, dynamic>? ?? const {},
      ),
    );
  }

  Future<UserSubsidyProfile> getProfile() async {
    final res = await _client.get<Map<String, dynamic>>('/subsidy/profile');
    return UserSubsidyProfile.fromJson(res.data ?? const {});
  }

  Future<UserSubsidyProfile> saveProfile(Map<String, dynamic> data) async {
    final res = await _client.patch<Map<String, dynamic>>(
      '/subsidy/profile',
      data: data,
    );
    return UserSubsidyProfile.fromJson(res.data ?? const {});
  }

  /// 회차별 신청 진행 상태 갱신. 시각 필드에 null 을 넣으면 미완료로 되돌린다.
  Future<UserSubsidyProfile> updateApplication(
    String scheduleId,
    Map<String, dynamic> data,
  ) async {
    final res = await _client.patch<Map<String, dynamic>>(
      '/subsidy/applications/$scheduleId',
      data: data,
    );
    return UserSubsidyProfile.fromJson(res.data ?? const {});
  }

  Future<SubsidyCalculationRecord> saveCalculation(
    Map<String, dynamic> data,
  ) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/subsidy/profile/calculations',
      data: data,
    );
    return SubsidyCalculationRecord.fromJson(res.data!);
  }
}
