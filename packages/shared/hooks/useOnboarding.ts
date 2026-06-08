'use client'

import { useState } from 'react'
import type { UserMode } from '../types'

export type TreatmentStage =
  | 'natural'
  | 'iui'
  | 'ivf'
  | 'fet'
  | 'pregnant'

export interface OnboardingData {
  mode: UserMode | null         // NATURAL | CLINIC
  treatmentStage: TreatmentStage | null
  cycleLength: number
}

export function resolveUserStage(data: OnboardingData): 'beginner' | 'intermediate' | 'advanced' {
  if (data.mode === 'NATURAL') return 'beginner'
  if (data.treatmentStage === 'ivf' || data.treatmentStage === 'fet') return 'advanced'
  if (data.treatmentStage === 'iui') return 'intermediate'
  return 'beginner'
}

// 3단계 온보딩:
// Step 1: 모드 선택 (자연임신 / 병원 시술)
// Step 2: 시술 단계 (CLINIC 선택 시만 표시) or 주기 입력 직행 (NATURAL)
// Step 3: 주기 길이 입력

export function useOnboarding() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [data, setData] = useState<OnboardingData>({
    mode: null,
    treatmentStage: null,
    cycleLength: 28,
  })

  const selectMode = (mode: UserMode) => {
    setData((d) => ({ ...d, mode, treatmentStage: mode === 'NATURAL' ? 'natural' : null }))
    // NATURAL이면 시술 단계 선택 건너뛰고 Step 3으로
    setStep(mode === 'NATURAL' ? 3 : 2)
  }

  const setStage = (v: TreatmentStage) => {
    setData((d) => ({ ...d, treatmentStage: v }))
    setStep(3)
  }

  const setCycleLength = (v: number) =>
    setData((d) => ({ ...d, cycleLength: v }))

  const goBack = () => {
    if (step === 3) {
      // NATURAL 모드면 Step 1로, CLINIC이면 Step 2로
      setStep(data.mode === 'NATURAL' ? 1 : 2)
    } else if (step === 2) {
      setStep(1)
    }
  }

  const isComplete =
    data.mode !== null &&
    (data.mode === 'NATURAL' || data.treatmentStage !== null) &&
    data.cycleLength >= 21 &&
    data.cycleLength <= 45

  const totalSteps = data.mode === 'NATURAL' ? 2 : 3

  return { step, data, totalSteps, selectMode, setStage, setCycleLength, goBack, isComplete }
}

// ============================
// Step 1: 모드 선택 옵션
// ============================

export const MODE_OPTIONS: {
  value: UserMode
  emoji: string
  label: string
  sub: string
  color: string
  badge?: string
}[] = [
  {
    value: 'NATURAL',
    emoji: '🌱',
    label: '자연 임신 준비 중',
    sub: '배란테스트기를 쓰며 타이밍을 맞추고 있어요',
    color: '#22c55e',
  },
  {
    value: 'CLINIC',
    emoji: '🏥',
    label: '병원 시술 진행 중',
    sub: 'IVF·IUI·FET 시술을 받고 있거나 앞두고 있어요',
    color: '#8b5cf6',
  },
]

// ============================
// Step 2 (CLINIC): 시술 단계
// ============================

export const CLINIC_STAGE_OPTIONS: {
  value: TreatmentStage
  emoji: string
  label: string
  sub: string
  color: string
}[] = [
  {
    value: 'iui',
    emoji: '🧪',
    label: 'IUI 인공수정',
    sub: '인공수정 시술을 받고 있거나 앞두고 있어요',
    color: '#3b82f6',
  },
  {
    value: 'ivf',
    emoji: '🧬',
    label: 'IVF 시험관',
    sub: '시험관 시술을 받고 있거나 앞두고 있어요',
    color: '#8b5cf6',
  },
  {
    value: 'fet',
    emoji: '❄️',
    label: 'FET 동결이식',
    sub: '동결 배아 이식을 받고 있거나 앞두고 있어요',
    color: '#06b6d4',
  },
  {
    value: 'pregnant',
    emoji: '🌸',
    label: '임신 성공!',
    sub: '축하해요! 임신 중 관리를 도와드릴게요',
    color: '#ff8fab',
  },
]

export const CYCLE_GUIDE: Record<TreatmentStage, string> = {
  natural: '자연 생리 주기를 입력해 주세요',
  iui:     'IUI 시술 전 마지막 자연 주기를 참고해서 입력해 주세요',
  ivf:     '시술 전 마지막 자연 주기를 참고해서 입력해 주세요',
  fet:     '동결이식 준비 중인 주기를 입력해 주세요',
  pregnant:'임신 전 마지막 생리 주기를 입력해 주세요',
}
