// apps/web/app/(dashboard)/calendar/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  calculateCycleDays, cyclesApi, hormonesApi, treatmentApi,
  useUserStore, getScheduleChips, getNextStageSuggestion, getScheduleMarkerStyle,
  usersApi,
} from '@fertility/shared'
import type { MenstrualCycle, TreatmentSchedule, Medication, HormoneRecord, TreatmentMode, CurrentStage } from '@fertility/shared'
import { Plus, ChevronLeft, ChevronRight, Info, CalendarDays, Bell, ClipboardList, Check, Trash2, Calendar as LucideCalendar, Heart as HeartIcon } from 'lucide-react'

type TreatmentType = 'IVF' | 'IUI' | 'FET' | 'monitoring' | 'other'

export default function CalendarPage() {
  const { user, profile: authProfile } = useAuth()
  const { profile: storeProfile, setCurrentStage } = useUserStore()
  const profile = storeProfile ?? authProfile

  const treatmentMode = (profile?.treatmentStage as TreatmentMode) ?? 'natural'
  const currentStage  = (profile as any)?._currentStage as CurrentStage ?? null

  // 저장 후 단계 전환 제안 상태
  const [stageSuggestion, setStageSuggestion] = useState<{ nextStage: CurrentStage; message: string } | null>(null)

  const { chips: schedChips, defaultValue: schedDefault } = getScheduleChips(treatmentMode)

  // 현재 선택된 칩 값 (value key)
  const [scheduleChipValue, setScheduleChipValue] = useState<string | null>(null)
  const [cycles, setCycles] = useState<MenstrualCycle[]>([])
  const [schedules, setSchedules] = useState<TreatmentSchedule[]>([])
  const [hormones, setHormones] = useState<HormoneRecord[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  
  // 기록 통합 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  
  // 선택 기록 활성화 토글 상태
  const [includePeriod, setIncludePeriod] = useState(true)
  const [includeIntercourse, setIncludeIntercourse] = useState(false)
  const [intercourse, setIntercourse] = useState(false)
  const [includeHealth, setIncludeHealth] = useState(false)
  const [bbt, setBbt] = useState('')
  const [opkIndex, setOpkIndex] = useState('')
  
  const [saving, setSaving] = useState(false)

  // 시술 일정 등록 모달 상태
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [scheduleType, setScheduleType] = useState<TreatmentType>('IVF')
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [hospitalName, setHospitalName] = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')
  
  // 약물 상태 (다중 등록 가능)
  const [medications, setMedications] = useState<Medication[]>([])
  const [medName, setMedName] = useState('')
  const [medDose, setMedDose] = useState('')
  const [medTimes, setMedTimes] = useState<string[]>(['08:00'])
  const [medStartDate, setMedStartDate] = useState('')
  const [medEndDate, setMedEndDate] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState('')

  // 약 복용 완료 상태 기록용 로컬스토리지 연동
  const [checkedMeds, setCheckedMeds] = useState<Record<string, boolean>>({})

  // 날짜 탭 → 당일 상세 모달
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)

  const unwrap = (r: any) => Array.isArray(r) ? r : (r?.data ?? [])

  const fetchCycles = async () => {
    if (!user) return
    try {
      const data = await cyclesApi.getAll()
      setCycles(unwrap(data))
    } catch (err) {
      console.error(err)
    }
  }

  const fetchHormones = async () => {
    if (!user) return
    try {
      const data = await hormonesApi.getAll()
      setHormones(unwrap(data))
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSchedules = async () => {
    if (!user) return
    try {
      const data = await treatmentApi.getAll()
      setSchedules(unwrap(data))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const initData = async () => {
      if (!user) return
      setLoading(true)
      await Promise.all([fetchCycles(), fetchSchedules(), fetchHormones()])
      setLoading(false)
    }
    initData()
  }, [user])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`med_checked_${selectedDateStr}`)
      if (saved) {
        setCheckedMeds(JSON.parse(saved))
      } else {
        setCheckedMeds({})
      }
    }
  }, [selectedDateStr])

  const handleCheckMed = (medKey: string) => {
    const updated = { ...checkedMeds, [medKey]: !checkedMeds[medKey] }
    setCheckedMeds(updated)
    localStorage.setItem(`med_checked_${selectedDateStr}`, JSON.stringify(updated))
  }

  // 월 이동
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // 주기 데이터 계산 (최신 주기를 기준 60일 데이터 생성하여 활용)
  const latestCycle = cycles[0]
  const cycleLength = profile?.averageCycleLength || latestCycle?.cycleLength || 28
  const periodLength = profile?.averagePeriodLength || latestCycle?.periodLength || 5
  
  // 생리 시작일 리스트 및 사이클 데이 매핑용 데이터 생성
  let cycleDaysMap: Record<string, any> = {}
  
  cycles.slice(0, 3).forEach(cycle => {
    const start = new Date(cycle.startDate)
    const days = calculateCycleDays(start, cycle.cycleLength || cycleLength, cycle.periodLength || periodLength, 45)
    days.forEach(d => {
      const existing = cycleDaysMap[d.date]
      if (!existing || d.isMenstruation || d.isOvulation) {
        cycleDaysMap[d.date] = d
      }
    })
  })

  // 달력 격자 생성 로직
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() // 0-based

  const firstDayIndex = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()
  const prevLastDate = new Date(year, month, 0).getDate()

  const calendarDays = []

  // 지난달 날짜
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevLastDate - i
    const prevMonthDate = new Date(year, month - 1, day)
    const dateStr = prevMonthDate.toISOString().split('T')[0]
    calendarDays.push({ day, isCurrentMonth: false, dateStr })
  }

  // 이번달 날짜
  for (let i = 1; i <= lastDate; i++) {
    const currentMonthDate = new Date(year, month, i)
    const offset = currentMonthDate.getTimezoneOffset() * 60000
    const localISODate = new Date(currentMonthDate.getTime() - offset).toISOString().split('T')[0]
    calendarDays.push({ day: i, isCurrentMonth: true, dateStr: localISODate })
  }

  // 다음달 날짜
  const remaining = 42 - calendarDays.length
  for (let i = 1; i <= remaining; i++) {
    const nextMonthDate = new Date(year, month + 1, i)
    const dateStr = nextMonthDate.toISOString().split('T')[0]
    calendarDays.push({ day: i, isCurrentMonth: false, dateStr })
  }

  // 통합 기록 등록/수정 전송
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const promises: Promise<any>[] = []

      // 1. 생리 기록 저장
      if (includePeriod) {
        const calcPeriodLength = endDate
          ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
          : periodLength
        promises.push(
          cyclesApi.save({
            startDate,
            endDate: endDate || undefined,
            cycleLength,
            periodLength: calcPeriodLength,
            notes: notes || undefined
          })
        )
      }

      // 2. 관계 여부 및 신체 지표 저장
      if (includeIntercourse || includeHealth) {
        const existingRecord = hormones.find(h => h.recordedAt === startDate)
        promises.push(
          hormonesApi.save({
            id: existingRecord?.id || undefined,
            recordedAt: startDate,
            intercourse: includeIntercourse ? intercourse : existingRecord?.intercourse,
            bbt: includeHealth && bbt ? Number(bbt) : existingRecord?.bbt,
            opkIndex: includeHealth && opkIndex ? Number(opkIndex) : existingRecord?.opkIndex,
            notes: notes || existingRecord?.notes || undefined
          })
        )
      }

      await Promise.all(promises)
      await Promise.all([fetchCycles(), fetchHormones()])
      setIsModalOpen(false)
      setEndDate('')
      setNotes('')
      setIncludePeriod(true)
      setIncludeIntercourse(false)
      setIntercourse(false)
      setIncludeHealth(false)
      setBbt('')
      setOpkIndex('')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // 일정 등록 전송
  const handleAddMedication = () => {
    if (!medName || !medDose) return
    const newMed: Medication = {
      name: medName,
      dose: medDose,
      times: medTimes,
      startDate: medStartDate || selectedDateStr,
      endDate: medEndDate || undefined
    }
    setMedications([...medications, newMed])
    setMedName('')
    setMedDose('')
  }

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index))
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleTitle.trim()) return
    setScheduleError('')
    setSavingSchedule(true)
    const chipValue = scheduleChipValue ?? schedDefault
    const chip = schedChips.find(c => c.value === chipValue)
    const backendType = chip?.backendType ?? 'other'
    try {
      const fullDateTime = `${selectedDateStr}T${scheduleTime || '09:00'}`
      await treatmentApi.save({
        type: backendType,
        title: scheduleTitle,
        scheduledAt: fullDateTime,
        status: 'scheduled',
        hospitalName,
        notes: scheduleNotes,
        medications
      })
      await fetchSchedules()
      setIsScheduleModalOpen(false)
      setScheduleTitle('')
      setHospitalName('')
      setScheduleNotes('')
      setMedications([])
      setScheduleTime('09:00')
      setScheduleChipValue(null)

      // 단계 전환 제안
      const suggestion = getNextStageSuggestion(chipValue ?? '', currentStage, treatmentMode)
      if (suggestion) setStageSuggestion(suggestion)
    } catch (err) {
      console.error(err)
      setScheduleError('일정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSavingSchedule(false)
    }
  }

  const handleConfirmStageTransition = async () => {
    if (!stageSuggestion) return
    try {
      setCurrentStage(stageSuggestion.nextStage)
      await usersApi.updateProfile({ currentStage: stageSuggestion.nextStage })
    } catch {}
    setStageSuggestion(null)
  }

  // 선택된 날짜에 대한 필터링
  const dateSchedules = schedules.filter(s => s.scheduledAt.split('T')[0] === selectedDateStr)

  const dateMedications = schedules.flatMap(s => {
    const isSelectedDateSchedule = s.scheduledAt.split('T')[0] === selectedDateStr
    return (s.medications || []).filter(med => {
      const start = new Date(med.startDate).getTime()
      const end = med.endDate ? new Date(med.endDate).getTime() : Infinity
      const current = new Date(selectedDateStr).getTime()
      return isSelectedDateSchedule || (current >= start && current <= end)
    })
  })

  // 선택 날짜 파생 데이터
  const selectedDayHormone = hormones.find(h => h.recordedAt === selectedDateStr)
  const selectedCycleRecord = cycles.find(c => {
    const start = new Date(c.startDate)
    const pLen  = c.periodLength || periodLength
    const end   = c.endDate ? new Date(c.endDate) : new Date(start.getTime() + (pLen - 1) * 86400000)
    const sel   = new Date(selectedDateStr)
    return sel >= start && sel <= end
  })

  const openPeriodRecord = () => {
    setStartDate(selectedCycleRecord?.startDate || selectedDateStr)
    if (selectedCycleRecord?.endDate) {
      setEndDate(selectedCycleRecord.endDate)
    } else {
      const start = new Date(selectedCycleRecord?.startDate || selectedDateStr)
      start.setDate(start.getDate() + (selectedCycleRecord?.periodLength || periodLength) - 1)
      setEndDate(start.toISOString().split('T')[0])
    }
    setIncludePeriod(true)
    setIncludeIntercourse(false)
    setIncludeHealth(false)
    setIsDayModalOpen(false)
    setIsModalOpen(true)
  }

  const openHealthRecord = () => {
    setStartDate(selectedDateStr)
    setIncludePeriod(false)
    setIncludeIntercourse(true)
    setIncludeHealth(true)
    if (selectedDayHormone) {
      setBbt(selectedDayHormone.bbt?.toString() || '')
      setOpkIndex(selectedDayHormone.opkIndex?.toString() || '')
      setIntercourse(selectedDayHormone.intercourse || false)
    } else {
      setBbt(''); setOpkIndex(''); setIntercourse(false)
    }
    setIsDayModalOpen(false)
    setIsModalOpen(true)
  }

  const getTypeBadge = (sType: string) => {
    switch (sType) {
      case 'IVF': return <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold">🧬 시험관</span>
      case 'IUI': return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">🧪 인공수정</span>
      case 'FET': return <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full font-bold">❄️ 동결이식</span>
      case 'monitoring': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">🩺 검진/초음파</span>
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-full font-bold">📅 일반 일정</span>
    }
  }

  const selectedDateFormatted = new Date(selectedDateStr).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  })

  return (
    <div className="space-y-5">
      {/* 타이틀 및 추가 버튼 */}
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-rose-950 flex items-center gap-1.5">
            <CalendarDays size={18} className="text-primary shrink-0" />
            <span>주기 및 병원 일정</span>
          </h2>
          <p className="text-[11px] text-rose-900/50 mt-0.5 leading-relaxed">
            날짜를 선택하여 병원 일정과 복용 체크리스트를 확인해 보세요
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0 mt-0.5">
          <button
            onClick={() => {
              setStartDate(selectedDateStr)
              setIsModalOpen(true)
            }}
            className="bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-semibold py-1.5 px-2.5 rounded-xl flex items-center gap-1 whitespace-nowrap active-press transition-colors shadow-sm"
          >
            <Plus size={13} /> 기록
          </button>
          <button
            onClick={() => {
              setMedStartDate(selectedDateStr)
              setIsScheduleModalOpen(true)
            }}
            className="bg-primary hover:bg-rose-500 text-white text-[11px] font-semibold py-1.5 px-2.5 rounded-xl flex items-center gap-1 whitespace-nowrap active-press transition-colors shadow-sm"
          >
            <Plus size={13} /> 일정
          </button>
        </div>
      </div>

      {/* 달력 컨트롤 바 */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-rose-800"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-base font-bold text-rose-950 font-outfit">
            {year}년 {month + 1}월
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-rose-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <span
              key={d}
              className={`text-[10px] font-bold py-1 ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'
              }`}
            >
              {d}
            </span>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1 gap-y-2">
          {calendarDays.map((cDay, idx) => {
            const data = cycleDaysMap[cDay.dateStr]
            const isMenstruation = data?.isMenstruation
            const isOvulation = data?.isOvulation
            const isFertileWindow = data?.isFertileWindow
            const isToday = cDay.dateStr === new Date().toISOString().split('T')[0]
            const isSelected = selectedDateStr === cDay.dateStr
            const hasSchedule = schedules.some(s => s.scheduledAt.split('T')[0] === cDay.dateStr)
            
            const dayHormone = hormones.find(h => h.recordedAt === cDay.dateStr)
            const hasIntercourse = dayHormone?.intercourse === true

            return (
              <div
                key={idx}
                onClick={() => { setSelectedDateStr(cDay.dateStr); setIsDayModalOpen(true) }}
                className={`relative min-h-[50px] flex flex-col justify-between items-center p-1 rounded-xl transition-all cursor-pointer ${
                  cDay.isCurrentMonth ? 'text-slate-800' : 'text-slate-300'
                } ${
                  isMenstruation
                    ? 'bg-red-50 text-red-700 font-bold border border-red-100/50'
                    : isOvulation
                    ? 'bg-rose-100/60 text-primary font-bold border border-primary/20'
                    : isFertileWindow
                    ? 'bg-rose-50/70 border border-dashed border-rose-200'
                    : ''
                } ${
                  isToday ? 'ring-2 ring-primary ring-offset-1' : ''
                } ${
                  isSelected ? 'bg-rose-100/40 border border-primary text-primary font-bold' : ''
                }`}
              >
                <div className="w-full flex justify-between items-start px-1">
                  <span className="text-[11px] font-medium">{cDay.day}</span>
                  {hasIntercourse && (
                    <span className="text-[9px] leading-none text-rose-500 fill-rose-500 animate-pulse-glow" title="관계일">❤️</span>
                  )}
                </div>

                {/* 뱃지 및 기호 */}
                <div className="flex flex-col items-center gap-0.5 mt-0.5">
                  {isMenstruation && (
                    <span className="text-[7px] text-red-500 bg-red-100 px-1 py-0.2 rounded">생리</span>
                  )}
                  {isOvulation && (
                    <span className="text-[8px] animate-pulse">🌸</span>
                  )}
                  {isFertileWindow && !isOvulation && !isMenstruation && (
                    <span className="text-[7px] text-primary bg-rose-50 px-1 py-0.2 rounded">가임</span>
                  )}
                  {treatmentMode === 'natural' ? (
                    hasSchedule && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-0.5" />
                  ) : (
                    schedules
                      .filter(s => s.scheduledAt.split('T')[0] === cDay.dateStr)
                      .slice(0, 2)
                      .map((s, si) => {
                        const m = getScheduleMarkerStyle(s.type)
                        return (
                          <span key={si} style={{ color: m.color, fontSize: 8, lineHeight: 1 }}>
                            {m.emoji}
                          </span>
                        )
                      })
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 주기 기록 없을 때 안내 배너 */}
        {cycles.length === 0 && (
          <div className="mt-4 pt-3.5 border-t border-slate-100/60">
            <div className="bg-rose-50/60 border border-dashed border-rose-200 rounded-2xl px-4 py-3 text-center space-y-1.5">
              <p className="text-xs font-bold text-rose-800">🌸 생리 시작일을 기록해보세요</p>
              <p className="text-[10px] text-rose-900/60 leading-relaxed">
                첫 생리 시작일을 기록하면 가임기·배란일 예측을 시작해드려요.
              </p>
              <button
                onClick={() => { setStartDate(new Date().toISOString().split('T')[0]); setIsModalOpen(true) }}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                + 첫 생리 시작일 기록하기
              </button>
            </div>
          </div>
        )}

        {/* 콤팩트 범례 한 줄 */}
        <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-1.5 mt-4 pt-3.5 border-t border-slate-100/60 text-[10px] text-rose-900/50 font-medium">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#fecdd3]"></span>
            <span>생리 기간</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ede9fe]"></span>
            <span>가임 시기</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🌸</span>
            <span>배란 예정일</span>
          </div>
          <div className="flex items-center gap-1">
            <span>❤️</span>
            <span>관계일</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span>병원/내원 일정</span>
          </div>
        </div>
      </div>

      {/* 날짜 탭 힌트 */}
      <p className="text-[10px] text-rose-900/40 text-center -mt-2">
        날짜를 탭하면 기록을 확인하거나 추가할 수 있어요
      </p>


      {/* 주기 기록 리스트 요약 */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h4 className="text-xs font-bold text-slate-800 mb-3">최근 주기 기록 리스트</h4>
        {cycles.length > 0 ? (
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {cycles.map((c, i) => (
              <div key={c.id || i} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <p className="font-bold text-slate-700">시작: {c.startDate}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    종료: {c.endDate || '진행 중'} • 주기: {c.cycleLength}일
                  </p>
                </div>
                {c.notes && !c.notes.includes('자동 등록') && (
                  <p className="text-[10px] text-slate-400 italic max-w-[120px] truncate">
                    {c.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">등록된 이전 주기 기록이 없습니다.</p>
        )}
      </div>

      {/* ── 날짜 탭 Day Detail 모달 ── */}
      {isDayModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-center items-end animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) setIsDayModalOpen(false) }}
        >
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">

            {/* 스티키 헤더 */}
            <div className="sticky top-0 bg-white px-6 pt-5 pb-3 border-b border-rose-50 rounded-t-3xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-rose-950">
                    {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                    })}
                  </h3>
                  {(() => {
                    const d = cycleDaysMap[selectedDateStr]
                    if (!d) return null
                    if (d.isMenstruation) return <span className="text-[11px] text-red-500 font-semibold">🌷 생리 기간</span>
                    if (d.isOvulation)    return <span className="text-[11px] text-primary font-semibold">🌸 배란 예정일</span>
                    if (d.isFertileWindow) return <span className="text-[11px] text-rose-400 font-semibold">🥚 가임기</span>
                    return null
                  })()}
                </div>
                <button
                  onClick={() => setIsDayModalOpen(false)}
                  className="text-xs text-gray-400 hover:text-slate-600 mt-1"
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-3">

              {/* 1. 생리 기록 */}
              <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-800">🌷 생리 기록</span>
                  <button
                    onClick={openPeriodRecord}
                    className="text-[11px] font-bold text-primary bg-white border border-rose-200 px-3 py-1 rounded-full hover:bg-rose-50 transition-colors"
                  >
                    {selectedCycleRecord ? '수정하기' : '기록하기'}
                  </button>
                </div>
                {selectedCycleRecord ? (
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p>시작: <b className="text-rose-800">{selectedCycleRecord.startDate}</b></p>
                    {selectedCycleRecord.endDate && <p>종료: <b className="text-rose-800">{selectedCycleRecord.endDate}</b></p>}
                    <p>주기: <b>{selectedCycleRecord.cycleLength}일</b></p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">이 날짜의 생리 기록이 없어요</p>
                )}
              </div>

              {/* 2. 건강 기록 (BBT / OPK / 관계) */}
              <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-800">🌡️ 건강 기록</span>
                  <button
                    onClick={openHealthRecord}
                    className="text-[11px] font-bold text-primary bg-white border border-rose-200 px-3 py-1 rounded-full hover:bg-rose-50 transition-colors"
                  >
                    {selectedDayHormone ? '수정하기' : '기록하기'}
                  </button>
                </div>
                {selectedDayHormone ? (
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    {selectedDayHormone.bbt !== undefined && (
                      <span>🌡️ BBT: <b className="text-rose-700">{selectedDayHormone.bbt}°C</b></span>
                    )}
                    {selectedDayHormone.opkIndex !== undefined && (
                      <span>🥚 OPK: <b className="text-rose-700">{selectedDayHormone.opkIndex}/10</b></span>
                    )}
                    {selectedDayHormone.intercourse !== undefined && (
                      <span>{selectedDayHormone.intercourse ? '❤️ 관계 있음' : '🤍 관계 없음'}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">BBT, OPK, 관계 기록이 없어요</p>
                )}
              </div>

              {/* 3. 복용 체크리스트 */}
              {dateMedications.length > 0 && (
                <div className="border border-rose-100 rounded-2xl p-4">
                  <span className="text-xs font-bold text-rose-800 block mb-2">💊 복용 체크리스트</span>
                  <div className="space-y-2">
                    {dateMedications.map((med, i) => {
                      const medKey = `${med.name}_${med.dose}_${med.times.join(',')}`
                      const isChecked = !!checkedMeds[medKey]
                      return (
                        <button
                          key={i}
                          onClick={() => handleCheckMed(medKey)}
                          className={`w-full flex justify-between items-center p-3 rounded-xl border text-left transition-all ${
                            isChecked
                              ? 'bg-slate-50 border-slate-100 text-slate-400 line-through'
                              : 'bg-white border-rose-100/50 hover:bg-rose-50/20'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isChecked ? 'bg-primary border-primary' : 'border-rose-200 bg-white'
                            }`}>
                              {isChecked && <Check size={10} className="text-white" />}
                            </span>
                            <span className="text-xs font-semibold">{med.name} <span className="font-normal text-gray-400">({med.dose})</span></span>
                          </div>
                          <span className="text-[10px] font-bold text-primary">🕒 {med.times.join(', ')}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 4. 시술 일정 */}
              <div className="border border-rose-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-800">📅 시술 일정</span>
                  <button
                    onClick={() => { setMedStartDate(selectedDateStr); setIsDayModalOpen(false); setIsScheduleModalOpen(true) }}
                    className="text-[11px] font-bold text-primary bg-white border border-rose-200 px-3 py-1 rounded-full hover:bg-rose-50 transition-colors"
                  >
                    + 일정 추가
                  </button>
                </div>
                {dateSchedules.length > 0 ? (
                  <div className="space-y-2">
                    {dateSchedules.map((s, idx) => {
                      const timeStr = new Date(s.scheduledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                      return (
                        <div key={s.id || idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <div className="text-[10px]">{getTypeBadge(s.type)}</div>
                            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">{timeStr}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700">{s.title}</p>
                          {s.hospitalName && <p className="text-[10px] text-gray-500">🏢 {s.hospitalName}</p>}
                          {s.notes && <p className="text-[10px] text-gray-400 italic">{s.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">등록된 시술 일정이 없어요</p>
                )}
              </div>

              <div className="pb-2" />
            </div>
          </div>
        </div>
      )}

      {/* 통합 기록 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-end animate-fade-in">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 shadow-2xl border-t border-rose-100 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center border-b border-rose-50 pb-3">
              <h3 className="text-base font-bold text-rose-950 flex items-center gap-1.5">
                <LucideCalendar size={18} className="text-primary" />
                기록 등록 ({new Date(startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })})
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-gray-400 hover:text-slate-600 font-medium"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 기록 날짜 설정 */}
              <div>
                <label className="block font-bold text-rose-900/60 mb-1 ml-1">
                  기록 날짜
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xs font-semibold text-rose-950 transition-all"
                />
              </div>

              {/* 1. 생리 기간 선택 기록 */}
              <div className="bg-rose-50/10 border border-rose-100/40 p-3.5 rounded-2xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-950 text-xs">
                  <input
                    type="checkbox"
                    checked={includePeriod}
                    onChange={(e) => setIncludePeriod(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-rose-200"
                  />
                  <span>🌷 생리 기간 기록</span>
                </label>

                {includePeriod && (
                  <div className="grid grid-cols-2 gap-3 pl-6 animate-fade-in">
                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1">시작일</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl border border-rose-100 bg-white focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1">종료일 (선택)</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-rose-100 bg-white focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. 부부 관계 선택 기록 */}
              <div className="bg-rose-50/10 border border-rose-100/40 p-3.5 rounded-2xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-950 text-xs">
                  <input
                    type="checkbox"
                    checked={includeIntercourse}
                    onChange={(e) => setIncludeIntercourse(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-rose-200"
                  />
                  <span>❤️ 부부 관계 기록</span>
                </label>

                {includeIntercourse && (
                  <div className="pl-6 flex items-center gap-4 animate-fade-in">
                    <span className="font-semibold text-rose-900/60">오늘 관계를 가지셨나요?</span>
                    <button
                      type="button"
                      onClick={() => setIntercourse(!intercourse)}
                      className={`px-4 py-1.5 rounded-full font-bold transition-all border ${
                        intercourse
                          ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                          : 'bg-white border-rose-200 text-rose-800/60 hover:bg-rose-50/20'
                      }`}
                    >
                      {intercourse ? '❤️ 가짐' : '🤍 안 가짐'}
                    </button>
                  </div>
                )}
              </div>

              {/* 3. 신체 수치 선택 기록 */}
              <div className="bg-rose-50/10 border border-rose-100/40 p-3.5 rounded-2xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-950 text-xs">
                  <input
                    type="checkbox"
                    checked={includeHealth}
                    onChange={(e) => setIncludeHealth(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-rose-200"
                  />
                  <span>🌡️ 신체 수치 기록</span>
                </label>

                {includeHealth && (
                  <div className="grid grid-cols-2 gap-3 pl-6 animate-fade-in">
                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1">기초체온 BBT (°C)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="예: 36.55"
                        value={bbt}
                        onChange={(e) => setBbt(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-rose-100 bg-white focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-rose-900/60 mb-1">배테기 OPK (0~10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        placeholder="예: 8"
                        value={opkIndex}
                        onChange={(e) => setOpkIndex(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-rose-100 bg-white focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 메모 입력 */}
              <div>
                <label className="block font-bold text-rose-900/60 mb-1 ml-1">
                  오늘의 메모
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="증상, 컨디션 등을 간단히 입력해 주세요."
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xs transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press transition-all flex justify-center items-center gap-2 shadow-md shadow-rose-200"
              >
                {saving ? '기록 저장 중...' : '선택한 기록 저장하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 일정 등록 모달 */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-end animate-fade-in">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 shadow-2xl border-t border-rose-100 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-rose-950">{selectedDateFormatted} 일정 추가</h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-xs text-gray-400 hover:text-slate-600"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs">
              {/* 일정 종류 칩 */}
              <div>
                <label className="block font-semibold text-rose-900/60 mb-1.5 ml-1">일정 종류</label>
                <div className="flex flex-wrap gap-2">
                  {schedChips.map(chip => {
                    const active = (scheduleChipValue ?? schedDefault) === chip.value
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => setScheduleChipValue(chip.value)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                          active
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        {chip.emoji} {chip.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                  일정 시간
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                  일정 제목
                </label>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  placeholder="예: 초음파 진료 및 난포주사 처방"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                    병원 이름
                  </label>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="예: 서울미래여성"
                    className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-rose-900/60 mb-1 ml-1">
                    일정 관련 메모
                  </label>
                  <input
                    type="text"
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="공복 여부, 챙겨갈 서류 등"
                    className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>

              {/* 복용 약물 등록 서브 폼 */}
              <div className="border border-rose-100/50 p-4 rounded-2xl space-y-2.5 bg-rose-50/5">
                <span className="font-bold text-rose-950 block">💊 복용 약물/주사 추가</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="약물/주사제명"
                    className="w-full px-3 py-2 rounded-xl border border-rose-100 bg-white focus:outline-none text-xs"
                  />
                  <input
                    type="text"
                    value={medDose}
                    onChange={(e) => setMedDose(e.target.value)}
                    placeholder="용량 (예: 1정 / 150IU)"
                    className="w-full px-3 py-2 rounded-xl border border-rose-100 bg-white focus:outline-none text-xs"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <div className="flex-1 flex gap-1 items-center">
                    <span className="text-[10px] text-gray-400 font-semibold">복용시간:</span>
                    <input
                      type="text"
                      value={medTimes.join(',')}
                      onChange={(e) => setMedTimes(e.target.value.split(','))}
                      placeholder="08:00,20:00"
                      className="flex-1 px-3 py-2 rounded-xl border border-rose-100 bg-white focus:outline-none text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-all"
                  >
                    추가
                  </button>
                </div>

                {/* 임시 등록 약물 리스트 */}
                {medications.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-rose-100/30">
                    {medications.map((m, index) => (
                      <div key={index} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-700">{m.name} ({m.dose})</p>
                          <p className="text-[8px] text-gray-400">시간: {m.times.join(', ')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {scheduleError && (
                <p className="text-xs text-red-500 text-center -mb-1">{scheduleError}</p>
              )}
              <button
                type="submit"
                disabled={savingSchedule || !scheduleTitle.trim()}
                className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingSchedule ? '저장 중...' : '일정 저장하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 단계 전환 제안 바텀시트 */}
      {stageSuggestion && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex justify-center items-end animate-fade-in">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 shadow-2xl animate-slide-up">
            <div className="w-10 h-1 bg-rose-100 rounded-full mx-auto" />
            <p className="text-[15px] font-bold text-rose-950 text-center">{stageSuggestion.message}</p>
            <p className="text-[12px] text-rose-700/70 text-center">홈 화면이 새 단계에 맞게 자동으로 갱신돼요.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setStageSuggestion(null)}
                className="flex-1 py-3 rounded-2xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50"
              >
                나중에
              </button>
              <button
                onClick={handleConfirmStageTransition}
                className="flex-1 py-3 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-rose-500"
              >
                단계 변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
