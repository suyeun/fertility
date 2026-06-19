'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import type { TreatmentMode, CurrentStage, TreatmentSchedule } from '@fertility/shared'
import { getStageLabelKo, getStageProgress, IUI_STAGE_ORDER, IVF_STAGE_ORDER } from '@fertility/shared'

function getDDay(target: Date): string {
  const t = new Date(target)
  t.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.ceil((t.getTime() - now.getTime()) / 86400000)
  if (diff === 0) return 'D-Day'
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`
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

// ── 자연임신 위상 뱃지 ────────────────────────────────────────
const PHASE_BADGE: Record<string, { emoji: string; label: string }> = {
  menstrual:  { emoji: '🔴', label: '생리기' },
  follicular: { emoji: '🟢', label: '난포기' },
  ovulation:  { emoji: '⭐', label: '배란기' },
  luteal:     { emoji: '🟡', label: '황체기' },
}

// ── Props ────────────────────────────────────────────────────
interface HeroCardProps {
  treatmentMode: TreatmentMode
  currentStage: CurrentStage
  phase: string
  phaseLabel: string
  cycleDay: number
  stageDay?: number | null
  tip: string
  dDay: string
  periodDDay: string
  ovulationDate: Date
  isFertileWindow: boolean
  hasCycleData: boolean
  upcomingSchedule: TreatmentSchedule | null
}

export default function HeroCard({
  treatmentMode,
  currentStage,
  phase,
  cycleDay,
  stageDay,
  tip,
  dDay,
  periodDDay,
  ovulationDate,
  isFertileWindow,
  hasCycleData,
  upcomingSchedule,
}: HeroCardProps) {
  const router = useRouter()
  const today = new Date()
  const ovulationLabel = ovulationDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

  // ── 자연임신 — 사이클 데이터 없음 ─────────────────────────
  if (treatmentMode === 'natural' && !hasCycleData) {
    return (
      <div
        className="rounded-[24px] p-5 relative overflow-hidden cursor-pointer"
        style={{ backgroundColor: '#ff8fab' }}
        onClick={() => router.push('/settings')}
      >
        <p className="text-[11px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>🌱 자연임신 준비 중</p>
        <div className="text-[17px] font-bold text-white mb-1">
          생리 시작일을 입력하면 주기를 알려드려요
        </div>
        <div className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.85)' }}>
          생리 정보를 입력하면 사이클을 분석해드려요
        </div>
        <button
          className="rounded-full px-5 py-2.5 text-[13px] font-bold cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.9)', color: '#5a3042' }}
        >
          생리 정보 입력하러 가기 →
        </button>
      </div>
    )
  }

  // ── 자연임신 — 사이클 있음 ─────────────────────────────────
  if (treatmentMode === 'natural') {
    const badge = PHASE_BADGE[phase] ?? PHASE_BADGE.follicular
    const isGaim = isFertileWindow && phase === 'follicular'
    const badgeLabel = isGaim ? '🟢 가임기' : `${badge.emoji} ${badge.label}`

    let dDayText: string
    let dDayLabel: string
    if (phase === 'menstrual') {
      dDayText = `${cycleDay}일차`
      dDayLabel = '생리'
    } else if (phase === 'ovulation') {
      dDayText = '오늘 🌟'
      dDayLabel = '배란 예정일'
    } else if (phase === 'luteal') {
      dDayText = periodDDay
      dDayLabel = '생리 예정'
    } else {
      dDayText = dDay
      dDayLabel = '배란까지'
    }

    return (
      <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ backgroundColor: '#ff8fab' }}>
        {/* D-Day 뱃지 */}
        <div className="absolute top-5 right-5 text-right">
          <p className="text-[10px] leading-none mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{dDayLabel}</p>
          <p className="text-[18px] font-bold text-white leading-tight">{dDayText}</p>
        </div>

        <p className="text-[11px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>🌱 자연임신 준비 중</p>

        {/* 위상 뱃지 */}
        <span
          className="inline-block px-3 py-1 rounded-full text-[13px] font-bold text-white mb-2"
          style={{ background: 'rgba(255,255,255,0.25)' }}
        >
          {badgeLabel}
        </span>

        <div className="text-[12px] mb-3 pr-24" style={{ color: 'rgba(255,255,255,0.85)' }}>
          사이클 {cycleDay}일째
        </div>

        <div className="rounded-2xl px-4 py-3 text-[12px] text-white leading-relaxed" style={{ background: 'rgba(255,255,255,0.2)' }}>
          {tip}
        </div>

        {(isFertileWindow || phase === 'ovulation') && (
          <div className="mt-2.5 rounded-2xl px-4 py-2.5 text-[11px] text-white font-semibold flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.18)' }}>
            💗 지금은 가임기! 오늘 타이밍을 놓치지 마세요
          </div>
        )}
      </div>
    )
  }

  // ── IUI / IVF — 단계 미설정 ────────────────────────────────
  if (currentStage === null) {
    const modeLabel = treatmentMode === 'iui' ? 'IUI 인공수정' : 'IVF 시험관'
    const modeIcon  = treatmentMode === 'iui' ? '💉' : '🔬'
    return (
      <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ backgroundColor: '#c084fc' }}>
        <p className="text-[11px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {modeIcon} {modeLabel}
        </p>
        <div className="text-[20px] font-bold text-white mb-1">치료 단계를 설정해주세요</div>
        <div className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.85)' }}>
          단계를 설정하면 맞춤 정보를 드려요
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
  const bgColor    = treatmentMode === 'iui' ? '#a855f7' : '#7c3aed'
  const stageLabel = getStageLabelKo(treatmentMode, currentStage)
  const modeLabel  = treatmentMode === 'iui' ? 'IUI 인공수정' : 'IVF 시험관'
  const modeIcon   = treatmentMode === 'iui' ? '💉' : '🔬'

  return (
    <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="absolute top-5 right-5 text-right">
        <p className="text-[10px] leading-none mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>치료 중</p>
        <p className="text-[18px] font-bold text-white">{stageDay ?? 1}일</p>
      </div>

      <p className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{modeIcon} {modeLabel}</p>
      <div className="text-[22px] font-bold text-white mb-1 pr-20">{stageLabel}</div>

      <StageProgressBar mode={treatmentMode} stage={currentStage} />

      {upcomingSchedule && (
        <div className="mt-3 rounded-2xl px-4 py-2.5 text-[12px] text-white leading-relaxed flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.15)' }}>
          📅 {upcomingSchedule.title}까지 {getDDay(new Date(upcomingSchedule.scheduledAt))}
        </div>
      )}

      <div className="mt-2 rounded-2xl px-4 py-3 text-[12px] text-white leading-relaxed" style={{ background: 'rgba(255,255,255,0.15)' }}>
        {tip}
      </div>
    </div>
  )
}
