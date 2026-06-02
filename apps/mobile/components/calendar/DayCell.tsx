import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import type { CalendarDay } from '@fertility/shared'

interface DayCellProps {
  day: CalendarDay
  isSelected: boolean
  hasIntercourse?: boolean
  onPress: (date: Date) => void
}

export function DayCell({ day, isSelected, hasIntercourse, onPress }: DayCellProps) {
  const { date, dayNum, isCurrentMonth, isToday, cycleInfo } = day

  const isOvulation = cycleInfo?.isOvulation
  const isMenstruation = cycleInfo?.isMenstruation
  const isFertile = cycleInfo?.isFertileWindow && !isOvulation

  const cellStyle = [
    styles.cell,
    isOvulation && styles.ovulationCell,
    isMenstruation && !isOvulation && styles.periodCell,
    isFertile && styles.fertileCell,
    isSelected && !isOvulation && styles.selectedCell,
    !isCurrentMonth && styles.otherMonth,
  ]

  const numStyle = [
    styles.num,
    isOvulation && styles.ovulationNum,
    isMenstruation && !isOvulation && styles.periodNum,
    isFertile && styles.fertileNum,
  ]

  return (
    <TouchableOpacity style={cellStyle} onPress={() => onPress(date)} activeOpacity={0.7}>
      <Text style={numStyle}>{dayNum}</Text>
      {hasIntercourse && (
        <Text style={styles.heart}>❤️</Text>
      )}
      {isToday && <View style={styles.todayDot} />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cell: {
    height: 40,
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    position: 'relative',
  },
  ovulationCell: {
    backgroundColor: '#ff8fab',
    borderRadius: 20,
  },
  periodCell: {
    backgroundColor: '#ffd6e0',
  },
  fertileCell: {
    backgroundColor: '#fce4f5',
  },
  selectedCell: {
    borderWidth: 2,
    borderColor: '#ff4d7d',
  },
  otherMonth: {
    opacity: 0.3,
  },
  num: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5a3042',
  },
  ovulationNum: { color: '#fff' },
  periodNum: { color: '#c0005a' },
  fertileNum: { color: '#8e0070' },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ff4d7d',
  },
  heart: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 7,
  },
})
