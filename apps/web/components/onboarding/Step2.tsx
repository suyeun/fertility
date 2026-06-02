'use client'

import { CYCLE_GUIDE } from '@fertility/shared'
import type { TreatmentStage } from '@fertility/shared'

interface Step2Props {
  stage: TreatmentStage | null
  cycleLength: number
  onChange: (v: number) => void
  onNext: () => void
}

export function Step2({ stage, cycleLength, onChange, onNext }: Step2Props) {
  const guide = stage ? CYCLE_GUIDE[stage] : '평균 생리 주기를 입력해 주세요'

  return (
    <div>
      <h2 className="text-xl font-bold text-[#5a3042] mb-1">
        생리 주기가<br />며칠인가요?
      </h2>
      <p className="text-sm text-[#b07080] mb-6">{guide}</p>

      {/* 주기 길이 선택 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between bg-white rounded-2xl border border-[#ffd6e0] p-5">
          <button
            onClick={() => onChange(Math.max(21, cycleLength - 1))}
            className="w-10 h-10 rounded-xl bg-[#fff0f4] text-[#ff8fab] text-xl font-bold flex items-center justify-center hover:bg-[#ffd6e0] transition-all active:scale-95"
          >
            −
          </button>
          <div className="text-center">
            <span className="text-4xl font-bold text-[#5a3042]">{cycleLength}</span>
            <span className="text-base text-[#b07080] ml-1">일</span>
          </div>
          <button
            onClick={() => onChange(Math.min(45, cycleLength + 1))}
            className="w-10 h-10 rounded-xl bg-[#fff0f4] text-[#ff8fab] text-xl font-bold flex items-center justify-center hover:bg-[#ffd6e0] transition-all active:scale-95"
          >
            +
          </button>
        </div>

        {/* 빠른 선택 */}
        <div className="grid grid-cols-4 gap-2">
          {[24, 26, 28, 30, 32, 35, 38, 40].map(n => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                cycleLength === n
                  ? 'bg-[#ff8fab] text-white'
                  : 'bg-white border border-[#ffd6e0] text-[#b07080] hover:border-[#ff8fab]'
              }`}
            >
              {n}일
            </button>
          ))}
        </div>

        <p className="text-xs text-[#c4a0ae] text-center">
          정확하지 않아도 괜찮아요 — 나중에 언제든지 수정할 수 있어요
        </p>

        <button
          onClick={onNext}
          className="w-full py-4 bg-[#ff8fab] text-white rounded-2xl font-bold text-base shadow-sm hover:bg-[#ff7096] transition-all active:scale-[0.98]"
        >
          다음 →
        </button>
      </div>
    </div>
  )
}
