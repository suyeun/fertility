'use client'

import React from 'react'
import type { UserMode } from '@fertility/shared'

const PHASE_EMOJI: Record<string, string> = {
  menstrual: '🌷',
  follicular: '🌱',
  ovulation: '🌸',
  luteal: '✨',
}

// 임신 확률 단계 (자연임신 모드)
function fertilityDots(phase: string, isFertileWindow: boolean) {
  if (isFertileWindow) return { dots: 4, label: '높음 🔥', color: '#ef4444' }
  if (phase === 'ovulation') return { dots: 5, label: '매우 높음 🔥', color: '#dc2626' }
  if (phase === 'follicular') return { dots: 2, label: '보통', color: '#f97316' }
  return { dots: 1, label: '낮음', color: '#94a3b8' }
}

interface HeroCardProps {
  mode: UserMode
  phase: string
  phaseLabel: string
  cycleDay: number
  tip: string
  dDay: string
  ovulationDate: Date
  isFertileWindow: boolean
  treatmentStage?: string
}

export default function HeroCard({
  mode,
  phase,
  phaseLabel,
  cycleDay,
  tip,
  dDay,
  ovulationDate,
  isFertileWindow,
  treatmentStage,
}: HeroCardProps) {
  const today = new Date()
  const dateLabel = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  const ovulationLabel = ovulationDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

  if (mode === 'NATURAL') {
    const { dots, label, color } = fertilityDots(phase, isFertileWindow)

    return (
      <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ backgroundColor: '#ff8fab' }}>
        {/* 배란 D-Day */}
        <div className="absolute top-5 right-5 text-right">
          <p className="text-[10px] leading-none mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>배란 예정일</p>
          <p className="text-[17px] font-bold text-white leading-tight">{ovulationLabel}</p>
          <span className="inline-block mt-1.5 text-[11px] font-bold text-white rounded-full px-2.5 py-0.5" style={{ background: 'rgba(255,255,255,0.28)' }}>
            {dDay}
          </span>
        </div>

        {/* 사이클 상태 */}
        <p className="text-[11px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>오늘의 사이클 상태</p>
        <div className="text-[24px] font-semibold text-white mb-1 pr-28">
          {PHASE_EMOJI[phase]} {phaseLabel}
        </div>
        <div className="text-[12px] mb-3 pr-24" style={{ color: 'rgba(255,255,255,0.85)' }}>
          사이클 {cycleDay}일째 · {dateLabel}
        </div>

        {/* 임신 확률 시각화 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] text-white/80">오늘 임신 확률</span>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: i <= dots ? color : 'rgba(255,255,255,0.25)' }}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-white">{label}</span>
        </div>

        {/* 팁 */}
        <div className="rounded-2xl px-4 py-3 text-[12px] text-white leading-relaxed" style={{ background: 'rgba(255,255,255,0.2)' }}>
          {tip}
        </div>

        {/* 가임기 강조 */}
        {isFertileWindow && (
          <div className="mt-2.5 rounded-2xl px-4 py-2.5 text-[11px] text-white font-semibold flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.18)' }}>
            💗 지금은 가임기! 오늘 타이밍을 놓치지 마세요
          </div>
        )}
      </div>
    )
  }

  // ── CLINIC 모드 ──
  const STAGE_STEPS: Record<string, string[]> = {
    ivf: ['과배란 유도', '난자 채취', '수정·배양', '이식', '황체기 대기', '임신 확인'],
    iui: ['배란 유도', '타이밍 맞추기', '인공수정', '황체기 대기', '임신 확인'],
    fet: ['자궁내막 준비', '이식일 결정', '배아 이식', '황체기 대기', '임신 확인'],
  }
  const steps = STAGE_STEPS[treatmentStage ?? 'ivf'] ?? STAGE_STEPS.ivf
  const STAGE_LABEL: Record<string, string> = { ivf: 'IVF 시험관', iui: 'IUI 인공수정', fet: 'FET 동결이식' }

  return (
    <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ backgroundColor: '#8b5cf6' }}>
      {/* 채취/이식 D-Day */}
      <div className="absolute top-5 right-5 text-right">
        <p className="text-[10px] leading-none mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>다음 일정</p>
        <p className="text-[17px] font-bold text-white leading-tight">{ovulationLabel}</p>
        <span className="inline-block mt-1.5 text-[11px] font-bold text-white rounded-full px-2.5 py-0.5" style={{ background: 'rgba(255,255,255,0.28)' }}>
          {dDay}
        </span>
      </div>

      <p className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>현재 시술</p>
      <div className="text-[22px] font-bold text-white mb-1 pr-28">
        🧬 {STAGE_LABEL[treatmentStage ?? 'ivf']}
      </div>
      <div className="text-[12px] mb-4 pr-24" style={{ color: 'rgba(255,255,255,0.85)' }}>
        사이클 {cycleDay}일째 · {dateLabel}
      </div>

      {/* 시술 타임라인 */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div
              className="text-[9px] font-bold px-2 py-1 rounded-full whitespace-nowrap shrink-0"
              style={{
                background: i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                color: i === 0 ? '#7c3aed' : 'rgba(255,255,255,0.85)',
              }}
            >
              {step}
            </div>
            {i < steps.length - 1 && (
              <span className="text-white/40 text-[10px] shrink-0">›</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 팁 */}
      <div className="mt-3 rounded-2xl px-4 py-3 text-[12px] text-white leading-relaxed" style={{ background: 'rgba(255,255,255,0.15)' }}>
        {tip}
      </div>
    </div>
  )
}
