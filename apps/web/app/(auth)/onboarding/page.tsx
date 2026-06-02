'use client'

import { useOnboarding } from '@fertility/shared'
import { ProgressBar } from '../../../components/onboarding/ProgressBar'
import { Step1 } from '../../../components/onboarding/Step1'
import { Step2 } from '../../../components/onboarding/Step2'
import { Step3 } from '../../../components/onboarding/Step3'
import { CompleteScreen } from '../../../components/onboarding/CompleteScreen'
import { useState } from 'react'

export default function OnboardingPage() {
  const {
    step, data,
    setPreparation, setTreatment,
    setCycleLength, goBack, isComplete,
  } = useOnboarding()
  const [done, setDone] = useState(false)

  return (
    <main className="min-h-screen bg-[#fff8f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-[#ffd6e0] p-6">

        {/* 상단 로고 */}
        {!done && (
          <div className="text-center mb-6">
            <span className="text-2xl">🌸</span>
            <span className="text-base font-bold text-[#ff8fab] ml-1">꽃봄</span>
          </div>
        )}

        {done ? (
          <CompleteScreen data={data} />
        ) : (
          <>
            <ProgressBar step={step} onBack={goBack} />

            {/* 애니메이션 없이 단순 조건 렌더 — 필요시 framer-motion 추가 */}
            {step === 1 && <Step1 onSelect={setPreparation} />}
            {step === 2 && <Step2 onSelect={setTreatment} />}
            {step === 3 && (
              <Step3
                cycleLength={data.cycleLength}
                onChange={setCycleLength}
                onComplete={() => setDone(true)}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
