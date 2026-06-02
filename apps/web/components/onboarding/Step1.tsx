'use client'

import type { TreatmentStage } from '@fertility/shared'
import { STEP1_OPTIONS } from '@fertility/shared'

interface Step1Props {
  onSelect: (v: TreatmentStage) => void
}

export function Step1({ onSelect }: Step1Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#5a3042] mb-1">
        지금 어떤 단계에<br />계세요?
      </h2>
      <p className="text-sm text-[#b07080] mb-6">
        현재 상황에 맞는 기능을 바로 열어드릴게요 🌸
      </p>
      <div className="flex flex-col gap-3">
        {STEP1_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#ffd6e0] hover:border-[#ff8fab] hover:bg-[#fff0f4] transition-all text-left group"
          >
            <span
              className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ backgroundColor: `${opt.color}18` }}
            >
              {opt.emoji}
            </span>
            <div>
              <div className="text-sm font-semibold text-[#5a3042] group-hover:text-[#c0005a]">
                {opt.label}
              </div>
              <div className="text-xs text-[#b07080] mt-0.5">{opt.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
