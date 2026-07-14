import 'enums.dart';

class CoupleInfo {
  CoupleInfo({
    required this.coupleId,
    required this.ownerId,
    this.partnerId,
    this.inviteCode,
    required this.status,
    required this.createdAt,
    this.expiresAt,
  });

  final String coupleId;
  final String ownerId;
  final String? partnerId;
  final String? inviteCode;
  final CoupleStatus status;
  final String createdAt;
  final String? expiresAt;

  factory CoupleInfo.fromJson(Map<String, dynamic> j) => CoupleInfo(
    coupleId: j['coupleId'] as String,
    ownerId: j['ownerId'] as String? ?? '',
    partnerId: j['partnerId'] as String?,
    inviteCode: j['inviteCode'] as String?,
    status: j['status'] as String? ?? 'PENDING',
    createdAt: j['createdAt'] as String? ?? '',
    expiresAt: j['expiresAt'] as String?,
  );
}

class CoupleNotifSettings {
  CoupleNotifSettings({
    required this.scheduleChanges,
    required this.medicationReminder,
  });

  final bool scheduleChanges;
  final bool medicationReminder;

  factory CoupleNotifSettings.fromJson(Map<String, dynamic> j) =>
      CoupleNotifSettings(
        scheduleChanges: j['scheduleChanges'] as bool? ?? true,
        medicationReminder: j['medicationReminder'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
    'scheduleChanges': scheduleChanges,
    'medicationReminder': medicationReminder,
  };
}

/// GET /couples/me response.
class CoupleStatusResponse {
  CoupleStatusResponse({
    required this.linked,
    this.role,
    this.coupleId,
    this.partnerName,
    this.inviteCode,
    this.expiresAt,
  });

  final bool linked;
  final CoupleRole? role;
  final String? coupleId;
  final String? partnerName;
  final String? inviteCode;
  final String? expiresAt;

  factory CoupleStatusResponse.fromJson(Map<String, dynamic> j) =>
      CoupleStatusResponse(
        linked: j['linked'] as bool? ?? false,
        role: j['role'] as String?,
        coupleId: j['coupleId'] as String?,
        partnerName: j['partnerName'] as String?,
        inviteCode: j['inviteCode'] as String?,
        expiresAt: j['expiresAt'] as String?,
      );
}
