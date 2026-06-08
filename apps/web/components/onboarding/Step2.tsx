'use client'

import type { TreatmentStage } from '@fertility/shared'
import { CLINIC_STAGE_OPTIONS } from '@fertility/shared'

interface Step2Props {
  onSelect: (stage: TreatmentStage) => void
}

// Step 2: CLINIC 모드 전용 — 시술 단계 선택
export function Step2({ onSelect }: Step2Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#5a3042] mb-1">
        어떤 시술을<br />진행 중이세요?
      </h2>
      <p className="text-sm text-[#b07080] mb-6">
        시술 단계에 맞는 기록·알림 기능을 열어드릴게요
      </p>
      <div className="flex flex-col gap-3">
        {CLINIC_STAGE_OPTIONS.map((opt) => (
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
