'use client'

import type { TreatmentMode, CurrentStage } from '@fertility/shared'
import { IUI_STAGE_OPTIONS, IVF_STAGE_OPTIONS } from '@fertility/shared'

interface Step2Props {
  treatmentMode: TreatmentMode
  onSelect: (stage: CurrentStage) => void
}

export function Step2({ treatmentMode, onSelect }: Step2Props) {
  const options = treatmentMode === 'iui' ? IUI_STAGE_OPTIONS : IVF_STAGE_OPTIONS
  const title = treatmentMode === 'iui' ? '인공수정(IUI)' : '시험관(IVF)'

  return (
    <div>
      <h2 className="text-xl font-bold text-[#5a3042] mb-1">
        {title} 치료<br />어느 단계인가요?
      </h2>
      <p className="text-sm text-[#b07080] mb-5">
        단계에 맞는 기록·알림 기능을 열어드릴게요
      </p>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const isUnknown = opt.value === null
          return (
            <button
              key={i}
              onClick={() => onSelect(opt.value)}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group
                ${isUnknown
                  ? 'border-dashed border-[#e0c0c8] hover:border-[#ff8fab] hover:bg-[#fff0f4]'
                  : 'border border-[#ffd6e0] hover:border-[#ff8fab] hover:bg-[#fff0f4]'
                }`}
            >
              <span className="text-xl w-9 h-9 flex items-center justify-center rounded-xl bg-[#fff0f4] flex-shrink-0">
                {opt.emoji}
              </span>
              <span className={`text-sm font-semibold group-hover:text-[#c0005a]
                ${isUnknown ? 'text-[#b07080]' : 'text-[#5a3042]'}`}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
