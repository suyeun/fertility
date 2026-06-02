'use client'

import type { PreparationDuration } from '@fertility/shared'
import { STEP1_OPTIONS } from '@fertility/shared'

interface Step1Props {
  onSelect: (v: PreparationDuration) => void
}

export function Step1({ onSelect }: Step1Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#5a3042] mb-1">
        임신 준비를<br />얼마나 하셨나요?
      </h2>
      <p className="text-sm text-[#b07080] mb-6">
        솔직하게 알려주시면 딱 맞는 기능을 드릴게요 🌸
      </p>
      <div className="flex flex-col gap-3">
        {STEP1_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#ffd6e0] hover:border-[#ff8fab] hover:bg-[#fff0f4] transition-all text-left group"
          >
            <span className="text-2xl w-10 text-center">{opt.emoji}</span>
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
