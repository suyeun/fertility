import { TouchableOpacity, Text, View, StyleSheet, Dimensions } from 'react-native'
import type { CalendarDay } from '@fertility/shared'
import { F } from '../../lib/fonts'

interface DayCellProps {
  day: CalendarDay
  isSelected: boolean
  hasIntercourse?: boolean
  markers?: Array<{ color: string; icon?: string }>
  onPress: (date: Date) => void
}

const { width: SCREEN_W } = Dimensions.get('window')
// container marginHorizontal 14*2=28 + grid paddingLeft 12 + paddingRight 16 = 56px inset
// 7 cells * marginHorizontal 2*2=4px = 28px gap total
export const DAY_CELL_W = Math.floor((SCREEN_W - 56 - 28) / 7)

export function DayCell({ day, isSelected, hasIntercourse, markers, onPress }: DayCellProps) {
  const { date, dayNum, isCurrentMonth, isToday, cycleInfo } = day

  const isOvulation    = cycleInfo?.isOvulation
  const isMenstruation = cycleInfo?.isMenstruation
  const isFertile      = cycleInfo?.isFertileWindow && !isOvulation

  const cellStyle = [
    styles.cell,
    isOvulation                    && styles.ovulationCell,
    isMenstruation && !isOvulation && styles.periodCell,
    isFertile                      && styles.fertileCell,
    isSelected                     && styles.selectedCell,
    isToday && !isSelected         && styles.todayCell,
    !isCurrentMonth                && styles.otherMonth,
  ]

  const numStyle = [
    styles.num,
    isOvulation                    && styles.ovulationNum,
    isMenstruation && !isOvulation && styles.periodNum,
    isFertile                      && styles.fertileNum,
    isToday                        && styles.todayNum,
  ]

  // 셀 안에 표시할 뱃지 레이블
  const badge = isOvulation ? '🌸' : isMenstruation ? '생리' : isFertile ? '가임' : null
  const badgeStyle = isOvulation
    ? styles.badgeOvulation
    : isMenstruation
    ? styles.badgePeriod
    : isFertile
    ? styles.badgeFertile
    : null

  return (
    <TouchableOpacity style={cellStyle} onPress={() => onPress(date)} activeOpacity={0.7}>
      {/* 숫자 + 관계일 ❤️ */}
      <View style={styles.topRow}>
        <Text style={numStyle}>{dayNum}</Text>
        {hasIntercourse && <Text style={styles.heart}>❤️</Text>}
      </View>

      {/* 상태 뱃지 (생리/가임/🌸) */}
      {badge && (
        <Text style={[styles.badge, badgeStyle]}>{badge}</Text>
      )}

      {/* 일정 마커 도트 */}
      {markers && markers.length > 0 && (
        <View style={styles.markersRow}>
          {(markers.length <= 3 ? markers : markers.slice(0, 3)).map((marker, idx) =>
            marker.icon ? (
              <Text key={idx} style={[styles.markerIcon, { color: marker.color }]}>{marker.icon}</Text>
            ) : (
              <View key={idx} style={[styles.markerDot, { backgroundColor: marker.color }]} />
            )
          )}
          {markers.length > 3 && (
            <Text style={styles.markerMore}>{markers.length - 3}+</Text>
          )}
        </View>
      )}

      {/* 오늘 표시 점 (뱃지 없는 날만) */}
      {isToday && !badge && !markers?.length && (
        <View style={styles.todayDot} />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cell: {
    width: DAY_CELL_W,
    height: 56,
    marginHorizontal: 2,
    marginVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    paddingBottom: 4,
    position: 'relative',
  },
  ovulationCell: {
    backgroundColor: '#ffe4ec',
    borderWidth: 1,
    borderColor: '#ffb3c6',
  },
  periodCell: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  fertileCell: {
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    borderStyle: 'dashed',
  },
  selectedCell: {
    borderWidth: 2,
    borderColor: '#ff4d7d',
    borderStyle: 'solid',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#ff8fab',
    borderStyle: 'solid',
  },
  otherMonth: {
    opacity: 0.28,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  num: {
    fontFamily: F.semiBold,
    fontSize: 13,
    color: '#5a3042',
    lineHeight: 16,
  },
  ovulationNum: { color: '#be185d', fontFamily: F.bold },
  periodNum:    { color: '#b91c1c', fontFamily: F.bold },
  fertileNum:   { color: '#6d28d9', fontFamily: F.bold },
  todayNum:     { color: '#ff4d7d', fontFamily: F.bold },

  badge: {
    marginTop: 3,
    fontSize: 9,
    fontFamily: F.bold,
    overflow: 'hidden',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    lineHeight: 12,
  },
  badgeOvulation: {
    fontSize: 11,
    backgroundColor: 'transparent',
  },
  badgePeriod: {
    color: '#b91c1c',
    backgroundColor: '#fecaca',
  },
  badgeFertile: {
    color: '#5b21b6',
    backgroundColor: '#ddd6fe',
  },

  heart: {
    fontSize: 7,
    lineHeight: 10,
  },

  todayDot: {
    marginTop: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ff4d7d',
  },

  markersRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  markerIcon: {
    fontSize: 7,
    lineHeight: 8,
  },
  markerMore: {
    fontSize: 5,
    color: '#9ca3af',
    lineHeight: 7,
  },
})
