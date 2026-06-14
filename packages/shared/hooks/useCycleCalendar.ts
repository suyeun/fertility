'use client'

import { useState, useMemo } from 'react'
import type { CycleDay, Mood } from '../types'
import {
  calculateCycleDays,
  getNextOvulationDate,
  getNextPeriodDate,
  getCurrentCycleDay,
} from '../lib/cycle'

export interface CalendarDay {
  date: Date
  dayNum: number
  isCurrentMonth: boolean
  isToday: boolean
  cycleInfo?: CycleDay
}

export interface UseCycleCalendarReturn {
  currentYear: number
  currentMonth: number
  calendarDays: CalendarDay[]
  selectedDate: Date | null
  selectedMood: Mood | null
  nextOvulationDate: Date
  nextPeriodDate: Date
  currentCycleDay: number
  todayPhaseLabel: string
  goToPrevMonth: () => void
  goToNextMonth: () => void
  selectDate: (date: Date) => void
  selectMood: (mood: Mood) => void
  formatKorDate: (date: Date) => string
}

export function useCycleCalendar(
  lastPeriodStart: Date | null,
  cycleLength = 28,
  periodLength = 5
): UseCycleCalendarReturn {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [viewDate, setViewDate] = useState(new Date(today))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null)

  const cycleDays = useMemo(
    () => lastPeriodStart
      ? calculateCycleDays(lastPeriodStart, cycleLength, periodLength, 120)
      : [],
    [lastPeriodStart, cycleLength, periodLength]
  )

  const cycleDayMap = useMemo(() => {
    const map = new Map<string, CycleDay>()
    cycleDays.forEach((d) => map.set(d.date, d))
    return map
  }, [cycleDays])

  const calendarDays = useMemo(() => {
    const y = viewDate.getFullYear()
    const m = viewDate.getMonth()
    const firstOfMonth = new Date(y, m, 1)
    const startDow = firstOfMonth.getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const prevMonthDays = new Date(y, m, 0).getDate()

    const days: CalendarDay[] = []

    // 이전 달 채우기
    for (let i = startDow - 1; i >= 0; i--) {
      const date = new Date(y, m - 1, prevMonthDays - i)
      date.setHours(0, 0, 0, 0)
      const key = date.toISOString().split('T')[0]
      days.push({
        date,
        dayNum: date.getDate(),
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        cycleInfo: cycleDayMap.get(key),
      })
    }

    // 이번 달
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d)
      date.setHours(0, 0, 0, 0)
      const key = date.toISOString().split('T')[0]
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        cycleInfo: cycleDayMap.get(key),
      })
    }

    // 다음 달 채우기 (42칸 고정)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(y, m + 1, i)
      date.setHours(0, 0, 0, 0)
      const key = date.toISOString().split('T')[0]
      days.push({
        date,
        dayNum: i,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        cycleInfo: cycleDayMap.get(key),
      })
    }

    return days
  }, [viewDate, today, cycleDayMap])

  const nextOvulationDate = useMemo(() => {
    if (!lastPeriodStart) return today
    const d = getNextOvulationDate(lastPeriodStart, cycleLength)
    while (d < today) d.setDate(d.getDate() + cycleLength)
    return d
  }, [lastPeriodStart, cycleLength, today])

  const nextPeriodDate = useMemo(() => {
    if (!lastPeriodStart) return today
    const d = getNextPeriodDate(lastPeriodStart, cycleLength)
    while (d < today) d.setDate(d.getDate() + cycleLength)
    return d
  }, [lastPeriodStart, cycleLength, today])

  const currentCycleDay = useMemo(
    () => lastPeriodStart ? getCurrentCycleDay(lastPeriodStart, cycleLength) : 0,
    [lastPeriodStart, cycleLength]
  )

  const todayKey = today.toISOString().split('T')[0]
  const todayInfo = cycleDayMap.get(todayKey)
  const todayPhaseLabel = todayInfo
    ? {
        menstrual: '생리 중',
        follicular: '난포기',
        ovulation: todayInfo.isOvulation ? '배란일' : '가임기',
        luteal: '황체기',
      }[todayInfo.phase]
    : '—'

  const formatKorDate = (date: Date) =>
    `${date.getMonth() + 1}월 ${date.getDate()}일`

  return {
    currentYear: viewDate.getFullYear(),
    currentMonth: viewDate.getMonth(),
    calendarDays,
    selectedDate,
    selectedMood,
    nextOvulationDate,
    nextPeriodDate,
    currentCycleDay,
    todayPhaseLabel,
    goToPrevMonth: () =>
      setViewDate((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1)),
    goToNextMonth: () =>
      setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1)),
    selectDate: setSelectedDate,
    selectMood: setSelectedMood,
    formatKorDate,
  }
}
