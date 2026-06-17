'use client'

import type { TreatmentMode } from '@fertility/shared'
import { MODE_OPTIONS } from '@fertility/shared'

interface Step1Props {
  onSelect: (mode: TreatmentMode) => void
}

export function Step1({ onSelect }: Step1Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#5a3042] mb-1">
        지금 어떻게<br />임신을 준비하고 있나요?
      </h2>
      <p className="text-sm text-[#b07080] mb-6">
        선택에 따라 맞춤 기능을 바로 열어드려요 🌸
      </p>
      <div className="flex flex-col gap-3">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-[#ffd6e0] hover:border-[#ff8fab] hover:bg-[#fff0f4] transition-all text-left group"
          >
            <span
              className="text-3xl w-12 h-12 flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ backgroundColor: `${opt.color}18` }}
            >
              {opt.emoji}
            </span>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#5a3042] group-hover:text-[#c0005a]">
                {opt.label}
              </div>
              <div className="text-xs text-[#b07080] mt-0.5 leading-relaxed">{opt.sub}</div>
            </div>
            <span className="text-[#ffd6e0] group-hover:text-[#ff8fab] text-lg">→</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-[#c4a0ae] text-center mt-4">
        나중에 언제든지 바꿀 수 있어요
      </p>
    </div>
  )
}
