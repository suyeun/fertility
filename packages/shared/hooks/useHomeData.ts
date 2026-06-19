'use client'

import { useMemo } from 'react'
import type { MenstrualCycle, HormoneRecord, TreatmentSchedule, DiaryEntry } from '../types'
import type { TreatmentMode, CurrentStage } from '../types'
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
  route?: string
}

export interface QuickAction {
  emoji: string
  label: string
  route: string
  value?: string
}

export interface WeekDay {
  label: string
  isToday: boolean
  recorded: boolean
  recordIcon?: string  // '🏥' | '💉' | undefined
}

export interface HomeData {
  todayCycleInfo: CycleDay | null
  currentCycleDay: number
  nextOvulationDate: Date
  nextPeriodDate: Date
  ovulationDDay: string
  periodDDay: string
  todayPhaseLabel: string
  todayTip: string
  isFertileWindow: boolean
  todayTasks: HomeTask[]
  weekStreak: WeekDay[]
  streakCount: number
}

const PHASE_LABEL: Record<string, string> = {
  menstrual:  '생리 중',
  follicular: '난포기',
  ovulation:  '배란기',
  luteal:     '황체기',
}

const PHASE_TIP: Record<string, string> = {
  menstrual:  '몸을 따뜻하게 하고 충분히 쉬어요. 무리하지 마세요.',
  follicular: '자궁 내막이 자라는 시기예요. 균형 잡힌 영양을 챙겨요.',
  ovulation:  '지금은 가임기예요. 배란 테스트기를 체크하고 기초체온을 기록해보세요.',
  luteal:     '착상을 돕는 황체호르몬이 분비돼요. 편안한 마음을 유지해요.',
}

const IUI_STAGE_TIP: Record<string, string> = {
  stimulation: '몸을 따뜻하게 하고 충분히 쉬어요 💛',
  monitoring:  '배란 신호를 놓치지 마세요 🥚',
  procedure:   '오늘 시술 당일이에요. 긴장하지 마세요 💪',
  luteal:      '착상을 기다리는 소중한 시간이에요 🙏',
  result:      '오늘 판정일이에요. 어떤 결과든 함께할게요 🌸',
}

const IVF_STAGE_TIP: Record<string, string> = {
  stimulation: '약 잘 챙기고 무리하지 마세요 💛',
  monitoring:  '난포가 잘 자라고 있어요. 수분 충분히 드세요 💧',
  retrieval:   '채취 당일이에요. 공복 꼭 지켜주세요 ⚠️',
  culture:     '배아들이 열심히 자라는 중이에요 🌱',
  transfer:    '이식 당일이에요. 긴장 풀고 편안하게 💆',
  luteal:      '착상을 기다리는 소중한 2주예요 🙏',
  result:      '판정일이에요. 어떤 결과든 혼자가 아니에요 🌸',
}

// ── IUI/IVF 단계 순서 ──────────────────────────────────────
export const IUI_STAGE_ORDER: CurrentStage[] = [
  'stimulation', 'monitoring', 'procedure', 'luteal', 'result',
]
export const IVF_STAGE_ORDER: CurrentStage[] = [
  'stimulation', 'monitoring', 'retrieval', 'culture', 'transfer', 'luteal', 'result',
]

export function getStageProgress(mode: TreatmentMode, stage: CurrentStage): { index: number; total: number } {
  if (mode === 'iui') {
    const i = IUI_STAGE_ORDER.indexOf(stage)
    return { index: i >= 0 ? i : 0, total: IUI_STAGE_ORDER.length }
  }
  const i = IVF_STAGE_ORDER.indexOf(stage)
  return { index: i >= 0 ? i : 0, total: IVF_STAGE_ORDER.length }
}

// ── Quick Actions (섹션 C) ──────────────────────────────────
export function getQuickActions(
  mode: TreatmentMode,
  stage: CurrentStage,
): [QuickAction, QuickAction] {
  if (mode === 'natural' || stage === null) {
    return [
      { emoji: '🌡️', label: '기초체온 기록', route: '/records' },
      { emoji: '🥚', label: '배란테스트기 기록', route: '/records' },
    ]
  }
  if (mode === 'iui') {
    const map: Record<string, [QuickAction, QuickAction]> = {
      stimulation: [{ emoji: '🌡️', label: '기초체온 기록', route: '/records' }, { emoji: '💉', label: '주사 기록하기', route: '/records' }],
      monitoring:  [{ emoji: '🌡️', label: '기초체온 기록', route: '/records' }, { emoji: '🥚', label: '배란테스트기 기록', route: '/records' }],
      procedure:   [{ emoji: '🏥', label: '오늘 시술 기록', route: '/records' }, { emoji: '📝', label: '증상 기록', route: '/records' }],
      luteal:      [{ emoji: '📝', label: '증상 기록', route: '/records' }, { emoji: '💊', label: '약물 체크', route: '/records' }],
      result:      [{ emoji: '🩺', label: 'hCG 수치 기록', route: '/records' }, { emoji: '📓', label: '메모 남기기', route: '/records' }],
    }
    return map[stage] ?? map.stimulation
  }
  // ivf
  const map: Record<string, [QuickAction, QuickAction]> = {
    stimulation: [{ emoji: '🌡️', label: '기초체온 기록', route: '/records' }, { emoji: '💉', label: '주사 기록하기', route: '/records' }],
    monitoring:  [{ emoji: '📊', label: '수치 기록 (E2·난포)', route: '/records' }, { emoji: '🌡️', label: '기초체온 기록', route: '/records' }],
    retrieval:   [{ emoji: '📋', label: '채취 결과 기록', route: '/records' }, { emoji: '📝', label: '컨디션 기록', route: '/records' }],
    culture:     [{ emoji: '🧫', label: '배아 상태 기록', route: '/records' }, { emoji: '📓', label: '메모 남기기', route: '/records' }],
    transfer:    [{ emoji: '🏥', label: '이식 결과 기록', route: '/records' }, { emoji: '📝', label: '증상 기록', route: '/records' }],
    luteal:      [{ emoji: '📝', label: '증상 기록', route: '/records' }, { emoji: '💊', label: '약물 체크', route: '/records' }],
    result:      [{ emoji: '🩺', label: 'hCG 수치 기록', route: '/records' }, { emoji: '📓', label: '다음 계획 메모', route: '/records' }],
  }
  return map[stage] ?? map.stimulation
}

// ── 단계별 기본 할 일 (섹션 D 3순위) ───────────────────────
function getDefaultTasks(
  mode: TreatmentMode,
  stage: CurrentStage,
  todayHormone?: HormoneRecord,
): HomeTask[] {
  const bbt: HomeTask = {
    id: 'bbt',
    emoji: '🌡️',
    title: '기초체온 기록',
    subtitle: todayHormone?.bbt ? `${todayHormone.bbt}°C 기록됨` : '아직 기록 전',
    colorKey: 'pink',
    done: !!todayHormone?.bbt,
    route: '/records',
  }
  const opk: HomeTask = {
    id: 'opk',
    emoji: '🥚',
    title: '배란테스트기 기록',
    subtitle: todayHormone?.opkIndex !== undefined ? `OPK ${todayHormone.opkIndex}/10` : '아직 기록 전',
    colorKey: 'indigo',
    done: todayHormone?.opkIndex !== undefined,
    route: '/records',
  }

  if (mode === 'natural') {
    return [bbt, { id: 'folic', emoji: '💊', title: '엽산 챙기기', subtitle: '매일 꾸준히 복용해요', colorKey: 'indigo', done: false, route: '/records' }]
  }

  const iuiDefaults: Record<string, HomeTask[]> = {
    stimulation: [{ id: 'injection', emoji: '💉', title: '주사 맞기 확인', subtitle: '처방된 시간에 맞춰요', colorKey: 'pink', done: false, route: '/records' }, bbt],
    monitoring:  [opk, bbt],
    procedure:   [
      { id: 'clinic', emoji: '🏥', title: '시술 당일 — 병원 방문', subtitle: '예약 시간 확인하세요', colorKey: 'indigo', done: false },
      { id: 'fasting', emoji: '⚠️', title: '공복 여부 확인', subtitle: '시술 전 금식 여부 확인', colorKey: 'pink', done: false },
    ],
    luteal:  [
      { id: 'prog', emoji: '💊', title: '황체 보강제 복용 체크', subtitle: '처방대로 꾸준히', colorKey: 'pink', done: false, route: '/records' },
      { id: 'sym', emoji: '📝', title: '오늘 증상 기록', subtitle: '복통, 부기 등', colorKey: 'indigo', done: false, route: '/records' },
    ],
    result: [{ id: 'hcg', emoji: '🩺', title: 'β-hCG 채혈 결과 기록', subtitle: '오늘의 수치를 기록해요', colorKey: 'pink', done: false, route: '/records' }],
  }
  const ivfDefaults: Record<string, HomeTask[]> = {
    stimulation: [{ id: 'injection', emoji: '💉', title: '주사 맞기 확인', subtitle: '처방된 시간에 맞춰요', colorKey: 'pink', done: false, route: '/records' }, bbt],
    monitoring:  [
      { id: 'clinic', emoji: '🏥', title: '초음파·채혈 일정', subtitle: '오늘 검사가 있는지 확인', colorKey: 'indigo', done: false },
      { id: 'hormone', emoji: '📊', title: '수치 기록', subtitle: 'E2·난포 크기 기록', colorKey: 'pink', done: false, route: '/records' },
    ],
    retrieval: [
      { id: 'ret_clinic', emoji: '🏥', title: '채취 당일', subtitle: '병원 방문 준비', colorKey: 'indigo', done: false },
      { id: 'fasting', emoji: '⚠️', title: '공복 필수', subtitle: '마취 전 금식 지켜요', colorKey: 'pink', done: false },
    ],
    culture: [
      { id: 'status', emoji: '📞', title: '배아 상태 확인', subtitle: '병원 연락 여부 확인', colorKey: 'indigo', done: false },
      { id: 'record', emoji: '📝', title: '수정 결과 기록', subtitle: '수정란 개수·상태', colorKey: 'pink', done: false, route: '/records' },
    ],
    transfer: [
      { id: 'tr_clinic', emoji: '🏥', title: '이식 당일', subtitle: '병원 방문 준비', colorKey: 'indigo', done: false },
      { id: 'rest', emoji: '💊', title: '이식 후 안정', subtitle: '안정을 취해요', colorKey: 'pink', done: false },
    ],
    luteal: [
      { id: 'prog', emoji: '💊', title: '황체 보강제 복용', subtitle: '처방대로 꾸준히', colorKey: 'pink', done: false, route: '/records' },
      { id: 'sym', emoji: '📝', title: '증상 기록', subtitle: '착상 증상 체크', colorKey: 'indigo', done: false, route: '/records' },
      { id: 'no_lift', emoji: '🚫', title: '무리 금지', subtitle: '무거운 것 들지 않기', colorKey: 'pink', done: false },
    ],
    result: [
      { id: 'hcg', emoji: '🩺', title: 'β-hCG 수치 기록', subtitle: '오늘의 수치를 기록해요', colorKey: 'pink', done: false, route: '/records' },
      { id: 'chat', emoji: '💬', title: '봄이에게 이야기하기', subtitle: 'AI 채팅으로 마음 나눠요', colorKey: 'indigo', done: false, route: '/chat' },
    ],
  }

  const map = mode === 'iui' ? iuiDefaults : ivfDefaults
  return map[stage ?? ''] ?? [bbt]
}

// ── 우선순위 통합 할 일 목록 ───────────────────────────────
export function getTodayTasksByMode(
  mode: TreatmentMode,
  stage: CurrentStage,
  schedules: TreatmentSchedule[],
  hormones: HormoneRecord[],
  todayStr: string,
): HomeTask[] {
  const tasks: HomeTask[] = []
  const todaySchedules = schedules.filter(s => s.scheduledAt.split('T')[0] === todayStr)
  const todayHormone   = hormones.find(h => h.recordedAt.split('T')[0] === todayStr)

  // 1순위: 오늘 일정 (약물 없는 것)
  todaySchedules
    .filter(s => !s.medications || s.medications.length === 0)
    .forEach((s, i) => {
      const time = s.scheduledAt.includes('T')
        ? new Date(s.scheduledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        : ''
      tasks.push({
        id: `sched_${i}`,
        emoji: '🏥',
        title: s.title,
        subtitle: [s.hospitalName, time].filter(Boolean).join(' · '),
        colorKey: 'indigo',
        done: s.status === 'completed',
      })
    })

  // 2순위: 약물
  todaySchedules
    .filter(s => s.medications && s.medications.length > 0)
    .forEach(s => {
      s.medications!.forEach((med, j) => {
        med.times.forEach((time, k) => {
          tasks.push({
            id: `med_${s.id}_${j}_${k}`,
            emoji: '💉',
            title: `${med.name} ${med.dose}`,
            subtitle: time,
            colorKey: 'pink',
            done: false,
          })
        })
      })
    })

  // 3순위: 단계별 기본 항목
  tasks.push(...getDefaultTasks(mode, stage, todayHormone))

  return tasks
}

// ── Legacy helper (이전 호환) ────────────────────────────────
function getDDayText(target: Date, today: Date): string {
  const t = new Date(target)
  t.setHours(0, 0, 0, 0)
  const diff = Math.ceil((t.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'D-Day'
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`
}

function buildWeekStreak(
  mode: TreatmentMode,
  hormones: HormoneRecord[],
  diaries: DiaryEntry[],
  schedules: TreatmentSchedule[],
  today: Date,
): { weekDays: WeekDay[]; count: number } {
  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

  // natural: hormone 또는 diary 기록
  // iui/ivf: 일정 체크 또는 수치 기록
  const recordedSet = new Set<string>()
  if (mode === 'natural') {
    hormones.forEach(h => recordedSet.add(h.recordedAt.split('T')[0]))
    diaries.forEach(d => recordedSet.add(d.date))
  } else {
    hormones.forEach(h => recordedSet.add(h.recordedAt.split('T')[0]))
    schedules
      .filter(s => s.status === 'completed')
      .forEach(s => recordedSet.add(s.scheduledAt.split('T')[0]))
    diaries.forEach(d => recordedSet.add(d.date))
  }

  // 아이콘 감지: 시술 일정 → 🏥, 주사 기록 → 💉
  const scheduleIconMap = new Map<string, string>()
  schedules
    .filter(s => s.status === 'completed')
    .forEach(s => scheduleIconMap.set(s.scheduledAt.split('T')[0], '🏥'))
  hormones.forEach(h => {
    const d = h.recordedAt.split('T')[0]
    if ((h.injectionDrug || h.injectionDose) && !scheduleIconMap.has(d)) {
      scheduleIconMap.set(d, '💉')
    }
  })

  const weekDays: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const isToday = dateStr === today.toISOString().split('T')[0]
    const isFuture = d.getTime() > today.getTime()
    const hasRecord = !isFuture && recordedSet.has(dateStr)
    weekDays.push({
      label: isToday ? '오늘' : DAY_LABELS[d.getDay()],
      isToday,
      recorded: hasRecord,
      recordIcon: hasRecord ? scheduleIconMap.get(dateStr) : undefined,
    })
  }

  let count = weekDays.find(d => d.isToday)?.recorded ? 1 : 0
  for (let i = weekDays.findIndex(d => d.isToday) - 1; i >= 0; i--) {
    if (weekDays[i].recorded) count++
    else break
  }

  return { weekDays, count }
}

export function useHomeData(
  treatmentMode: TreatmentMode,
  currentStage: CurrentStage,
  cycles: MenstrualCycle[],
  hormones: HormoneRecord[],
  schedules: TreatmentSchedule[],
  diaries: DiaryEntry[],
): HomeData {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const todayStr = today.toISOString().split('T')[0]
  const latestCycle  = cycles[0]
  const cycleLength  = latestCycle?.cycleLength  ?? 28
  const periodLength = latestCycle?.periodLength ?? 5

  const lastPeriodStart = useMemo(
    () => latestCycle ? new Date(latestCycle.startDate) : new Date(today.getTime() - 10 * 86400000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latestCycle?.startDate],
  )

  const cycleDays = useMemo(
    () => calculateCycleDays(lastPeriodStart, cycleLength, periodLength, 60),
    [lastPeriodStart, cycleLength, periodLength],
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
    [lastPeriodStart, cycleLength],
  )

  const phase = todayCycleInfo?.phase ?? 'follicular'

  const todayTasks = useMemo(
    () => getTodayTasksByMode(treatmentMode, currentStage, schedules, hormones, todayStr),
    [treatmentMode, currentStage, schedules, hormones, todayStr],
  )

  const { weekDays, count: streakCount } = useMemo(
    () => buildWeekStreak(treatmentMode, hormones, diaries, schedules, today),
    [treatmentMode, hormones, diaries, schedules, today],
  )

  const stageTip = treatmentMode !== 'natural' && currentStage
    ? (treatmentMode === 'iui' ? IUI_STAGE_TIP[currentStage] : IVF_STAGE_TIP[currentStage]) ?? ''
    : ''

  return {
    todayCycleInfo,
    currentCycleDay,
    nextOvulationDate,
    nextPeriodDate,
    ovulationDDay: getDDayText(nextOvulationDate, today),
    periodDDay: getDDayText(nextPeriodDate, today),
    todayPhaseLabel: PHASE_LABEL[phase] ?? '난포기',
    todayTip: stageTip || PHASE_TIP[phase] || PHASE_TIP.follicular,
    isFertileWindow: todayCycleInfo?.isFertileWindow ?? false,
    todayTasks,
    weekStreak: weekDays,
    streakCount,
  }
}
