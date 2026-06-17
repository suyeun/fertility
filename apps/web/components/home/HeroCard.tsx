'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import type { TreatmentMode, CurrentStage } from '@fertility/shared'
import { getStageLabelKo } from '@fertility/shared'
import { getStageProgress, IUI_STAGE_ORDER, IVF_STAGE_ORDER } from '@fertility/shared'

// ── 임신 확률 도트 ───────────────────────────────────────────
function fertilityDots(phase: string, isFertileWindow: boolean) {
  if (isFertileWindow || phase === 'ovulation') return { dots: 5, label: '매우 높음 🔥', color: '#ef4444' }
  if (phase === 'follicular') return { dots: 2, label: '보통', color: '#f97316' }
  return { dots: 1, label: '낮음', color: '#94a3b8' }
}

const PHASE_EMOJI: Record<string, string> = {
  menstrual: '🌷', follicular: '🌱', ovulation: '🌸', luteal: '✨',
}

// ── D-Day 뱃지 ──────────────────────────────────────────────
function DayBadge({ label, date, dday }: { label: string; date: string; dday: string }) {
  return (
    <div className="absolute top-5 right-5 text-right">
      <p className="text-[10px] leading-none mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</p>
      <p className="text-[15px] font-bold text-white leading-tight">{date}</p>
      <span className="inline-block mt-1.5 text-[11px] font-bold text-white rounded-full px-2.5 py-0.5" style={{ background: 'rgba(255,255,255,0.28)' }}>
        {dday}
      </span>
    </div>
  )
}

// ── 단계 진행 바 ─────────────────────────────────────────────
function StageProgressBar({ mode, stage }: { mode: TreatmentMode; stage: CurrentStage }) {
  const { index, total } = getStageProgress(mode, stage)
  const order = mode === 'iui' ? IUI_STAGE_ORDER : IVF_STAGE_ORDER
  return (
    <div className="flex items-center gap-1 mt-2">
      {order.map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full flex-1 transition-all"
          style={{ backgroundColor: i <= index ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)' }}
        />
      ))}
    </div>
  )
}

// ── Props ────────────────────────────────────────────────────
interface HeroCardProps {
  treatmentMode: TreatmentMode
  currentStage: CurrentStage
  phase: string
  phaseLabel: string
  cycleDay: number
  tip: string
  dDay: string
  ovulationDate: Date
  isFertileWindow: boolean
}

export default function HeroCard({
  treatmentMode,
  currentStage,
  phase,
  phaseLabel,
  cycleDay,
  tip,
  dDay,
  ovulationDate,
  isFertileWindow,
}: HeroCardProps) {
  const router = useRouter()
  const today = new Date()
  const dateLabel = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  const ovulationLabel = ovulationDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

  // ── 자연임신 ───────────────────────────────────────────────
  if (treatmentMode === 'natural') {
    const { dots, label, color } = fertilityDots(phase, isFertileWindow)
    return (
      <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ backgroundColor: '#ff8fab' }}>
        <DayBadge label="배란 예정일" date={ovulationLabel} dday={dDay} />

        <p className="text-[11px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>오늘의 사이클 상태</p>
        <div className="text-[24px] font-semibold text-white mb-1 pr-28">
          {PHASE_EMOJI[phase]} {phaseLabel}
        </div>
        <div className="text-[12px] mb-3 pr-24" style={{ color: 'rgba(255,255,255,0.85)' }}>
          사이클 {cycleDay}일째 · {dateLabel}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] text-white/80">오늘 임신 확률</span>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: i <= dots ? color : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
          <span className="text-[11px] font-bold text-white">{label}</span>
        </div>

        <div className="rounded-2xl px-4 py-3 text-[12px] text-white leading-relaxed" style={{ background: 'rgba(255,255,255,0.2)' }}>
          {tip}
        </div>

        {isFertileWindow && (
          <div className="mt-2.5 rounded-2xl px-4 py-2.5 text-[11px] text-white font-semibold flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.18)' }}>
            💗 지금은 가임기! 오늘 타이밍을 놓치지 마세요
          </div>
        )}
      </div>
    )
  }

  // ── IUI / IVF — 단계 미설정 ────────────────────────────────
  if (currentStage === null) {
    return (
      <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ backgroundColor: '#c084fc' }}>
        <p className="text-[11px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {treatmentMode === 'iui' ? 'IUI 인공수정' : 'IVF 시험관'}
        </p>
        <div className="text-[20px] font-bold text-white mb-1">🌸 치료 단계를 설정해주세요</div>
        <div className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.85)' }}>
          현재 단계를 등록하면 맞춤 일정을 알려드려요
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="rounded-full px-5 py-2.5 text-[13px] font-bold text-[#7c3aed] cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          지금 설정하기 →
        </button>
      </div>
    )
  }

  // ── IUI / IVF — 단계 설정됨 ────────────────────────────────
  const bgColor = treatmentMode === 'iui' ? '#a855f7' : '#7c3aed'
  const stageLabel = getStageLabelKo(treatmentMode, currentStage)
  const modeLabel  = treatmentMode === 'iui' ? 'IUI 인공수정' : 'IVF 시험관'

  return (
    <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ backgroundColor: bgColor }}>
      <p className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{modeLabel} · {dateLabel}</p>
      <div className="text-[22px] font-bold text-white mb-1 pr-20">🧬 {stageLabel}</div>
      <div className="text-[12px] mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
        사이클 {cycleDay}일째
      </div>

      {/* 단계 진행 바 */}
      <StageProgressBar mode={treatmentMode} stage={currentStage} />

      {/* 팁 */}
      <div className="mt-3 rounded-2xl px-4 py-3 text-[12px] text-white leading-relaxed" style={{ background: 'rgba(255,255,255,0.15)' }}>
        {tip}
      </div>
    </div>
  )
}
