'use client'

import React from 'react'

interface HeroCardProps {
  phase: string
  phaseLabel: string
  cycleDay: number
  tip: string
  dDay: string
  ovulationDate: Date
  isFertileWindow: boolean
}

const PHASE_EMOJI: Record<string, string> = {
  menstrual: '🌷',
  follicular: '🌱',
  ovulation: '🌸',
  luteal: '✨',
}

export default function HeroCard({
  phase,
  phaseLabel,
  cycleDay,
  tip,
  dDay,
  ovulationDate,
  isFertileWindow,
}: HeroCardProps) {
  const today = new Date()
  const dateLabel = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  const ovulationLabel = ovulationDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

  return (
    <div
      className="rounded-[24px] p-5 relative overflow-hidden"
      style={{ backgroundColor: '#ff8fab' }}
    >
      {/* 배란 예정일 + D-day (우측 상단) */}
      <div className="absolute top-5 right-5 text-right">
        <p className="text-[10px] leading-none mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
          배란 예정일
        </p>
        <p className="text-[17px] font-bold text-white leading-tight">
          {ovulationLabel}
        </p>
        <span
          className="inline-block mt-1.5 text-[11px] font-bold text-white rounded-full px-2.5 py-0.5"
          style={{ background: 'rgba(255,255,255,0.28)' }}
        >
          {dDay}
        </span>
      </div>

      {/* 왼쪽 — 사이클 상태 */}
      <p className="text-[11px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
        오늘의 사이클 상태
      </p>
      <div className="text-[24px] font-semibold text-white mb-1 pr-28">
        {PHASE_EMOJI[phase]} {phaseLabel}
      </div>
      <div className="text-[12px] mb-4 pr-24" style={{ color: 'rgba(255,255,255,0.85)' }}>
        사이클 {cycleDay}일째 · {dateLabel}
      </div>

      {/* 오늘의 팁 */}
      <div
        className="rounded-2xl px-4 py-3 text-[12px] text-white leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      >
        {tip}
      </div>

      {/* 가임기 알림 */}
      {isFertileWindow && (
        <div
          className="mt-2.5 rounded-2xl px-4 py-2.5 text-[11px] text-white font-semibold flex items-center gap-1.5"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          {'💗 지금은 가임기입니다! 기쁜 마음으로 임신을 준비해 보세요.'}
        </div>
      )}
    </div>
  )
}
