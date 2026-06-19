import type { TreatmentMode, CurrentStage } from '../types'

// ── 일정 종류 칩 ────────────────────────────────────────────
export interface ScheduleChip {
  value: string        // 화면 표시용 key
  label: string
  backendType: 'IVF' | 'IUI' | 'FET' | 'monitoring' | 'other'
  emoji: string
}

export function getScheduleChips(mode: TreatmentMode): { chips: ScheduleChip[]; defaultValue: string | null } {
  if (mode === 'natural') {
    return {
      chips: [
        { value: 'period',      label: '생리 시작',  backendType: 'other',      emoji: '🌸' },
        { value: 'ovulation',   label: '배란 확인',  backendType: 'other',      emoji: '🥚' },
        { value: 'intercourse', label: '관계일',     backendType: 'other',      emoji: '❤️' },
        { value: 'hospital',    label: '병원 방문',  backendType: 'other',      emoji: '🏥' },
        { value: 'other',       label: '기타',       backendType: 'other',      emoji: '📅' },
      ],
      defaultValue: null,
    }
  }
  if (mode === 'iui') {
    return {
      chips: [
        { value: 'iui',         label: '인공수정',   backendType: 'IUI',        emoji: '💫' },
        { value: 'monitoring',  label: '초음파',     backendType: 'monitoring', emoji: '🔊' },
        { value: 'bloodtest',   label: '채혈',       backendType: 'monitoring', emoji: '🧪' },
        { value: 'injection',   label: '주사',       backendType: 'other',      emoji: '💉' },
        { value: 'other',       label: '기타',       backendType: 'other',      emoji: '📅' },
      ],
      defaultValue: 'iui',
    }
  }
  // ivf
  return {
    chips: [
      { value: 'ivf',         label: '시험관',     backendType: 'IVF',        emoji: '🔬' },
      { value: 'monitoring',  label: '초음파',     backendType: 'monitoring', emoji: '🔊' },
      { value: 'bloodtest',   label: '채혈',       backendType: 'monitoring', emoji: '🧪' },
      { value: 'transfer',    label: '이식',       backendType: 'FET',        emoji: '🌱' },
      { value: 'retrieval',   label: '채취',       backendType: 'IVF',        emoji: '🥚' },
      { value: 'injection',   label: '주사',       backendType: 'other',      emoji: '💉' },
      { value: 'other',       label: '기타',       backendType: 'other',      emoji: '📅' },
    ],
    defaultValue: 'ivf',
  }
}

// ── 저장 후 단계 전환 제안 ──────────────────────────────────
export interface StageSuggestion {
  nextStage: CurrentStage
  label: string      // 다음 단계 한국어
  message: string    // 바텀시트 안내문
}

export function getNextStageSuggestion(
  scheduleValue: string,
  currentStage: CurrentStage,
  mode: TreatmentMode,
): StageSuggestion | null {
  if (mode === 'natural') return null

  const map: Record<string, StageSuggestion | null> = {
    transfer:   { nextStage: 'luteal',   label: '황체기',   message: '이식이 완료됐어요. 황체기 단계로 이동할까요?' },
    retrieval:  { nextStage: 'culture',  label: '배양',     message: '채취가 완료됐어요. 배양 단계로 이동할까요?' },
    iui:        { nextStage: 'luteal',   label: '황체기',   message: '인공수정이 완료됐어요. 황체기 단계로 이동할까요?' },
    result:     null,
  }
  return map[scheduleValue] ?? null
}

// ── 캘린더 마커 스타일 ──────────────────────────────────────
export interface MarkerStyle {
  emoji: string
  color: string
  label: string
}

export function getScheduleMarkerStyle(scheduleType: string, title?: string): MarkerStyle {
  // chip value 기반 매핑
  switch (scheduleType) {
    case 'injection':  return { emoji: '●', color: '#60a5fa', label: '주사' }
    case 'bloodtest':  return { emoji: '●', color: '#a855f7', label: '채혈' }
    case 'monitoring': return { emoji: '●', color: '#a855f7', label: '초음파' }
    case 'iui':        return { emoji: '★', color: '#ff8fab', label: '인공수정' }
    case 'transfer':   return { emoji: '♥', color: '#2dd4bf', label: '이식' }
    case 'retrieval':  return { emoji: '◎', color: '#f97316', label: '채취' }
  }
  // backendType 기반 매핑 (Firestore에 저장된 type 값)
  switch (scheduleType) {
    case 'IUI':        return { emoji: '★', color: '#ff8fab', label: '인공수정' }
    case 'IVF':        return { emoji: '★', color: '#ff8fab', label: '시험관' }
    case 'FET':        return { emoji: '♥', color: '#2dd4bf', label: '이식' }
    case 'monitoring': return { emoji: '●', color: '#a855f7', label: '초음파/채혈' }
    default:           return { emoji: '●', color: '#94a3b8', label: '일정' }
  }
}
