'use client'

import { useState } from 'react'
import type { TreatmentMode, CurrentStage, IUIStage, IVFStage } from '../types'

export interface OnboardingData {
  treatmentMode: TreatmentMode | null   // 'natural' | 'iui' | 'ivf'
  currentStage: CurrentStage            // IUIStage | IVFStage | null
  cycleLength: number
}

// ── Step 1 모드 선택 옵션 ──────────────────────────────
export const MODE_OPTIONS: {
  value: TreatmentMode
  emoji: string
  label: string
  sub: string
  color: string
}[] = [
  {
    value: 'natural',
    emoji: '🌱',
    label: '자연임신 준비 중이에요',
    sub: '배란일 추적, 기초체온 기록으로 가임기를 잡아드려요',
    color: '#22c55e',
  },
  {
    value: 'iui',
    emoji: '💉',
    label: '인공수정(IUI) 치료 중이에요',
    sub: '시술 일정, 배란 모니터링, 수치 관리를 도와드려요',
    color: '#3b82f6',
  },
  {
    value: 'ivf',
    emoji: '🔬',
    label: '시험관(IVF) 치료 중이에요',
    sub: '난포 모니터링, 채취·이식 일정 관리를 도와드려요',
    color: '#8b5cf6',
  },
]

// ── Step 2B IUI 단계 선택 옵션 ────────────────────────
export const IUI_STAGE_OPTIONS: {
  value: IUIStage | null
  emoji: string
  label: string
}[] = [
  { value: 'stimulation', emoji: '💊', label: '과배란 유도 중' },
  { value: 'monitoring',  emoji: '🔍', label: '배란 모니터링 중' },
  { value: 'procedure',   emoji: '🏥', label: '시술 예정 / 당일' },
  { value: 'luteal',      emoji: '🌙', label: '황체기 중' },
  { value: 'result',      emoji: '🧪', label: '판정 대기 중' },
  { value: null,          emoji: '❓', label: '아직 시작 전 / 잘 모르겠어요' },
]

// ── Step 2C IVF 단계 선택 옵션 ────────────────────────
export const IVF_STAGE_OPTIONS: {
  value: IVFStage | null
  emoji: string
  label: string
}[] = [
  { value: 'stimulation', emoji: '💊', label: '과배란 유도 중' },
  { value: 'monitoring',  emoji: '🔍', label: '난포 모니터링 중' },
  { value: 'retrieval',   emoji: '🥚', label: '난자 채취 예정' },
  { value: 'culture',     emoji: '🧫', label: '수정 · 배양 중' },
  { value: 'transfer',    emoji: '🌸', label: '이식 예정 / 당일' },
  { value: 'luteal',      emoji: '🌙', label: '황체기 중' },
  { value: 'result',      emoji: '🧪', label: '판정 대기 중 (β-hCG)' },
  { value: null,          emoji: '❓', label: '아직 시작 전 / 잘 모르겠어요' },
]

export const CYCLE_GUIDE: Record<TreatmentMode, string> = {
  natural: '자연 생리 주기를 입력해 주세요',
  iui:     'IUI 시술 전 마지막 자연 주기를 참고해서 입력해 주세요',
  ivf:     '시술 전 마지막 자연 주기를 참고해서 입력해 주세요',
}

// 흐름:
//  natural → Step1 → Step3 (주기)
//  iui/ivf → Step1 → Step2 (시술 단계) → Step3 (주기)
export function useOnboarding() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [data, setData] = useState<OnboardingData>({
    treatmentMode: null,
    currentStage: null,
    cycleLength: 28,
  })

  const selectMode = (mode: TreatmentMode) => {
    setData((d) => ({ ...d, treatmentMode: mode, currentStage: null }))
    setStep(mode === 'natural' ? 3 : 2)
  }

  const setCurrentStage = (stage: CurrentStage) => {
    setData((d) => ({ ...d, currentStage: stage }))
    setStep(3)
  }

  const setCycleLength = (v: number) =>
    setData((d) => ({ ...d, cycleLength: v }))

  const goBack = () => {
    if (step === 3) setStep(data.treatmentMode === 'natural' ? 1 : 2)
    else if (step === 2) setStep(1)
  }

  const totalSteps = data.treatmentMode === 'natural' ? 2 : 3
  const displayStep = data.treatmentMode === 'natural' && step === 3 ? 2 : step

  return {
    step, displayStep, data, totalSteps,
    selectMode, setCurrentStage, setCycleLength, goBack,
  }
}
