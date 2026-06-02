import type { CycleDay, CyclePhase } from '../types'

// ============================
// 배란일·가임기 계산 로직
// 웹·앱 공통 사용 — 절대 중복 구현하지 말 것
// ============================

/**
 * 마지막 생리 시작일과 평균 주기로 향후 60일간의 사이클 데이터 생성
 */
export function calculateCycleDays(
  lastPeriodStart: Date,
  cycleLength: number = 28,
  periodLength: number = 5,
  daysAhead: number = 60
): CycleDay[] {
  const days: CycleDay[] = []

  // 배란일 = 다음 생리 예정일 - 14일 (황체기 고정)
  const ovulationDay = cycleLength - 14

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(lastPeriodStart)
    date.setDate(date.getDate() + i)

    // 현재 사이클 내 몇 번째 날인지 (1-based)
    const dayOfCycle = ((i % cycleLength) + 1)

    const isMenstruation = dayOfCycle <= periodLength
    const isOvulation = dayOfCycle === ovulationDay
    // 배란일 전후 5일 = 가임기 (배란일 -3 ~ +1)
    const isFertileWindow = dayOfCycle >= ovulationDay - 3 && dayOfCycle <= ovulationDay + 1

    const phase: CyclePhase = isMenstruation
      ? 'menstrual'
      : dayOfCycle < ovulationDay - 3
        ? 'follicular'
        : isOvulation || isFertileWindow
          ? 'ovulation'
          : 'luteal'

    days.push({
      date: formatDate(date),
      phase,
      isOvulation,
      isFertileWindow,
      isMenstruation,
      dayOfCycle,
    })
  }

  return days
}

/**
 * 다음 배란 예정일 반환
 */
export function getNextOvulationDate(
  lastPeriodStart: Date,
  cycleLength: number = 28
): Date {
  const ovulationDay = cycleLength - 14
  const next = new Date(lastPeriodStart)
  next.setDate(next.getDate() + ovulationDay - 1)
  return next
}

/**
 * 다음 생리 예정일 반환
 */
export function getNextPeriodDate(
  lastPeriodStart: Date,
  cycleLength: number = 28
): Date {
  const next = new Date(lastPeriodStart)
  next.setDate(next.getDate() + cycleLength)
  return next
}

/**
 * 오늘 기준 사이클 몇 번째 날인지
 */
export function getCurrentCycleDay(
  lastPeriodStart: Date,
  cycleLength: number = 28
): number {
  const today = new Date()
  const diffMs = today.getTime() - lastPeriodStart.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return (diffDays % cycleLength) + 1
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
