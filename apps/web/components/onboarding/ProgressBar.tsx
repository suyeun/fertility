'use client'

interface ProgressBarProps {
  step: 1 | 2 | 3
  onBack: () => void
}

const STEPS = ['임신 준비 기간', '병원 경험', '생리 주기']

export function ProgressBar({ step, onBack }: ProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          className={`text-[#ff8fab] text-sm font-semibold transition-opacity ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
        >
          ← 이전
        </button>
        <span className="text-xs text-[#b07080] font-medium">
          {step} / 3
        </span>
        <div className="w-10" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              s <= step ? 'bg-[#ff8fab]' : 'bg-[#ffd6e0]'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-[#b07080] mt-2 text-center font-medium">
        {STEPS[step - 1]}
      </p>
    </div>
  )
}
