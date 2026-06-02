'use client'

import { useState } from 'react'

// ============================
// 온보딩 공유 타입 & 훅
// 시술 환자 중심으로 재정의
// ============================

export type TreatmentStage =
  | 'natural'    // 자연임신 시도 중
  | 'iui'        // IUI 인공수정
  | 'ivf'        // IVF 시험관
  | 'fet'        // FET 동결이식
  | 'pregnant'   // 임신 성공

export interface OnboardingData {
  treatmentStage: TreatmentStage | null
  cycleLength: number
}

// 온보딩 답변 → 앱 stage (직접 매핑)
export function resolveUserStage(data: OnboardingData): 'beginner' | 'intermediate' | 'advanced' {
  if (data.treatmentStage === 'ivf' || data.treatmentStage === 'fet') return 'advanced'
  if (data.treatmentStage === 'iui') return 'intermediate'
  return 'beginner'
}

// ============================
// 공유 훅 (2단계로 단순화)
// ============================

export function useOnboarding() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [data, setData] = useState<OnboardingData>({
    treatmentStage: null,
    cycleLength: 28,
  })

  const setStage = (v: TreatmentStage) => {
    setData((d) => ({ ...d, treatmentStage: v }))
    setStep(2)
  }

  const setCycleLength = (v: number) =>
    setData((d) => ({ ...d, cycleLength: v }))

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))

  const isComplete =
    data.treatmentStage !== null &&
    data.cycleLength >= 21 &&
    data.cycleLength <= 45

  return { step, data, setStage, setCycleLength, goBack, isComplete }
}

// ============================
// Step 1: 현재 시술 단계
// ============================

export const STEP1_OPTIONS: {
  value: TreatmentStage
  emoji: string
  label: string
  sub: string
  color: string
}[] = [
  {
    value: 'natural',
    emoji: '🌱',
    label: '자연임신 시도 중',
    sub: '자연 주기로 임신을 준비하고 있어요',
    color: '#22c55e',
  },
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

// Step 2에서 사용 (주기 길이 안내 문구 - 시술별 맞춤)
export const CYCLE_GUIDE: Record<TreatmentStage, string> = {
  natural: '자연 생리 주기를 입력해 주세요',
  iui:     'IUI 시술 전 마지막 자연 주기를 참고해서 입력해 주세요',
  ivf:     '시술 전 마지막 자연 주기를 참고해서 입력해 주세요',
  fet:     '동결이식 준비 중인 주기를 입력해 주세요',
  pregnant:'임신 전 마지막 생리 주기를 입력해 주세요',
}
