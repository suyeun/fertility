'use client'

interface CycleSummaryProps {
  nextOvulationDate: Date
  nextPeriodDate: Date
  currentCycleDay: number
  cycleLength: number
  formatKorDate: (d: Date) => string
}

export function CycleSummary({
  nextOvulationDate,
  nextPeriodDate,
  currentCycleDay,
  cycleLength,
  formatKorDate,
}: CycleSummaryProps) {
  const rows = [
    { label: '다음 배란일', value: formatKorDate(nextOvulationDate) },
    { label: '다음 생리 예정', value: formatKorDate(nextPeriodDate) },
    { label: '사이클 평균', value: `${cycleLength}일` },
    { label: '오늘 사이클', value: `${currentCycleDay}일째` },
  ]

  return (
    <div className="mx-3 mb-4 bg-white rounded-2xl p-4 border border-[#ffd6e0]">
      <div className="flex items-center gap-1.5 text-[#ff8fab] text-xs font-bold mb-3">
        <span>✨</span>
        <span>이번 달 요약</span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={`flex justify-between items-center py-1.5 text-xs ${
            i < rows.length - 1 ? 'border-b border-[#fff0f4]' : ''
          }`}
        >
          <span className="text-[#b07080] font-medium">{row.label}</span>
          <span className="text-[#5a3042] font-bold">{row.value}</span>
        </div>
      ))}
    </div>
  )
}
