import 'enums.dart';

/// copyWith 에서 "값을 null 로 지우기" 와 "건드리지 않기" 를 구분하기 위한 센티널.
const Object _unset = Object();

class UserProfile {
  UserProfile({
    required this.id,
    required this.email,
    required this.name,
    this.dateOfBirth,
    this.partnerName,
    required this.currentMode,
    this.treatmentStage,
    required this.averageCycleLength,
    required this.averagePeriodLength,
    required this.subscriptionStatus,
    this.trialEndsAt,
    this.subscriptionExpiresAt,
    required this.createdAt,
    this.pregnancyLmpDate,
    this.pregnancyConfirmedAt,
    // Local-only fields merged client-side (mirrors userStore.ts syncProfile()).
    this.currentStage,
    this.stageStartedAt,
  });

  final String id;
  final String email;
  final String name;
  final String? dateOfBirth;
  final String? partnerName;
  final UserMode currentMode;
  final String? treatmentStage; // natural | iui | ivf | fet | pregnant
  final int averageCycleLength;
  final int averagePeriodLength;
  final SubscriptionStatus subscriptionStatus;
  final String? trialEndsAt;
  final String? subscriptionExpiresAt;
  final String createdAt;

  /// 임신 확인 모드 — 주수 계산 기준일(LMP 또는 이식일 환산, YYYY-MM-DD)과 확인일.
  final String? pregnancyLmpDate;
  final String? pregnancyConfirmedAt;

  final CurrentStage currentStage;
  final String? stageStartedAt;

  bool get isPregnantMode => treatmentStage == 'pregnant';

  bool get isPremium =>
      subscriptionStatus == 'active' || subscriptionStatus == 'trial';

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      dateOfBirth: json['dateOfBirth'] as String?,
      partnerName: json['partnerName'] as String?,
      currentMode: (json['currentMode'] as String?) ?? 'NATURAL',
      treatmentStage: json['treatmentStage'] as String?,
      averageCycleLength: (json['averageCycleLength'] as num?)?.toInt() ?? 28,
      averagePeriodLength: (json['averagePeriodLength'] as num?)?.toInt() ?? 5,
      subscriptionStatus: (json['subscriptionStatus'] as String?) ?? 'trial',
      trialEndsAt: json['trialEndsAt'] as String?,
      subscriptionExpiresAt: json['subscriptionExpiresAt'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
      pregnancyLmpDate: json['pregnancyLmpDate'] as String?,
      pregnancyConfirmedAt: json['pregnancyConfirmedAt'] as String?,
      currentStage: json['_currentStage'] as String?,
      stageStartedAt: json['_stageStartedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
    if (dateOfBirth != null) 'dateOfBirth': dateOfBirth,
    if (partnerName != null) 'partnerName': partnerName,
    'currentMode': currentMode,
    if (treatmentStage != null) 'treatmentStage': treatmentStage,
    'averageCycleLength': averageCycleLength,
    'averagePeriodLength': averagePeriodLength,
    'subscriptionStatus': subscriptionStatus,
    if (trialEndsAt != null) 'trialEndsAt': trialEndsAt,
    if (subscriptionExpiresAt != null)
      'subscriptionExpiresAt': subscriptionExpiresAt,
    if (pregnancyLmpDate != null) 'pregnancyLmpDate': pregnancyLmpDate,
    if (pregnancyConfirmedAt != null)
      'pregnancyConfirmedAt': pregnancyConfirmedAt,
    'createdAt': createdAt,
    if (currentStage != null) '_currentStage': currentStage,
    if (stageStartedAt != null) '_stageStartedAt': stageStartedAt,
  };

  UserProfile copyWith({
    String? name,
    String? dateOfBirth,
    String? partnerName,
    UserMode? currentMode,
    String? treatmentStage,
    int? averageCycleLength,
    int? averagePeriodLength,
    SubscriptionStatus? subscriptionStatus,
    String? trialEndsAt,
    String? subscriptionExpiresAt,
    Object? pregnancyLmpDate = _unset,
    Object? pregnancyConfirmedAt = _unset,
    CurrentStage currentStage,
    String? stageStartedAt,
  }) {
    return UserProfile(
      id: id,
      email: email,
      name: name ?? this.name,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      partnerName: partnerName ?? this.partnerName,
      currentMode: currentMode ?? this.currentMode,
      treatmentStage: treatmentStage ?? this.treatmentStage,
      averageCycleLength: averageCycleLength ?? this.averageCycleLength,
      averagePeriodLength: averagePeriodLength ?? this.averagePeriodLength,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      trialEndsAt: trialEndsAt ?? this.trialEndsAt,
      subscriptionExpiresAt:
          subscriptionExpiresAt ?? this.subscriptionExpiresAt,
      pregnancyLmpDate: pregnancyLmpDate == _unset
          ? this.pregnancyLmpDate
          : pregnancyLmpDate as String?,
      pregnancyConfirmedAt: pregnancyConfirmedAt == _unset
          ? this.pregnancyConfirmedAt
          : pregnancyConfirmedAt as String?,
      createdAt: createdAt,
      currentStage: currentStage ?? this.currentStage,
      stageStartedAt: stageStartedAt ?? this.stageStartedAt,
    );
  }
}
