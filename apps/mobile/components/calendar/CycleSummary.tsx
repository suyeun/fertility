import { View, Text, StyleSheet } from 'react-native'

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
    fontWeight: '700',
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
    fontWeight: '500',
    color: '#b07080',
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a3042',
  },
})
