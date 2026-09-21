import '../models/user_profile.dart';
import 'client.dart';

const Object _unset = Object();

class UpdateProfilePayload {
  UpdateProfilePayload({
    this.name,
    this.partnerName,
    this.currentMode,
    this.treatmentStage,
    this.currentStage,
    this.stageStartedAt,
    this.averageCycleLength,
    this.averagePeriodLength,
    this.pregnancyLmpDate = _unset,
    this.pregnancyConfirmedAt = _unset,
  });

  final String? name;
  final String? partnerName;
  final String? currentMode;
  final String? treatmentStage;
  final String? currentStage;
  final String? stageStartedAt;
  final int? averageCycleLength;
  final int? averagePeriodLength;

  /// null 을 명시하면 서버 값을 지운다(모드 해제). 기본값(_unset)은 전송하지 않음.
  final Object? pregnancyLmpDate;
  final Object? pregnancyConfirmedAt;

  Map<String, dynamic> toJson() => {
    if (name != null) 'name': name,
    if (partnerName != null) 'partnerName': partnerName,
    if (currentMode != null) 'currentMode': currentMode,
    if (treatmentStage != null) 'treatmentStage': treatmentStage,
    if (currentStage != null) 'currentStage': currentStage,
    if (stageStartedAt != null) 'stageStartedAt': stageStartedAt,
    if (averageCycleLength != null) 'averageCycleLength': averageCycleLength,
    if (averagePeriodLength != null) 'averagePeriodLength': averagePeriodLength,
    if (pregnancyLmpDate != _unset) 'pregnancyLmpDate': pregnancyLmpDate,
    if (pregnancyConfirmedAt != _unset)
      'pregnancyConfirmedAt': pregnancyConfirmedAt,
  };
}

class UsersApi {
  UsersApi(this._client);
  final ApiClient _client;

  Future<UserProfile> getProfile() async {
    final res = await _client.get<Map<String, dynamic>>('/users/profile');
    return UserProfile.fromJson(res.data!);
  }

  Future<UserProfile> updateProfile(UpdateProfilePayload data) async {
    final res = await _client.patch<Map<String, dynamic>>(
      '/users/profile',
      data: data.toJson(),
    );
    return UserProfile.fromJson(res.data!);
  }
}
