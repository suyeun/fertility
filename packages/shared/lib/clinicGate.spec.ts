import { canUseClinicScheduler, ClinicFeature, isPremiumProfile } from './clinicGate'
import type { UserProfile } from '../types'

// ─── isPremiumProfile ───────────────────────────────────────────────────────

type ProfileStub = Pick<UserProfile, 'subscriptionStatus' | 'trialEndsAt' | 'subscriptionExpiresAt'>

const stub = (overrides: Partial<ProfileStub>): ProfileStub => ({
  subscriptionStatus: 'cancelled',
  trialEndsAt: undefined,
  subscriptionExpiresAt: undefined,
  ...overrides,
})

const future = () => new Date(Date.now() + 7 * 86_400_000).toISOString()
const past   = () => new Date(Date.now() - 86_400_000).toISOString()

describe('isPremiumProfile', () => {
  it('active → true', () => {
    expect(isPremiumProfile(stub({ subscriptionStatus: 'active' }))).toBe(true)
  })

  it('trial + 미래 trialEndsAt → true', () => {
    expect(isPremiumProfile(stub({ subscriptionStatus: 'trial', trialEndsAt: future() }))).toBe(true)
  })

  it('trial + 과거 trialEndsAt → false', () => {
    expect(isPremiumProfile(stub({ subscriptionStatus: 'trial', trialEndsAt: past() }))).toBe(false)
  })

  it('trial + trialEndsAt 없음 → true (무기한 trial)', () => {
    expect(isPremiumProfile(stub({ subscriptionStatus: 'trial' }))).toBe(true)
  })

  it('cancelled + 미래 subscriptionExpiresAt → true (만료 전 유효 기간)', () => {
    expect(isPremiumProfile(stub({ subscriptionStatus: 'cancelled', subscriptionExpiresAt: future() }))).toBe(true)
  })

  it('cancelled + 과거 subscriptionExpiresAt → false', () => {
    expect(isPremiumProfile(stub({ subscriptionStatus: 'cancelled', subscriptionExpiresAt: past() }))).toBe(false)
  })

  it('cancelled + subscriptionExpiresAt 없음 → false', () => {
    expect(isPremiumProfile(stub({ subscriptionStatus: 'cancelled' }))).toBe(false)
  })
})

// ─── canUseClinicScheduler — 무료 기능 ─────────────────────────────────────

describe('canUseClinicScheduler — 무료 기능', () => {
  it('ENTER_MODE: 프리미엄 → true', () => {
    expect(canUseClinicScheduler(ClinicFeature.ENTER_MODE, { isPremium: true })).toBe(true)
  })

  it('ENTER_MODE: 비프리미엄 → true', () => {
    expect(canUseClinicScheduler(ClinicFeature.ENTER_MODE, { isPremium: false })).toBe(true)
  })

  it('VIEW_STAGES: 프리미엄 → true', () => {
    expect(canUseClinicScheduler(ClinicFeature.VIEW_STAGES, { isPremium: true })).toBe(true)
  })

  it('VIEW_STAGES: 비프리미엄 → true', () => {
    expect(canUseClinicScheduler(ClinicFeature.VIEW_STAGES, { isPremium: false })).toBe(true)
  })
})

// ─── canUseClinicScheduler — REGISTER_FIRST_SCHEDULE ───────────────────────

describe('canUseClinicScheduler — REGISTER_FIRST_SCHEDULE', () => {
  it('기존 0건 + 비프리미엄 → true (첫 번째 일정 무료)', () => {
    expect(canUseClinicScheduler(ClinicFeature.REGISTER_FIRST_SCHEDULE, {
      isPremium: false, existingScheduleCount: 0,
    })).toBe(true)
  })

  it('기존 0건 + 프리미엄 → true', () => {
    expect(canUseClinicScheduler(ClinicFeature.REGISTER_FIRST_SCHEDULE, {
      isPremium: true, existingScheduleCount: 0,
    })).toBe(true)
  })

  it('기존 1건 + 비프리미엄 → false (2번째부터 프리미엄)', () => {
    expect(canUseClinicScheduler(ClinicFeature.REGISTER_FIRST_SCHEDULE, {
      isPremium: false, existingScheduleCount: 1,
    })).toBe(false)
  })

  it('기존 1건 + 프리미엄 → true', () => {
    expect(canUseClinicScheduler(ClinicFeature.REGISTER_FIRST_SCHEDULE, {
      isPremium: true, existingScheduleCount: 1,
    })).toBe(true)
  })

  it('기존 5건 + 비프리미엄 → false', () => {
    expect(canUseClinicScheduler(ClinicFeature.REGISTER_FIRST_SCHEDULE, {
      isPremium: false, existingScheduleCount: 5,
    })).toBe(false)
  })

  it('existingScheduleCount 미전달 → 0으로 간주 → true (비프리미엄)', () => {
    expect(canUseClinicScheduler(ClinicFeature.REGISTER_FIRST_SCHEDULE, {
      isPremium: false,
    })).toBe(true)
  })
})

// ─── canUseClinicScheduler — 프리미엄 전용 기능 ────────────────────────────

const premiumFeatures: ClinicFeature[] = [
  ClinicFeature.MEDICATION_REMINDER,
  ClinicFeature.MULTI_SCHEDULE,
  ClinicFeature.ANALYTICS,
]

describe('canUseClinicScheduler — 프리미엄 전용 기능', () => {
  for (const feature of premiumFeatures) {
    it(`${feature}: 프리미엄 → true`, () => {
      expect(canUseClinicScheduler(feature, { isPremium: true })).toBe(true)
    })

    it(`${feature}: 비프리미엄 → false`, () => {
      expect(canUseClinicScheduler(feature, { isPremium: false })).toBe(false)
    })
  }
})
