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
    step, displayStep, data, totalSteps,
    selectMode, setCurrentStage, setCycleLength, goBack,
  } = useOnboarding()
  const [done, setDone] = useState(false)

  return (
    <main className="min-h-screen bg-[#fff8f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-[#ffd6e0] p-6">

        {!done && (
          <div className="text-center mb-6">
            <span className="text-2xl">🌸</span>
            <span className="text-base font-bold text-[#ff8fab] ml-1">BOM</span>
          </div>
        )}

        {done ? (
          <CompleteScreen data={data} />
        ) : (
          <>
            <ProgressBar step={displayStep} totalSteps={totalSteps} onBack={goBack} />

            {/* Step 1: 모드 선택 (자연임신 / IUI / IVF) */}
            {step === 1 && (
              <Step1 onSelect={selectMode} />
            )}

            {/* Step 2: 시술 단계 선택 (iui/ivf 전용) */}
            {step === 2 && data.treatmentMode && data.treatmentMode !== 'natural' && (
              <Step2
                treatmentMode={data.treatmentMode}
                onSelect={setCurrentStage}
              />
            )}

            {/* Step 3: 주기 입력 */}
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
