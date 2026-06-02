'use client'

import type { TreatmentExperience } from '@fertility/shared'
import { STEP2_OPTIONS } from '@fertility/shared'

interface Step2Props {
  onSelect: (v: TreatmentExperience) => void
}

export function Step2({ onSelect }: Step2Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#5a3042] mb-1">
        병원에서 검사나<br />도움을 받아보셨나요?
      </h2>
      <p className="text-sm text-[#b07080] mb-6">
        해당하는 상황을 선택해 주세요
      </p>
      <div className="flex flex-col gap-3">
        {STEP2_OPTIONS.map((opt) => (
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
