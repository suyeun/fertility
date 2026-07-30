import '../models/user_profile.dart';

/// Port of packages/shared/lib/clinicGate.ts — CLINIC-mode feature gating.
/// RevenueCat is the single source of truth for subscription state; never
/// use this on data *read* paths, only to gate feature access.
enum ClinicFeature {
  enterMode,
  viewStages,
  registerFirstSchedule,
  medicationReminder,
  multiSchedule,
  analytics,
}

enum PaywallSource {
  medicationReminder,
  multiSchedule,
  analytics,
  subsidyCalculator,
  generic,
}

class ClinicGateContext {
  const ClinicGateContext({
    required this.isPremium,
    this.existingScheduleCount,
  });
  final bool isPremium;
  final int? existingScheduleCount;
}

bool isPremiumProfile(UserProfile profile) {
  final now = DateTime.now();

  if (profile.subscriptionStatus == 'active') return true;

  if (profile.subscriptionStatus == 'trial') {
    if (profile.trialEndsAt == null) return true;
    final trialEnds = DateTime.tryParse(profile.trialEndsAt!);
    return trialEnds != null && trialEnds.isAfter(now);
  }

  if (profile.subscriptionStatus == 'cancelled' &&
      profile.subscriptionExpiresAt != null) {
    final expires = DateTime.tryParse(profile.subscriptionExpiresAt!);
    return expires != null && expires.isAfter(now);
  }

  return false;
}

bool canUseClinicScheduler(ClinicFeature feature, ClinicGateContext ctx) {
  switch (feature) {
    case ClinicFeature.enterMode:
    case ClinicFeature.viewStages:
      return true;
    case ClinicFeature.registerFirstSchedule:
      if ((ctx.existingScheduleCount ?? 0) == 0) return true;
      return ctx.isPremium;
    case ClinicFeature.medicationReminder:
    case ClinicFeature.multiSchedule:
    case ClinicFeature.analytics:
      return ctx.isPremium;
  }
}
