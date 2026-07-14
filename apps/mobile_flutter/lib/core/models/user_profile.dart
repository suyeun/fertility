import 'enums.dart';

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
  final CurrentStage currentStage;
  final String? stageStartedAt;

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
      createdAt: createdAt,
      currentStage: currentStage ?? this.currentStage,
      stageStartedAt: stageStartedAt ?? this.stageStartedAt,
    );
  }
}
