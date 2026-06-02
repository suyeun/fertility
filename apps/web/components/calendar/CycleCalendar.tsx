'use client'

import { useCycleCalendar } from '@fertility/shared'
import { DayCell } from './DayCell'
import { CycleSummary } from './CycleSummary'
import { MoodPicker } from './MoodPicker'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const LEGEND = [
  { color: '#ffd6e0', label: '생리' },
  { color: '#fce4f5', label: '가임기' },
  { color: '#ff8fab', label: '배란일' },
]

interface CycleCalendarProps {
  lastPeriodStart?: Date
  cycleLength?: number
  periodLength?: number
}

export function CycleCalendar({
  lastPeriodStart = new Date(2025, 3, 27),
  cycleLength = 28,
  periodLength = 5,
}: CycleCalendarProps) {
  const {
    currentYear,
    currentMonth,
    calendarDays,
    selectedDate,
    selectedMood,
    nextOvulationDate,
    nextPeriodDate,
    currentCycleDay,
    todayPhaseLabel,
    goToPrevMonth,
    goToNextMonth,
    selectDate,
    selectMood,
    formatKorDate,
  } = useCycleCalendar(lastPeriodStart, cycleLength, periodLength)

  return (
    <div className="bg-[#fff8f9] rounded-[28px] overflow-hidden border border-[#f9c6d0] max-w-sm mx-auto">

      {/* 헤더 */}
      <div className="bg-[#ff8fab] px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPrevMonth}
            aria-label="이전 달"
            className="w-8 h-8 rounded-full bg-white/25 text-white flex items-center justify-center hover:bg-white/40 transition-colors"
          >
            ‹
          </button>
          <h2 className="text-white text-lg font-bold tracking-tight">
            {currentYear}년 {currentMonth + 1}월
          </h2>
          <button
            onClick={goToNextMonth}
            aria-label="다음 달"
            className="w-8 h-8 rounded-full bg-white/25 text-white flex items-center justify-center hover:bg-white/40 transition-colors"
          >
            ›
          </button>
        </div>
        <div className="inline-flex items-center gap-2 bg-white/25 rounded-full px-3 py-1.5 text-white text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-white" />
          {todayPhaseLabel}
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center px-3 mt-3 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[11px] font-bold text-[#ff8fab] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-0.5 px-3 pb-4">
        {calendarDays.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            isSelected={
              selectedDate?.getTime() === day.date.getTime()
            }
            onClick={selectDate}
          />
        ))}
      </div>

      {/* 범례 */}
      <div className="flex justify-center gap-4 px-4 pb-4">
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8c5060]">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* 요약 카드 */}
      <CycleSummary
        nextOvulationDate={nextOvulationDate}
        nextPeriodDate={nextPeriodDate}
        currentCycleDay={currentCycleDay}
        cycleLength={cycleLength}
        formatKorDate={formatKorDate}
      />

      {/* 기분 선택 */}
      <MoodPicker selected={selectedMood} onSelect={selectMood} />

    </div>
  )
}
