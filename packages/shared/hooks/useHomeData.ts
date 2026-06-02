'use client'

import { useMemo } from 'react'
import type { MenstrualCycle, HormoneRecord, TreatmentSchedule, DiaryEntry } from '../types'
import {
  calculateCycleDays,
  getNextOvulationDate,
  getNextPeriodDate,
  getCurrentCycleDay,
} from '../lib/cycle'
import type { CycleDay } from '../types'

export interface HomeTask {
  id: string
  emoji: string
  title: string
  subtitle: string
  colorKey: 'pink' | 'indigo'
  done: boolean
}

export interface WeekDay {
  label: string
  isToday: boolean
  recorded: boolean
}

export interface HomeData {
  todayCycleInfo: CycleDay | null
  currentCycleDay: number
  nextOvulationDate: Date
  nextPeriodDate: Date
  ovulationDDay: string
  todayPhaseLabel: string
  todayTip: string
  isFertileWindow: boolean
  todayTasks: HomeTask[]
  weekStreak: WeekDay[]
  streakCount: number
}

const PHASE_LABEL: Record<string, string> = {
  menstrual: '생리 중',
  follicular: '난포기',
  ovulation: '배란기',
  luteal: '황체기',
}

const PHASE_TIP: Record<string, string> = {
  menstrual: '몸을 따뜻하게 하고 충분히 쉬어요. 무리하지 마세요.',
  follicular: '자궁 내막이 자라는 시기예요. 균형 잡힌 영양을 챙겨요.',
  ovulation: '지금은 가임기예요. 배란 테스트기를 체크하고 기초체온을 기록해보세요.',
  luteal: '착상을 돕는 황체호르몬이 분비돼요. 편안한 마음을 유지해요.',
}

function getDDayText(target: Date, today: Date): string {
  const t = new Date(target)
  t.setHours(0, 0, 0, 0)
  const diff = Math.ceil((t.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'D-Day'
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`
}

function mapStage(treatmentStage?: string): 'beginner' | 'intermediate' | 'advanced' {
  if (treatmentStage === 'ivf' || treatmentStage === 'fet') return 'advanced'
  if (treatmentStage === 'iui') return 'intermediate'
  return 'beginner'
}

export function getTodayTasks(
  stage: 'beginner' | 'intermediate' | 'advanced',
  schedules: TreatmentSchedule[],
  hormones: HormoneRecord[],
  todayStr: string
): HomeTask[] {
  const tasks: HomeTask[] = []
  const todayHormone = hormones.find(h => h.recordedAt.split('T')[0] === todayStr)

  tasks.push({
    id: 'bbt',
    emoji: '🌡️',
    title: '기초체온 기록',
    subtitle: todayHormone?.bbt ? `${todayHormone.bbt}°C 기록됨` : '아직 기록 전',
    colorKey: 'pink',
    done: !!todayHormone?.bbt,
  })

  if (stage === 'beginner') {
    tasks.push({
      id: 'folic',
      emoji: '💊',
      title: '엽산 챙기기',
      subtitle: '매일 꾸준히 복용해요',
      colorKey: 'indigo',
      done: false,
    })
  }

  if (stage === 'intermediate' || stage === 'advanced') {
    tasks.push({
      id: 'opk',
      emoji: '🥚',
      title: '배란 테스트기',
      subtitle: todayHormone?.opkIndex !== undefined ? `OPK ${todayHormone.opkIndex}/10` : '아직 기록 전',
      colorKey: 'indigo',
      done: todayHormone?.opkIndex !== undefined,
    })
  }

  if (stage === 'advanced') {
    const todaySchedules = schedules.filter(s => s.scheduledAt.split('T')[0] === todayStr)
    todaySchedules.forEach((s, i) => {
      if (s.medications && s.medications.length > 0) {
        s.medications.forEach((med, j) => {
          tasks.push({
            id: `med_${i}_${j}`,
            emoji: '💊',
            title: `${med.name} ${med.dose}`,
            subtitle: med.times.join(', '),
            colorKey: 'pink',
            done: false,
          })
        })
      } else {
        tasks.push({
          id: `sched_${i}`,
          emoji: '🏥',
          title: s.title,
          subtitle: s.hospitalName || s.type,
          colorKey: 'indigo',
          done: s.status === 'completed',
        })
      }
    })
  }

  return tasks
}

function buildWeekStreak(
  hormones: HormoneRecord[],
  diaries: DiaryEntry[],
  today: Date
): { weekDays: WeekDay[]; count: number } {
  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

  const recordedSet = new Set([
    ...hormones.map(h => h.recordedAt.split('T')[0]),
    ...diaries.map(d => d.date),
  ])

  const weekDays: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const isToday = d.getTime() === today.getTime()
    const isFuture = d.getTime() > today.getTime()
    weekDays.push({
      label: isToday ? '오늘' : DAY_LABELS[d.getDay()],
      isToday,
      recorded: !isFuture && recordedSet.has(dateStr),
    })
  }

  // consecutive streak ending at today (or yesterday if today unrecorded)
  let count = weekDays.find(d => d.isToday)?.recorded ? 1 : 0
  for (let i = weekDays.findIndex(d => d.isToday) - 1; i >= 0; i--) {
    if (weekDays[i].recorded) count++
    else break
  }

  return { weekDays, count }
}

export function useHomeData(
  treatmentStage: string | undefined,
  cycles: MenstrualCycle[],
  hormones: HormoneRecord[],
  schedules: TreatmentSchedule[],
  diaries: DiaryEntry[]
): HomeData {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const todayStr = today.toISOString().split('T')[0]
  const latestCycle = cycles[0]
  const cycleLength = latestCycle?.cycleLength ?? 28
  const periodLength = latestCycle?.periodLength ?? 5

  const lastPeriodStart = useMemo(
    () => latestCycle ? new Date(latestCycle.startDate) : new Date(today.getTime() - 10 * 86400000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latestCycle?.startDate]
  )

  const cycleDays = useMemo(
    () => calculateCycleDays(lastPeriodStart, cycleLength, periodLength, 60),
    [lastPeriodStart, cycleLength, periodLength]
  )

  const todayCycleInfo = cycleDays.find(d => d.date === todayStr) ?? cycleDays[0] ?? null

  const nextOvulationDate = useMemo(() => {
    const d = getNextOvulationDate(lastPeriodStart, cycleLength)
    while (d < today) d.setDate(d.getDate() + cycleLength)
    return d
  }, [lastPeriodStart, cycleLength, today])

  const nextPeriodDate = useMemo(() => {
    const d = getNextPeriodDate(lastPeriodStart, cycleLength)
    while (d < today) d.setDate(d.getDate() + cycleLength)
    return d
  }, [lastPeriodStart, cycleLength, today])

  const currentCycleDay = useMemo(
    () => getCurrentCycleDay(lastPeriodStart, cycleLength),
    [lastPeriodStart, cycleLength]
  )

  const phase = todayCycleInfo?.phase ?? 'follicular'

  const stage = mapStage(treatmentStage)

  const todayTasks = useMemo(
    () => getTodayTasks(stage, schedules, hormones, todayStr),
    [stage, schedules, hormones, todayStr]
  )

  const { weekDays, count: streakCount } = useMemo(
    () => buildWeekStreak(hormones, diaries, today),
    [hormones, diaries, today]
  )

  return {
    todayCycleInfo,
    currentCycleDay,
    nextOvulationDate,
    nextPeriodDate,
    ovulationDDay: getDDayText(nextOvulationDate, today),
    todayPhaseLabel: PHASE_LABEL[phase],
    todayTip: PHASE_TIP[phase],
    isFertileWindow: todayCycleInfo?.isFertileWindow ?? false,
    todayTasks,
    weekStreak: weekDays,
    streakCount,
  }
}
