'use client'

import type { CalendarDay } from '@fertility/shared'

interface DayCellProps {
  day: CalendarDay
  isSelected: boolean
  onClick: (date: Date) => void
}

const phaseStyles: Record<string, string> = {
  menstrual: 'bg-[#ffd6e0] text-[#c0005a]',
  ovulation: 'bg-[#ff8fab] text-white rounded-full',
  follicular: '',
  luteal: '',
}

const fertileBg = 'bg-[#fce4f5] text-[#8e0070]'

export function DayCell({ day, isSelected, onClick }: DayCellProps) {
  const { date, dayNum, isCurrentMonth, isToday, cycleInfo } = day

  const isOvulation = cycleInfo?.isOvulation
  const isMenstruation = cycleInfo?.isMenstruation
  const isFertile = cycleInfo?.isFertileWindow && !isOvulation

  let cellClass =
    'relative flex flex-col items-center justify-center h-10 w-full rounded-xl cursor-pointer transition-transform hover:scale-110 select-none '

  if (!isCurrentMonth) cellClass += 'opacity-30 '

  if (isOvulation) {
    cellClass += 'bg-[#ff8fab] rounded-full '
  } else if (isMenstruation) {
    cellClass += 'bg-[#ffd6e0] rounded-xl '
  } else if (isFertile) {
    cellClass += 'bg-[#fce4f5] rounded-xl '
  }

  if (isSelected && !isOvulation) cellClass += 'ring-2 ring-[#ff4d7d] ring-offset-1 '

  let numClass = 'text-[13px] font-semibold '
  if (isOvulation) numClass += 'text-white '
  else if (isMenstruation) numClass += 'text-[#c0005a] '
  else if (isFertile) numClass += 'text-[#8e0070] '
  else numClass += 'text-[#5a3042] '

  if (isToday) numClass += 'underline decoration-[#ff4d7d] decoration-2 underline-offset-2 '

  return (
    <div
      className={cellClass}
      onClick={() => onClick(date)}
      role="button"
      aria-label={`${dayNum}일${isOvulation ? ' 배란일' : ''}${isMenstruation ? ' 생리' : ''}${isFertile ? ' 가임기' : ''}`}
    >
      <span className={numClass}>{dayNum}</span>
      {isToday && (
        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#ff4d7d]" />
      )}
    </div>
  )
}
