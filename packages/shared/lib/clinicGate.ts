// ============================
// CLINIC 모드 권한 게이트
// RevenueCat을 구독 상태의 단일 소스로 사용.
// 이 게이트는 기능 접근을 제어하며, 데이터 읽기 경로에는 절대 사용하지 않는다.
// ============================

import type { UserProfile } from '../types'

export enum ClinicFeature {
  ENTER_MODE              = 'ENTER_MODE',
  VIEW_STAGES             = 'VIEW_STAGES',
  REGISTER_FIRST_SCHEDULE = 'REGISTER_FIRST_SCHEDULE',
  MEDICATION_REMINDER     = 'MEDICATION_REMINDER',
  MULTI_SCHEDULE          = 'MULTI_SCHEDULE',
  ANALYTICS               = 'ANALYTICS',
}

export interface ClinicGateContext {
  isPremium: boolean
  existingScheduleCount?: number
}

export type PaywallSource =
  | 'medication_reminder'
  | 'multi_schedule'
  | 'analytics'
  | 'generic'

/**
 * UserProfile에서 isPremium을 계산한다.
 * 구독 상태 판단은 RevenueCat 단일 소스에 의존한다 — 로컬에서 임의로 override 금지.
 *
 * [데이터 보존 정책]
 * 사용자가 직접 입력한 기록의 읽기 경로는 구독 상태와 무관하게 항상 허용한다.
 * 이 함수를 데이터 읽기 경로에 사용하지 말 것.
 */
export function isPremiumProfile(
  profile: Pick<UserProfile, 'subscriptionStatus' | 'trialEndsAt' | 'subscriptionExpiresAt'>,
): boolean {
  const now = new Date()

  if (profile.subscriptionStatus === 'active') return true

  if (profile.subscriptionStatus === 'trial') {
    // trialEndsAt이 없으면 무기한 trial로 간주
    if (!profile.trialEndsAt) return true
    return new Date(profile.trialEndsAt) > now
  }

  // 'cancelled': RevenueCat CANCELLATION은 즉시 취소가 아니라 갱신 중단.
  // subscriptionExpiresAt이 미래이면 만료 전까지는 여전히 프리미엄.
  if (profile.subscriptionStatus === 'cancelled' && profile.subscriptionExpiresAt) {
    return new Date(profile.subscriptionExpiresAt) > now
  }

  return false
}

/**
 * CLINIC 모드 기능 접근 게이트.
 * true 반환 시 접근 허용, false 반환 시 페이월 트리거.
 *
 * 잠금 정책:
 * - 무료: ENTER_MODE, VIEW_STAGES, 첫 번째 일정 등록 (existingScheduleCount === 0)
 * - 프리미엄: MEDICATION_REMINDER, MULTI_SCHEDULE, ANALYTICS, 2번째 이상 일정 등록
 */
export function canUseClinicScheduler(
  feature: ClinicFeature,
  ctx: ClinicGateContext,
): boolean {
  switch (feature) {
    // 항상 무료 — CLINIC 진입과 단계 안내는 절대 막지 않는다
    case ClinicFeature.ENTER_MODE:
    case ClinicFeature.VIEW_STAGES:
      return true

    // 첫 번째 일정(0 → 1)은 무료, 두 번째 이상은 MULTI_SCHEDULE 정책을 따른다
    case ClinicFeature.REGISTER_FIRST_SCHEDULE:
      if ((ctx.existingScheduleCount ?? 0) === 0) return true
      return ctx.isPremium

    // 프리미엄 전용
    case ClinicFeature.MEDICATION_REMINDER:
    case ClinicFeature.MULTI_SCHEDULE:
    case ClinicFeature.ANALYTICS:
      return ctx.isPremium

    default:
      return false
  }
}
