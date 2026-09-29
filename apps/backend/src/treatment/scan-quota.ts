/// 처방표 스캔 횟수 정책 — 무료 평생 2회, 프리미엄 하루 20회(비용·남용 상한).
/// 순수 함수라 Jest 로 검증한다. 저장·갱신은 ScheduleScanService.

export const SCAN_FREE_LIFETIME_LIMIT = 2
export const SCAN_PREMIUM_DAILY_LIMIT = 20

export interface ScanUsage {
  freeUsed: number        // 무료 사용 누적 (평생)
  dailyUsed: number       // 오늘 사용 (프리미엄 기준)
  dailyDate: string | null // dailyUsed 가 속한 날짜 YYYY-MM-DD (KST)
}

export interface ScanQuota {
  isPremium: boolean
  freeLimit: number
  freeUsed: number
  dailyLimit: number
  dailyUsed: number
  remaining: number
  allowed: boolean
  /// 사용자 안내 문구
  label: string
}

export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function readUsage(data: any): ScanUsage {
  return {
    freeUsed: Number(data?.scanFreeUsed) || 0,
    dailyUsed: Number(data?.scanDailyUsed) || 0,
    dailyDate: typeof data?.scanDailyDate === 'string' ? data.scanDailyDate : null,
  }
}

export function evaluateScanQuota(isPremium: boolean, usage: ScanUsage, today: string): ScanQuota {
  const dailyUsed = usage.dailyDate === today ? usage.dailyUsed : 0
  if (isPremium) {
    const remaining = Math.max(0, SCAN_PREMIUM_DAILY_LIMIT - dailyUsed)
    return {
      isPremium: true,
      freeLimit: SCAN_FREE_LIFETIME_LIMIT,
      freeUsed: usage.freeUsed,
      dailyLimit: SCAN_PREMIUM_DAILY_LIMIT,
      dailyUsed,
      remaining,
      allowed: remaining > 0,
      label: remaining > 0 ? `오늘 ${remaining}회 더 스캔할 수 있어요` : '오늘 스캔 한도(20회)에 도달했어요. 내일 다시 이용할 수 있어요',
    }
  }
  const remaining = Math.max(0, SCAN_FREE_LIFETIME_LIMIT - usage.freeUsed)
  return {
    isPremium: false,
    freeLimit: SCAN_FREE_LIFETIME_LIMIT,
    freeUsed: usage.freeUsed,
    dailyLimit: SCAN_PREMIUM_DAILY_LIMIT,
    dailyUsed,
    remaining,
    allowed: remaining > 0,
    label: remaining > 0 ? `무료 체험 ${remaining}회 남았어요` : '무료 체험 2회를 모두 사용했어요. 프리미엄에서 하루 20회까지 스캔할 수 있어요',
  }
}

/// 성공한 스캔 1건을 반영한 다음 사용량. 무료는 평생 카운트, 프리미엄은 일일 카운트만 올린다.
export function consumeScan(isPremium: boolean, usage: ScanUsage, today: string): ScanUsage {
  const dailyUsed = (usage.dailyDate === today ? usage.dailyUsed : 0) + 1
  return {
    freeUsed: isPremium ? usage.freeUsed : usage.freeUsed + 1,
    dailyUsed,
    dailyDate: today,
  }
}
