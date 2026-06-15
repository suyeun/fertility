import { TouchableOpacity, Text, View, StyleSheet, Dimensions } from 'react-native'
import type { CalendarDay } from '@fertility/shared'
import { F } from '../../lib/fonts'

interface DayCellProps {
  day: CalendarDay
  isSelected: boolean
  hasIntercourse?: boolean
  hasSchedule?: boolean
  onPress: (date: Date) => void
}

const { width: SCREEN_W } = Dimensions.get('window')
// container margin 12*2=24 + grid paddingHorizontal 12*2=24 = 48px inset
// 7 cells * marginHorizontal 2*2=4px = 28px gap total
export const DAY_CELL_W = Math.floor((SCREEN_W - 48 - 28) / 7)

export function DayCell({ day, isSelected, hasIntercourse, hasSchedule, onPress }: DayCellProps) {
  const { date, dayNum, isCurrentMonth, isToday, cycleInfo } = day

  const isOvulation    = cycleInfo?.isOvulation
  const isMenstruation = cycleInfo?.isMenstruation
  const isFertile      = cycleInfo?.isFertileWindow && !isOvulation

  const cellStyle = [
    styles.cell,
    isOvulation                    && styles.ovulationCell,
    isMenstruation && !isOvulation && styles.periodCell,
    isFertile                      && styles.fertileCell,
    isSelected && !isOvulation     && styles.selectedCell,
    !isCurrentMonth                && styles.otherMonth,
  ]

  const numStyle = [
    styles.num,
    isOvulation                    && styles.ovulationNum,
    isMenstruation && !isOvulation && styles.periodNum,
    isFertile                      && styles.fertileNum,
  ]

  return (
    <TouchableOpacity style={cellStyle} onPress={() => onPress(date)} activeOpacity={0.7}>
      <Text style={numStyle}>{dayNum}</Text>
      {hasIntercourse && <Text style={styles.heart}>❤️</Text>}
      {isToday && <View style={styles.todayDot} />}
      {hasSchedule && <View style={styles.scheduleDot} />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cell: {
    width: DAY_CELL_W,
    height: 40,
    marginHorizontal: 2,
    marginVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ovulationCell: {
    backgroundColor: '#ff8fab',
    borderRadius: 20,
  },
  periodCell: {
    backgroundColor: '#fecdd3',
  },
  fertileCell: {
    backgroundColor: '#ede9fe',
  },
  selectedCell: {
    borderWidth: 2,
    borderColor: '#ff4d7d',
  },
  otherMonth: {
    opacity: 0.3,
  },
  num: {
    fontFamily: F.semiBold,
    fontSize: 13,
    color: '#5a3042',
  },
  ovulationNum: { color: '#fff' },
  periodNum:    { color: '#9f1239' },
  fertileNum:   { color: '#5b21b6' },
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
  scheduleDot: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366f1',
  },
})
