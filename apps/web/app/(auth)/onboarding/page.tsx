'use client'

import { useOnboarding } from '@fertility/shared'
import { ProgressBar } from '../../../components/onboarding/ProgressBar'
import { Step1 } from '../../../components/onboarding/Step1'
import { Step2 } from '../../../components/onboarding/Step2'
import { CompleteScreen } from '../../../components/onboarding/CompleteScreen'
import { useState } from 'react'

export default function OnboardingPage() {
  const {
    step, data,
    setStage, setCycleLength, goBack,
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
            <ProgressBar step={step} onBack={goBack} />

            {step === 1 && (
              <Step1 onSelect={setStage} />
            )}
            {step === 2 && (
              <Step2
                stage={data.treatmentStage}
                cycleLength={data.cycleLength}
                onChange={setCycleLength}
                onNext={() => setDone(true)}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
