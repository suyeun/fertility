// 난임 시술 지원금 계산 로직 — apps/mobile_flutter/lib/core/domain/subsidy_calculator.dart 의 TypeScript 포트.
// 규칙(national/local)은 백엔드 공개 API(GET /api/subsidy/rules)에서 받아온다.

export interface ProcedureRule {
  label: string
  maxAmount: number
  countLimit: number
  countGroup: 'ivf' | 'iui' | string
}

export interface ExtraRule {
  label: string
  maxAmount: number
}

export interface NationalRules {
  version?: string
  effectiveDate?: string
  totalLimit?: number
  procedures?: Record<string, ProcedureRule>
  extras?: Record<string, ExtraRule>
  eligibilityNotes?: string[]
  disclaimer?: string
}

export interface AdditionalBenefit {
  id: string
  label: string
  description?: string
  maxAmount?: number | null
  amountNote?: string
}

export interface SubsidyRegion {
  regionCode: string
  regionName: string
  overrides?: Record<string, number>
  additionalBenefits?: AdditionalBenefit[]
  residencyNote?: string
  applyChannels?: string[]
  sourceUrl?: string
  lastVerified?: string
}

export interface LocalRules {
  version?: string
  regions?: SubsidyRegion[]
}

export interface SubsidyRules {
  national: NationalRules
  local: LocalRules
}

export interface UsedCounts {
  ivf: number
  iui: number
}

export interface SubsidyLineItem {
  label: string
  amount: number
}

export interface SubsidyCalculationResult {
  eligible: boolean
  totalMax: number
  lineItems: SubsidyLineItem[]
  localBenefits: AdditionalBenefit[]
  remainingCount: number
  warnings: string[]
  isStale: boolean
  reason?: string
}

const notEligible = (reason: string): SubsidyCalculationResult => ({
  eligible: false,
  totalMax: 0,
  lineItems: [],
  localBenefits: [],
  remainingCount: 0,
  warnings: [],
  isStale: false,
  reason,
})

/** 지자체 규칙 검증일이 6개월 이상 지났으면 stale 로 표시한다. */
export function isRegionStale(region?: SubsidyRegion | null): boolean {
  if (!region?.lastVerified) return true
  const verified = new Date(region.lastVerified)
  if (Number.isNaN(verified.getTime())) return true
  const sixMonthsAgo = Date.now() - 182 * 24 * 60 * 60 * 1000
  return verified.getTime() < sixMonthsAgo
}

/** 금액은 항상 "최대" 접두어와 함께 표시한다 — 실제 지급액은 본인부담금에 따라 달라진다. */
export function formatMaxAmount(amount: number): string {
  return `최대 ${amount.toLocaleString('ko-KR')}원`
}

export function calculateSubsidy(params: {
  national: NationalRules
  local?: SubsidyRegion | null
  procedureKey: string
  extraKeys: string[]
  used: UsedCounts
  hasBirthSinceStart?: boolean
}): SubsidyCalculationResult {
  const { national, local, procedureKey, extraKeys, used, hasBirthSinceStart = false } = params
  const proc = national.procedures?.[procedureKey]
  if (!proc) return notEligible('알 수 없는 시술 종류예요.')

  // 출산 시 지원 횟수가 리셋된다.
  const effectiveUsed: UsedCounts = hasBirthSinceStart ? { ivf: 0, iui: 0 } : used
  const groupUsed = proc.countGroup === 'iui' ? effectiveUsed.iui : effectiveUsed.ivf
  const totalLimit = national.totalLimit ?? 25
  const remainingGroup = proc.countLimit - groupUsed
  const remainingTotal = totalLimit - (effectiveUsed.ivf + effectiveUsed.iui)
  const remaining = Math.min(remainingGroup, remainingTotal)

  if (remaining <= 0) {
    return notEligible('지원 횟수를 모두 사용했어요. 출산 후 횟수가 초기화돼요.')
  }

  const baseAmount = local?.overrides?.[procedureKey] ?? proc.maxAmount

  const extraItems: SubsidyLineItem[] = extraKeys
    .map((k) => {
      const e = national.extras?.[k]
      return e ? { label: e.label, amount: e.maxAmount } : null
    })
    .filter((x): x is SubsidyLineItem => x !== null)

  const total = baseAmount + extraItems.reduce((s, e) => s + e.amount, 0)

  const warnings = ['시술 시작 전 지원결정통지서를 발급받아야 지원돼요 (소급 불가)']
  if (!local) warnings.push('거주 지역의 세부 기준은 관할 보건소에서 최종 확인해주세요')

  return {
    eligible: true,
    totalMax: total,
    lineItems: [{ label: proc.label, amount: baseAmount }, ...extraItems],
    localBenefits: local?.additionalBenefits ?? [],
    remainingCount: remaining,
    warnings,
    isStale: local ? isRegionStale(local) : true,
  }
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function fetchSubsidyRules(): Promise<SubsidyRules> {
  const res = await fetch(`${API_BASE_URL}/subsidy/rules`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`지원금 규칙 조회 실패 (${res.status})`)
  const data = await res.json()
  return {
    national: data?.national ?? {},
    local: data?.local ?? { regions: [] },
  }
}
