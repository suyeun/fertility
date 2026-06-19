import { View, Text, StyleSheet } from 'react-native'
import { getStageLabelKo } from '@fertility/shared'
import type { TreatmentMode, CurrentStage } from '@fertility/shared'
import { F } from '../../lib/fonts'

interface CycleSummaryProps {
  nextOvulationDate: Date
  nextPeriodDate: Date
  currentCycleDay: number
  cycleLength: number
  formatKorDate: (d: Date) => string
  mode: TreatmentMode
  currentStage: CurrentStage | null
  stageDay: number | null
  upcomingSchedule: { title: string; scheduledAt: string } | null
}

export function CycleSummary({
  nextOvulationDate,
  nextPeriodDate,
  currentCycleDay,
  cycleLength,
  formatKorDate,
  mode,
  currentStage,
  stageDay,
  upcomingSchedule,
}: CycleSummaryProps) {
  if (mode === 'natural') {
    const rows = [
      { label: '다음 배란일', value: formatKorDate(nextOvulationDate) },
      { label: '다음 생리 예정', value: formatKorDate(nextPeriodDate) },
      { label: '사이클 평균', value: `${cycleLength}일` },
      { label: '오늘 사이클', value: `${currentCycleDay}일째` },
    ]
    return (
      <View style={styles.card}>
        <Text style={styles.title}>✨ 이번 달 요약</Text>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
          >
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
          </View>
        ))}
      </View>
    )
  }

  // iui / ivf 모드
  if (!currentStage && !upcomingSchedule) return null

  const stageLabel = currentStage ? getStageLabelKo(mode, currentStage) : '미설정'

  const upcomingDDays = (() => {
    if (!upcomingSchedule) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const schDate = new Date(upcomingSchedule.scheduledAt.split('T')[0] + 'T00:00:00')
    const diff = Math.round((schDate.getTime() - today.getTime()) / 86400000)
    if (diff === 0) return 'D-Day'
    if (diff > 0) return `D-${diff}`
    return `D+${Math.abs(diff)}`
  })()

  const clinicRows = [
    { label: '현재 단계', value: stageLabel },
    { label: '이번 사이클', value: `${stageDay ?? 0}일차` },
    ...(upcomingSchedule && upcomingDDays
      ? [{ label: '다음 일정', value: `${upcomingDDays} ${upcomingSchedule.title}` }]
      : []),
  ]

  return (
    <View style={styles.card}>
      <Text style={styles.title}>📊 치료 요약</Text>
      {clinicRows.map((row, i) => (
        <View
          key={row.label}
          style={[styles.row, i < clinicRows.length - 1 && styles.rowBorder]}
        >
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#ffd6e0',
  },
  title: {
    fontSize: 12,
    fontFamily: F.bold,
    color: '#ff8fab',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#fff0f4',
  },
  label: {
    fontSize: 12,
    fontFamily: F.semiBold,
    color: '#b07080',
  },
  value: {
    fontSize: 12,
    fontFamily: F.bold,
    color: '#5a3042',
  },
})
