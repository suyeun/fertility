'use client'

import { useState } from 'react'

// ============================
// 온보딩 공유 타입 & 훅
// ============================

export type PreparationDuration =
  | 'just_started'   // 막 시작
  | 'under_6months'  // 6개월 미만
  | 'over_6months'   // 6개월 이상
  | 'over_1year'     // 1년 이상

export type TreatmentExperience =
  | 'none'           // 아직 없음
  | 'tested'         // 검사만 받음
  | 'iui'            // IUI 경험
  | 'ivf'            // IVF/FET 경험

export interface OnboardingData {
  preparationDuration: PreparationDuration | null
  treatmentExperience: TreatmentExperience | null
  cycleLength: number  // 생리 주기 (일)
}

// 온보딩 답변 → 앱 stage 결정
export type UserStage = 'beginner' | 'intermediate' | 'advanced'

export function resolveUserStage(data: OnboardingData): UserStage {
  if (
    data.treatmentExperience === 'iui' ||
    data.treatmentExperience === 'ivf'
  ) return 'advanced'
  if (
    data.treatmentExperience === 'tested' ||
    data.preparationDuration === 'over_6months' ||
    data.preparationDuration === 'over_1year'
  ) return 'intermediate'
  return 'beginner'
}

// ============================
// 공유 훅
// ============================

export function useOnboarding() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [data, setData] = useState<OnboardingData>({
    preparationDuration: null,
    treatmentExperience: null,
    cycleLength: 28,
  })

  const setPreparation = (v: PreparationDuration) => {
    setData((d) => ({ ...d, preparationDuration: v }))
    setStep(2)
  }

  const setTreatment = (v: TreatmentExperience) => {
    setData((d) => ({ ...d, treatmentExperience: v }))
    setStep(3)
  }

  const setCycleLength = (v: number) =>
    setData((d) => ({ ...d, cycleLength: v }))

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))

  const isComplete =
    data.preparationDuration !== null &&
    data.treatmentExperience !== null &&
    data.cycleLength >= 21 &&
    data.cycleLength <= 45

  return { step, data, setPreparation, setTreatment, setCycleLength, goBack, isComplete }
}

// 각 스텝 콘텐츠 (웹·앱 공통)
export const STEP1_OPTIONS: { value: PreparationDuration; emoji: string; label: string; sub: string }[] = [
  { value: 'just_started', emoji: '🌱', label: '막 시작했어요', sub: '임신 준비를 이제 시작하는 단계예요' },
  { value: 'under_6months', emoji: '🌸', label: '6개월 미만', sub: '열심히 시도 중이에요' },
  { value: 'over_6months', emoji: '💪', label: '6개월 이상', sub: '꽤 오래 준비하고 있어요' },
  { value: 'over_1year', emoji: '🌟', label: '1년 이상', sub: '정말 오랫동안 노력 중이에요' },
]

export const STEP2_OPTIONS: { value: TreatmentExperience; emoji: string; label: string; sub: string }[] = [
  { value: 'none', emoji: '🙂', label: '아직 없어요', sub: '자연 임신을 시도 중이에요' },
  { value: 'tested', emoji: '🧪', label: '검사는 받았어요', sub: 'AMH, FSH 등 검사를 받아봤어요' },
  { value: 'iui', emoji: '💊', label: 'IUI와 함께 준비 중', sub: 'IUI와 함께 임신을 준비하고 있어요' },
  { value: 'ivf', emoji: '💉', label: 'IVF/FET와 함께', sub: 'IVF나 FET와 함께 나아가고 있어요' },
]
