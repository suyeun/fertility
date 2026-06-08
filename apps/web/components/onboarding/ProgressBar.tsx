'use client'

interface ProgressBarProps {
  step: 1 | 2 | 3
  totalSteps: number
  onBack: () => void
}

export function ProgressBar({ step, totalSteps, onBack }: ProgressBarProps) {
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
          {step} / {totalSteps}
        </span>
        <div className="w-10" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              s <= step ? 'bg-[#ff8fab]' : 'bg-[#ffd6e0]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
