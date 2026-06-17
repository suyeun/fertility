// apps/mobile/app/calendar/index.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import {
  useCycleCalendar, cyclesApi, hormonesApi, treatmentApi, diaryApi,
  canUseClinicScheduler, isPremiumProfile, ClinicFeature,
  useUserStore, getScheduleChips, getNextStageSuggestion, getScheduleMarkerStyle, usersApi,
} from '@fertility/shared'
import type {
  TreatmentSchedule, Medication, TreatmentType, HormoneRecord,
  UserProfile, PaywallSource, TreatmentMode, CurrentStage, StageSuggestion,
} from '@fertility/shared'
import { DayCell, DAY_CELL_W } from '../../../components/calendar/DayCell'
import { CycleSummary } from '../../../components/calendar/CycleSummary'
import PaywallModal from '../../../components/PaywallModal'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { rescheduleMedicationAlerts } from '../../../lib/notifications'
import { F } from '../../../lib/fonts'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const LEGEND = [
  { color: '#fecdd3', label: '생리' },
  { color: '#ede9fe', label: '가임기' },
  { color: '#ff8fab', label: '배란일' },
  { color: '#fb7185', label: '관계일(❤️)' },
]

const MOODS = [
  { mood: 'great',   emoji: '😄', label: '최고' },
  { mood: 'good',    emoji: '🙂', label: '좋아' },
  { mood: 'excited', emoji: '🥰', label: '설레' },
  { mood: 'hopeful', emoji: '🌸', label: '기대' },
  { mood: 'neutral', emoji: '😐', label: '그냥' },
  { mood: 'tired',   emoji: '😴', label: '피곤' },
  { mood: 'anxious', emoji: '😟', label: '불안' },
  { mood: 'sad',     emoji: '😢', label: '슬퍼' },
  { mood: 'angry',   emoji: '😠', label: '화나' },
  { mood: 'sick',    emoji: '🤒', label: '아파' },
]

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const PINK      = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED     = '#b07080'
const BORDER    = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

export default function CalendarScreen() {
  const { profile: storeProfile } = useUserStore()
  const [user, setUser]         = useState<any>(null)
  const [profile, setProfile]   = useState<UserProfile | null>(null)

  const effectiveProfile = storeProfile ?? profile
  const isPremium = effectiveProfile ? isPremiumProfile(effectiveProfile) : false
  const treatmentMode: TreatmentMode = (effectiveProfile?.treatmentStage as TreatmentMode) ?? 'natural'
  const currentStage: CurrentStage = (effectiveProfile as any)?._currentStage ?? null
  const [cycles, setCycles]     = useState<any[]>([])
  const [schedules, setSchedules] = useState<TreatmentSchedule[]>([])
  const [hormones, setHormones] = useState<HormoneRecord[]>([])
  const [loading, setLoading]   = useState(true)

  // 페이월 모달
  const [paywallSource, setPaywallSource] = useState<PaywallSource | null>(null)

  // 일정 등록 폼 상태
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [scheduleType,  setScheduleType]  = useState<TreatmentType>('IVF')
  const [scheduleChipValue, setScheduleChipValue] = useState<string | null>(null)
  const [stageSuggestion, setStageSuggestion] = useState<StageSuggestion | null>(null)
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [scheduleTime,  setScheduleTime]  = useState('09:00')
  const [hospitalName,  setHospitalName]  = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')

  // 약물 상태
  const [medications,  setMedications]  = useState<Medication[]>([])
  const [medName,      setMedName]      = useState('')
  const [medDose,      setMedDose]      = useState('')
  const [medTimes,     setMedTimes]     = useState<string[]>(['08:00'])
  const [medStartDate, setMedStartDate] = useState('')
  const [medEndDate,   setMedEndDate]   = useState('')

  const [savingSchedule, setSavingSchedule] = useState(false)
  const [checkedMeds, setCheckedMeds] = useState<Record<string, boolean>>({})

  // 기분 & 메모 (Day Detail 모달 내)
  const [dayMood, setDayMood] = useState<string | null>(null)
  const [dayMemo, setDayMemo] = useState('')
  const [savingDiary, setSavingDiary] = useState(false)
  const [diarySaved, setDiarySaved] = useState(false)

  // 날짜 탭 → 당일 상세 모달
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false)

  // 생리 기록 (당일 상세 모달 내)
  const [periodStartDate, setPeriodStartDate] = useState('')
  const [periodEndDate,   setPeriodEndDate]   = useState('')
  const [savingPeriod, setSavingPeriod] = useState(false)
  const [isEditingPeriod, setIsEditingPeriod] = useState(false)

  // ──────────────────────────────────────────
  // 데이터 로드
  // ──────────────────────────────────────────
  const fetchData = useCallback(async (userId: string) => {
    try {
      const [fetchedCycles, fetchedHormones, fetchedSchedules] = await Promise.all([
        cyclesApi.getAll(),
        hormonesApi.getAll(),
        treatmentApi.getAll(),
      ])
      const unwrap = (r: any) => Array.isArray(r) ? r : (r?.data ?? [])
      setCycles(unwrap(fetchedCycles))
      setHormones(unwrap(fetchedHormones))
      setSchedules(unwrap(fetchedSchedules))
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const { loadStoredToken, loadUser } = await import('../../lib/auth')
        const token = await loadStoredToken()
        if (!token) { setLoading(false); return }
        const u = await loadUser()
        if (!u) { setLoading(false); return }

        setUser(u)

        // 프로필 로드 (_layout의 addCustomerInfoListener가 isPremium을 스토어에 자동 동기화)
        const p = await import('@fertility/shared').then(m => m.usersApi.getProfile()).catch(() => null)
        if (p) setProfile(p)

        await fetchData(u.uid)
      } catch { setLoading(false) }
    }
    init()
  }, [fetchData])

  // ──────────────────────────────────────────
  // 달력 상태
  // ──────────────────────────────────────────
  const latestCycle  = cycles[0]
  const lastPeriod   = latestCycle ? new Date(latestCycle.startDate) : null
  const cycleLength  = latestCycle?.cycleLength  || 28
  const periodLength = latestCycle?.periodLength || 5

  const {
    currentYear, currentMonth, calendarDays,
    selectedDate,
    nextOvulationDate, nextPeriodDate,
    currentCycleDay, todayPhaseLabel,
    goToPrevMonth, goToNextMonth,
    selectDate, formatKorDate,
  } = useCycleCalendar(lastPeriod, cycleLength, periodLength)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selectedDateStr = selectedDate
    ? toLocalDateStr(selectedDate)
    : toLocalDateStr(today)

  useEffect(() => {
    const loadCheckedMeds = async () => {
      try {
        const saved = await AsyncStorage.getItem(`med_checked_${selectedDateStr}`)
        setCheckedMeds(saved ? JSON.parse(saved) : {})
      } catch { setCheckedMeds({}) }
    }
    loadCheckedMeds()
  }, [selectedDateStr])

  useEffect(() => {
    if (!isDayDetailModalOpen) return
    const loadDiary = async () => {
      try {
        const res = await diaryApi.getAll()
        const diaries = Array.isArray(res) ? res : (res?.data ?? [])
        const entry = diaries.find((d: any) => d.date === selectedDateStr)
        setDayMood(entry?.mood ?? null)
        setDayMemo(entry?.content ?? '')
      } catch {
        setDayMood(null)
        setDayMemo('')
      }
    }
    loadDiary()
  }, [isDayDetailModalOpen, selectedDateStr])

  // ──────────────────────────────────────────
  // 이벤트 핸들러
  // ──────────────────────────────────────────
  const handleSavePeriod = async () => {
    if (!periodStartDate) return
    setSavingPeriod(true)
    try {
      const calcPeriodLength = periodEndDate
        ? Math.max(1, Math.round((new Date(periodEndDate).getTime() - new Date(periodStartDate).getTime()) / 86400000) + 1)
        : (selectedCycleRecord?.periodLength || periodLength)
      await cyclesApi.save({
        id: selectedCycleRecord?.id,
        startDate: periodStartDate,
        endDate: periodEndDate || undefined,
        cycleLength,
        periodLength: calcPeriodLength,
      })
      const updated = await cyclesApi.getAll()
      const unwrap = (r: any) => Array.isArray(r) ? r : (r?.data ?? [])
      setCycles(unwrap(updated))
      setIsDayDetailModalOpen(false)
      setIsEditingPeriod(false)
    } catch {
      Alert.alert('오류', '생리 기록 저장에 실패했어요.')
    } finally {
      setSavingPeriod(false)
    }
  }

  const handleSaveDiary = async () => {
    if (!dayMood && !dayMemo.trim()) return
    setSavingDiary(true)
    try {
      await diaryApi.save(selectedDateStr, {
        mood: dayMood || 'neutral',
        content: dayMemo.trim() || '기분을 기록했어요.',
      })
      setDiarySaved(true)
      setTimeout(() => setDiarySaved(false), 2000)
    } catch {}
    finally {
      setSavingDiary(false)
    }
  }

  const handleAddMedication = () => {
    if (!medName || !medDose) return
    setMedications(prev => [...prev, {
      name: medName,
      dose: medDose,
      times: medTimes,
      startDate: medStartDate || selectedDateStr,
      endDate: medEndDate || undefined,
    }])
    setMedName(''); setMedDose('')
  }

  const handleRemoveMedication = (index: number) =>
    setMedications(prev => prev.filter((_, i) => i !== index))

  // 일정 저장 — 2회차 이상 일정 게이트
  const handleScheduleSubmit = async () => {
    if (!scheduleTitle.trim()) {
      Alert.alert('입력 오류', '일정 제목을 입력해 주세요.')
      return
    }

    // CLINIC 일정 2건 이상 게이트
    const canRegister = canUseClinicScheduler(ClinicFeature.REGISTER_FIRST_SCHEDULE, {
      isPremium,
      existingScheduleCount: schedules.length,
    })
    if (!canRegister) {
      setIsScheduleModalOpen(false)
      setPaywallSource('multi_schedule')
      return
    }

    setSavingSchedule(true)
    try {
      const { chips, defaultValue } = getScheduleChips(treatmentMode)
      const activeChip = chips.find(c => c.value === (scheduleChipValue ?? defaultValue))
      const resolvedType: TreatmentType = (activeChip?.backendType as TreatmentType) ?? scheduleType

      const fullDateTime = `${selectedDateStr}T${scheduleTime || '09:00'}`
      await treatmentApi.save({
        type: resolvedType,
        title: scheduleTitle,
        scheduledAt: fullDateTime,
        status: 'scheduled',
        hospitalName,
        notes: scheduleNotes,
        medications,
      })
      const updatedRaw = await treatmentApi.getAll()
      const updated = Array.isArray(updatedRaw) ? updatedRaw : (updatedRaw?.data ?? [])
      setSchedules(updated)

      const schedulesForAlerts = isPremium
        ? updated
        : updated.map(s => ({ ...s, medications: undefined }))
      rescheduleMedicationAlerts(schedulesForAlerts).catch(() => {})

      // 다음 단계 제안
      const suggestion = getNextStageSuggestion(scheduleChipValue ?? defaultValue ?? '', currentStage, treatmentMode)
      if (suggestion) setStageSuggestion(suggestion)

      setIsScheduleModalOpen(false)
      setScheduleTitle(''); setHospitalName('')
      setScheduleNotes(''); setMedications([])
      setScheduleTime('09:00'); setScheduleChipValue(null)
    } catch (err) {
      console.error(err)
      Alert.alert('저장 실패', '일정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSavingSchedule(false)
    }
  }

  // 약물 알림 켜기 — MEDICATION_REMINDER 게이트
  const handleEnableMedicationReminder = async () => {
    const canEnable = canUseClinicScheduler(ClinicFeature.MEDICATION_REMINDER, { isPremium })
    if (!canEnable) {
      setPaywallSource('medication_reminder')
      return
    }
    // 프리미엄: 현재 일정 기준으로 알림 재스케줄
    try {
      await rescheduleMedicationAlerts(schedules)
    } catch {}
  }

  const handleCheckMed = async (medKey: string) => {
    const updated = { ...checkedMeds, [medKey]: !checkedMeds[medKey] }
    setCheckedMeds(updated)
    try {
      await AsyncStorage.setItem(`med_checked_${selectedDateStr}`, JSON.stringify(updated))
    } catch {}
  }

  const dateSchedules = schedules.filter(s => s.scheduledAt.split('T')[0] === selectedDateStr)
  const dateMedications = schedules.flatMap(s => {
    const isSelectedDateSchedule = s.scheduledAt.split('T')[0] === selectedDateStr
    return (s.medications || []).filter(med => {
      const start = new Date(med.startDate).getTime()
      const end   = med.endDate ? new Date(med.endDate).getTime() : Infinity
      const curr  = new Date(selectedDateStr).getTime()
      return isSelectedDateSchedule || (curr >= start && curr <= end)
    })
  })

  const selectedCycleRecord = cycles.find(c => {
    const start = new Date(c.startDate)
    const pLen  = c.periodLength || 5
    const end   = c.endDate ? new Date(c.endDate) : new Date(start.getTime() + (pLen - 1) * 86400000)
    const sel   = new Date(selectedDateStr)
    return sel >= start && sel <= end
  })
  const selectedDayHormone = hormones.find(h => h.recordedAt === selectedDateStr)

  const getTypeBadge = (sType: string) => {
    switch (sType) {
      case 'IVF': return '🧬 시험관'
      case 'IUI': return '🧪 인공수정'
      case 'FET': return '❄️ 동결이식'
      case 'monitoring': return '🩺 초음파 검진'
      default: return '📅 일반 진료'
    }
  }

  const getBadgeStyle = (sType: string) => {
    switch (sType) {
      case 'IVF': return { backgroundColor: '#ffe4e6', color: '#9f1239' }
      case 'IUI': return { backgroundColor: '#fef3c7', color: '#92400e' }
      case 'FET': return { backgroundColor: '#e0f2fe', color: '#075985' }
      case 'monitoring': return { backgroundColor: '#dcfce7', color: '#166534' }
      default: return { backgroundColor: '#f3f4f6', color: '#374151' }
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={PINK} />
      </View>
    )
  }

  return (
    <>
      <ScrollView style={styles.screen} bounces={false}>
        <View style={styles.container}>

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.navBtn} onPress={goToPrevMonth}>
                <Text style={styles.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{currentYear}년 {currentMonth + 1}월</Text>
              <TouchableOpacity style={styles.navBtn} onPress={goToNextMonth}>
                <Text style={styles.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.headerSubRow}>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{todayPhaseLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.addScheduleBtn}
                onPress={() => { setMedStartDate(selectedDateStr); setIsScheduleModalOpen(true) }}
              >
                <Text style={styles.addScheduleBtnText}>+ 일정 추가</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 요일 */}
          <View style={styles.weekdays}>
            {WEEKDAYS.map(d => (
              <View key={d} style={styles.weekdayCell}>
                <Text style={styles.weekday}>{d}</Text>
              </View>
            ))}
          </View>

          {/* 날짜 그리드 */}
          <View style={styles.grid}>
            {calendarDays.map((day, i) => {
              const dateStr = toLocalDateStr(day.date)
              const dayHormone = hormones.find(h => h.recordedAt === dateStr)
              const daySchedule = schedules.find(s => s.scheduledAt.split('T')[0] === dateStr)
              const markerColor = treatmentMode !== 'natural' && daySchedule
                ? getScheduleMarkerStyle(daySchedule.type).color
                : undefined
              return (
                <DayCell
                  key={i}
                  day={day}
                  isSelected={selectedDate?.getTime() === day.date.getTime()}
                  hasIntercourse={dayHormone?.intercourse === true}
                  hasSchedule={!!daySchedule}
                  scheduleColor={markerColor}
                  onPress={(date) => {
                    selectDate(date)
                    const ds = toLocalDateStr(date)
                    setPeriodStartDate(ds)
                    setPeriodEndDate('')
                    setIsEditingPeriod(false)
                    setIsDayDetailModalOpen(true)
                  }}
                />
              )
            })}
          </View>

          {/* 범례 */}
          <View style={styles.legend}>
            {LEGEND.map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {cycles.length === 0 ? (
            <View style={styles.noCycleBox}>
              <Text style={styles.noCycleTitle}>🌸 생리 시작일을 기록해보세요</Text>
              <Text style={styles.noCycleSub}>
                첫 생리 시작일을 기록하면{'\n'}가임기·배란일 예측을 시작해드려요.
              </Text>
              <TouchableOpacity
                style={styles.noCycleBtn}
                onPress={() => setIsScheduleModalOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.noCycleBtnTxt}>+ 첫 생리 시작일 기록하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CycleSummary
              nextOvulationDate={nextOvulationDate}
              nextPeriodDate={nextPeriodDate}
              currentCycleDay={currentCycleDay}
              cycleLength={cycleLength}
              formatKorDate={formatKorDate}
            />
          )}
          {/* 날짜 탭 힌트 */}
          <Text style={styles.tapHint}>날짜를 탭하면 기록을 확인하거나 추가할 수 있어요</Text>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════
          일정 등록 모달
          ══════════════════════════════════════ */}
      <Modal visible={isScheduleModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 일정 추가 ({selectedDateStr}) 📅</Text>
              <TouchableOpacity onPress={() => setIsScheduleModalOpen(false)}>
                <Text style={styles.closeBtnText}>닫기</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">

              {/* 일정 종류 칩 */}
              {(() => {
                const { chips, defaultValue } = getScheduleChips(treatmentMode)
                const activeValue = scheduleChipValue ?? defaultValue
                return (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>일정 종류</Text>
                    <View style={styles.typeSelector}>
                      {chips.map(chip => (
                        <TouchableOpacity
                          key={chip.value}
                          style={[styles.typeBtn, activeValue === chip.value && styles.activeTypeBtn]}
                          onPress={() => setScheduleChipValue(chip.value)}
                        >
                          <Text style={[styles.typeBtnText, activeValue === chip.value && styles.activeTypeBtnText]}>
                            {chip.emoji} {chip.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )
              })()}

              {/* 시간 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>일정 시간 (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  value={scheduleTime}
                  onChangeText={setScheduleTime}
                  placeholder="예: 09:00"
                  placeholderTextColor="#ffd6e0"
                />
              </View>

              {/* 제목 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>일정 제목 *</Text>
                <TextInput
                  style={styles.input}
                  value={scheduleTitle}
                  onChangeText={setScheduleTitle}
                  placeholder="예: 초음파 진료 및 난포주사 처방"
                  placeholderTextColor="#ffd6e0"
                />
              </View>

              {/* 병원 / 메모 */}
              <View style={styles.gridInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>병원 이름</Text>
                  <TextInput
                    style={styles.input}
                    value={hospitalName}
                    onChangeText={setHospitalName}
                    placeholder="예: 마리아병원"
                    placeholderTextColor="#ffd6e0"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>메모</Text>
                  <TextInput
                    style={styles.input}
                    value={scheduleNotes}
                    onChangeText={setScheduleNotes}
                    placeholder="공복 여부 등"
                    placeholderTextColor="#ffd6e0"
                  />
                </View>
              </View>

              {/* ── 약물 등록 서브폼 ── */}
              <View style={styles.subForm}>
                <Text style={styles.subFormTitle}>💊 동반 복용/투약 약물 추가</Text>

                <View style={styles.gridInputs}>
                  <TextInput
                    style={[styles.input, { flex: 1, height: 38 }]}
                    value={medName}
                    onChangeText={setMedName}
                    placeholder="약물/주사명"
                    placeholderTextColor="#ffd6e0"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, height: 38 }]}
                    value={medDose}
                    onChangeText={setMedDose}
                    placeholder="용량 (예: 150IU)"
                    placeholderTextColor="#ffd6e0"
                  />
                </View>
                <View style={styles.medTimeRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, height: 38 }]}
                    value={medTimes.join(',')}
                    onChangeText={val => setMedTimes(val.split(',').map(v => v.trim()))}
                    placeholder="투약 시간 (예: 08:00)"
                    placeholderTextColor="#ffd6e0"
                  />
                  <TouchableOpacity style={styles.subAddBtn} onPress={handleAddMedication}>
                    <Text style={styles.subAddBtnText}>추가</Text>
                  </TouchableOpacity>
                </View>

                {medications.map((m, idx) => (
                  <View key={idx} style={styles.tempMedItem}>
                    <Text style={styles.tempMedText}>{m.name} ({m.dose}) — 🕒 {m.times.join(', ')}</Text>
                    <TouchableOpacity onPress={() => handleRemoveMedication(idx)}>
                      <Text style={styles.deleteText}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* 약물 알림 안내 — 잠금 미리보기 */}
                {medications.length > 0 && (
                  <TouchableOpacity
                    style={styles.medReminderHint}
                    onPress={() => {
                      if (!isPremium) {
                        setIsScheduleModalOpen(false)
                        setPaywallSource('medication_reminder')
                      }
                    }}
                    disabled={isPremium}
                    activeOpacity={isPremium ? 1 : 0.8}
                  >
                    {isPremium ? (
                      <Text style={styles.medReminderHintTxtPremium}>
                        ✅ 저장 후 투약 체크리스트에서 알림을 켜세요.
                      </Text>
                    ) : (
                      <>
                        <Text style={styles.lockIconSm}>🔒</Text>
                        <Text style={styles.medReminderHintTxtLocked}>
                          <Text style={{ color: PINK, fontWeight: '700' }}>프리미엄으로 알림 켜기</Text>
                          {' '}— 정시 투약 알림
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (!scheduleTitle.trim() || savingSchedule) && styles.submitBtnDisabled]}
                onPress={handleScheduleSubmit}
                disabled={!scheduleTitle.trim() || savingSchedule}
              >
                {savingSchedule
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>일정 저장하기</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 날짜 탭 Day Detail 모달 ── */}
      <Modal
        visible={isDayDetailModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsDayDetailModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.dayModalOverlay}
          activeOpacity={1}
          onPress={() => setIsDayDetailModalOpen(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.dayModalSheet}>

                {/* 헤더 */}
                <View style={styles.dayModalHeader}>
                  <View>
                    <Text style={styles.dayModalDate}>
                      {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('ko-KR', {
                        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                      })}
                    </Text>
                    {(() => {
                      if (selectedCycleRecord) return <Text style={styles.dayPhaseBadgePeriod}>🌷 생리 기간</Text>
                      const h = selectedDayHormone
                      if (h?.opkIndex !== undefined && h.opkIndex >= 8) return <Text style={styles.dayPhaseBadgeOvul}>🌸 배란 가능성 높음</Text>
                      return null
                    })()}
                  </View>
                  <TouchableOpacity onPress={() => setIsDayDetailModalOpen(false)}>
                    <Text style={styles.dayModalClose}>닫기</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                  <View style={styles.dayModalBody}>

                    {/* 0. 기분 & 메모 */}
                    <View style={styles.daySection}>
                      <Text style={styles.daySectionTitle}>😊 오늘 기분 & 메모</Text>
                      <View style={styles.moodGridRow}>
                        {MOODS.slice(0, 5).map(({ mood, emoji, label }) => (
                          <TouchableOpacity
                            key={mood}
                            style={[styles.moodGridBtn, dayMood === mood && styles.moodGridBtnActive]}
                            onPress={() => setDayMood(mood)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.moodGridEmoji}>{emoji}</Text>
                            <Text style={styles.moodGridLabel}>{label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={[styles.moodGridRow, { marginTop: 5 }]}>
                        {MOODS.slice(5).map(({ mood, emoji, label }) => (
                          <TouchableOpacity
                            key={mood}
                            style={[styles.moodGridBtn, dayMood === mood && styles.moodGridBtnActive]}
                            onPress={() => setDayMood(mood)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.moodGridEmoji}>{emoji}</Text>
                            <Text style={styles.moodGridLabel}>{label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        style={styles.memoInput}
                        value={dayMemo}
                        onChangeText={setDayMemo}
                        placeholder="오늘 하루 한 줄 메모..."
                        placeholderTextColor="#c4a0ae"
                        multiline
                        numberOfLines={2}
                      />
                      <TouchableOpacity
                        style={[styles.periodSaveBtn, (savingDiary || (!dayMood && !dayMemo.trim())) && styles.periodSaveBtnDisabled]}
                        onPress={handleSaveDiary}
                        disabled={savingDiary || (!dayMood && !dayMemo.trim())}
                        activeOpacity={0.85}
                      >
                        {savingDiary
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={styles.periodSaveBtnTxt}>
                              {diarySaved ? '✓ 저장됐어요!' : '기분 & 메모 저장'}
                            </Text>
                        }
                      </TouchableOpacity>
                    </View>

                    {/* 1. 생리 기록 */}
                    <View style={styles.daySection}>
                      <View style={styles.daySectionRow}>
                        <Text style={styles.daySectionTitle}>🌷 생리 기록</Text>
                        <TouchableOpacity
                          style={styles.daySectionBtn}
                          onPress={() => {
                            if (selectedCycleRecord) {
                              if (isEditingPeriod) {
                                setIsEditingPeriod(false)
                              } else {
                                setPeriodStartDate(selectedCycleRecord?.startDate || selectedDateStr)
                                const existingEnd = selectedCycleRecord?.endDate
                                if (existingEnd) {
                                  setPeriodEndDate(existingEnd)
                                } else {
                                  const start = new Date(selectedCycleRecord?.startDate || selectedDateStr)
                                  start.setDate(start.getDate() + (selectedCycleRecord?.periodLength || periodLength) - 1)
                                  setPeriodEndDate(toLocalDateStr(start))
                                }
                                setIsEditingPeriod(true)
                              }
                            } else {
                              setPeriodStartDate(selectedDateStr)
                              setPeriodEndDate('')
                              setIsEditingPeriod(true)
                            }
                          }}
                        >
                          <Text style={styles.daySectionBtnTxt}>
                            {selectedCycleRecord 
                              ? (isEditingPeriod ? '수정 취소' : '수정하기') 
                              : '기록하기'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {selectedCycleRecord && !isEditingPeriod ? (
                        <View style={styles.daySectionContent}>
                          <Text style={styles.dayInfoRow}>시작: <Text style={styles.dayInfoVal}>{selectedCycleRecord.startDate}</Text></Text>
                          {selectedCycleRecord.endDate && (
                            <Text style={styles.dayInfoRow}>종료: <Text style={styles.dayInfoVal}>{selectedCycleRecord.endDate}</Text></Text>
                          )}
                          <Text style={styles.dayInfoRow}>주기: <Text style={styles.dayInfoVal}>{selectedCycleRecord.cycleLength}일</Text></Text>
                        </View>
                      ) : (
                        <View>
                          {!selectedCycleRecord && <Text style={styles.dayEmptyTxt}>이 날짜의 생리 기록이 없어요</Text>}
                          {/* 인라인 생리 입력 */}
                          <View style={styles.periodInputRow}>
                            <View style={styles.periodInputGroup}>
                              <Text style={styles.periodInputLabel}>시작일</Text>
                              <TextInput
                                style={styles.periodInput}
                                value={periodStartDate}
                                onChangeText={setPeriodStartDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#c4a0ae"
                                autoFocus={isEditingPeriod}
                              />
                            </View>
                            <View style={styles.periodInputGroup}>
                              <Text style={styles.periodInputLabel}>종료일 (선택)</Text>
                              <TextInput
                                style={styles.periodInput}
                                value={periodEndDate}
                                onChangeText={setPeriodEndDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#c4a0ae"
                              />
                            </View>
                          </View>
                          <TouchableOpacity
                            style={[styles.periodSaveBtn, (!periodStartDate || savingPeriod) && styles.periodSaveBtnDisabled]}
                            onPress={handleSavePeriod}
                            disabled={!periodStartDate || savingPeriod}
                            activeOpacity={0.85}
                          >
                            {savingPeriod
                              ? <ActivityIndicator color="#fff" size="small" />
                              : <Text style={styles.periodSaveBtnTxt}>
                                  {selectedCycleRecord ? '기록 수정 완료' : '생리 기록 저장'}
                                </Text>
                            }
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* 2. 건강 기록 요약 */}
                    <View style={styles.daySection}>
                      <View style={styles.daySectionRow}>
                        <Text style={styles.daySectionTitle}>🌡️ 건강 기록</Text>
                      </View>
                      {selectedDayHormone ? (
                        <View style={styles.healthRow}>
                          {selectedDayHormone.bbt !== undefined && (
                            <View style={styles.healthChip}>
                              <Text style={styles.healthChipTxt}>🌡️ {selectedDayHormone.bbt}°C</Text>
                            </View>
                          )}
                          {selectedDayHormone.opkIndex !== undefined && (
                            <View style={styles.healthChip}>
                              <Text style={styles.healthChipTxt}>🥚 OPK {selectedDayHormone.opkIndex}/10</Text>
                            </View>
                          )}
                          {selectedDayHormone.intercourse !== undefined && (
                            <View style={styles.healthChip}>
                              <Text style={styles.healthChipTxt}>{selectedDayHormone.intercourse ? '❤️ 관계 있음' : '🤍 관계 없음'}</Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.dayEmptyTxt}>BBT, OPK, 관계 기록이 없어요</Text>
                      )}
                    </View>

                    {/* 3. 복용 체크리스트 */}
                    {dateMedications.length > 0 && (
                      <View style={styles.daySection}>
                        <Text style={styles.daySectionTitle}>💊 복용 체크리스트</Text>
                        <View style={{ gap: 6, marginTop: 8 }}>
                          {dateMedications.map((med, i) => {
                            const medKey = `${med.name}_${med.dose}_${med.times.join(',')}`
                            const isChecked = !!checkedMeds[medKey]
                            return (
                              <TouchableOpacity
                                key={i}
                                style={[styles.checkItem, isChecked && styles.checkItemDone]}
                                onPress={() => handleCheckMed(medKey)}
                              >
                                <View style={styles.checkLeft}>
                                  <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                                    {isChecked && <Text style={styles.checkTick}>✓</Text>}
                                  </View>
                                  <View>
                                    <Text style={[styles.medName, isChecked && styles.textDone]}>{med.name}</Text>
                                    <Text style={styles.medDose}>용량: {med.dose}</Text>
                                  </View>
                                </View>
                                <Text style={[styles.timeLabel, isChecked && styles.timeLabelDone]}>
                                  🕒 {med.times.join(', ')}
                                </Text>
                              </TouchableOpacity>
                            )
                          })}
                        </View>
                        {/* 약물 알림 게이트 */}
                        <View style={{ marginTop: 10 }}>
                          {isPremium ? (
                            <TouchableOpacity style={styles.reminderBtn} onPress={handleEnableMedicationReminder} activeOpacity={0.8}>
                              <Text style={styles.reminderBtnIcon}>🔔</Text>
                              <Text style={styles.reminderBtnTxt}>약물 알림 켜기</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.lockedBtn} onPress={() => { setIsDayDetailModalOpen(false); setPaywallSource('medication_reminder') }} activeOpacity={0.8}>
                              <View style={styles.lockedLeft}>
                                <Text style={styles.lockIcon}>🔒</Text>
                                <View>
                                  <Text style={styles.lockedTitle}>프리미엄으로 알림 켜기</Text>
                                  <Text style={styles.lockedDesc}>정시 투약 푸시 알림 활성화</Text>
                                </View>
                              </View>
                              <Text style={styles.lockedArrow}>›</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}

                    {/* 4. 시술 일정 */}
                    <View style={styles.daySection}>
                      <View style={styles.daySectionRow}>
                        <Text style={styles.daySectionTitle}>📅 시술 일정</Text>
                        <TouchableOpacity
                          style={styles.daySectionBtn}
                          onPress={() => { setMedStartDate(selectedDateStr); setIsDayDetailModalOpen(false); setIsScheduleModalOpen(true) }}
                        >
                          <Text style={styles.daySectionBtnTxt}>+ 일정 추가</Text>
                        </TouchableOpacity>
                      </View>
                      {dateSchedules.length > 0 ? (
                        <View style={{ gap: 8, marginTop: 8 }}>
                          {dateSchedules.map((sc, i) => {
                            const timeStr = new Date(sc.scheduledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                            const badgeStyle = getBadgeStyle(sc.type)
                            return (
                              <View key={sc.id || i} style={styles.dayScheduleItem}>
                                <View style={styles.dayScheduleHeader}>
                                  <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }]}>
                                    <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{getTypeBadge(sc.type)}</Text>
                                  </View>
                                  <Text style={styles.itemTime}>{timeStr}</Text>
                                </View>
                                <Text style={styles.itemTitle}>{sc.title}</Text>
                                {sc.hospitalName ? <Text style={styles.itemHospital}>🏢 {sc.hospitalName}</Text> : null}
                              </View>
                            )
                          })}
                        </View>
                      ) : (
                        <Text style={styles.dayEmptyTxt}>등록된 시술 일정이 없어요</Text>
                      )}
                    </View>

                    <View style={{ height: 16 }} />
                  </View>
                </ScrollView>

              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* 단계 전환 제안 모달 */}
      <Modal visible={stageSuggestion !== null} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 16, color: DARK_ROSE }}>단계 이동 제안</Text>
            <Text style={{ fontFamily: F.regular, fontSize: 13, color: MUTED, lineHeight: 20 }}>
              {stageSuggestion?.message}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#ffeef2', alignItems: 'center' }}
                onPress={() => setStageSuggestion(null)}
              >
                <Text style={{ fontFamily: F.semiBold, fontSize: 13, color: MUTED }}>나중에</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: PINK, alignItems: 'center' }}
                onPress={async () => {
                  if (!stageSuggestion) return
                  try {
                    const { useUserStore: _store } = await import('@fertility/shared')
                    _store.getState().setCurrentStage(stageSuggestion.nextStage)
                    await usersApi.updateProfile({ currentStage: stageSuggestion.nextStage })
                  } catch {}
                  setStageSuggestion(null)
                }}
              >
                <Text style={{ fontFamily: F.semiBold, fontSize: 13, color: '#fff' }}>
                  {stageSuggestion?.label}(으)로 이동
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 페이월 모달 */}
      <PaywallModal
        visible={paywallSource !== null}
        source={paywallSource ?? 'generic'}
        onClose={() => setPaywallSource(null)}
        onSuccess={() => {}}
      />
    </>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff8f9' },
  container: {
    backgroundColor: '#fff8f9',
    borderRadius: 28,
    overflow: 'hidden',
    margin: 12,
    borderWidth: 0.5,
    borderColor: '#f9c6d0',
  },

  // 헤더
  header: { backgroundColor: PINK, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTitle: { fontFamily: F.bold,     fontSize: 18, color: '#fff' },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontFamily: F.regular,  fontSize: 20, color: '#fff', lineHeight: 24 },
  headerSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  statusText: { fontFamily: F.bold,     fontSize: 12, color: '#fff' },
  addScheduleBtn: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  addScheduleBtnText: { fontFamily: F.bold, color: PINK, fontSize: 11 },

  // 달력
  weekdays:    { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 2 },
  weekdayCell: { width: DAY_CELL_W, marginHorizontal: 2, alignItems: 'center' },
  weekday:     { fontFamily: F.bold, fontSize: 11, color: PINK },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 12 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontFamily: F.semiBold, fontSize: 11, color: '#8c5060' },

  // 주기 기록 없을 때 빈 상태
  noCycleBox: {
    backgroundColor: '#fff8f9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  noCycleTitle:  { fontFamily: F.bold,    fontSize: 14, color: DARK_ROSE },
  noCycleSub:    { fontFamily: F.regular, fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18 },
  noCycleBtn: {
    backgroundColor: PINK, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 10, marginTop: 4,
  },
  noCycleBtnTxt: { fontFamily: F.bold, fontSize: 13, color: '#fff' },

  // 상세 섹션
  dateRecordsContainer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#fce4f5', gap: 14 },
  selectedDateTitle: { fontFamily: F.bold,    fontSize: 14, color: '#8c5060', marginBottom: 4 },
  card: { backgroundColor: '#fff8f9', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: BORDER },
  cardTitle: { fontFamily: F.bold,    fontSize: 11, color: PINK, marginBottom: 10 },

  // 체크리스트
  checklist: { gap: 8 },
  checkItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 10 },
  checkItemDone: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  checkLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: PINK, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: PINK, borderColor: PINK },
  checkTick: { fontFamily: F.bold,    color: '#fff', fontSize: 10 },
  medName: { fontFamily: F.bold,      fontSize: 11, color: DARK_ROSE },
  textDone: { color: '#9ca3af', textDecorationLine: 'line-through' },
  medDose: { fontFamily: F.regular,   fontSize: 8, color: '#9ca3af', marginTop: 1 },
  timeLabel: { fontFamily: F.bold,    fontSize: 9, color: PINK, backgroundColor: '#ffe4e6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  timeLabelDone: { color: '#9ca3af', backgroundColor: '#f3f4f6' },
  emptyText: { fontFamily: F.regular, fontSize: 11, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },

  // 약물 알림 게이트
  reminderDivider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  reminderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f3e8ff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#d8b4fe',
  },
  reminderBtnIcon: { fontSize: 15 },
  reminderBtnTxt: { fontFamily: F.bold,     fontSize: 12, color: '#7c3aed' },
  lockedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: LIGHT_PINK, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  lockedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockIcon: { fontSize: 15 },
  lockedTitle: { fontFamily: F.bold,    fontSize: 12, color: PINK },
  lockedDesc: { fontFamily: F.regular,  fontSize: 10, color: MUTED, marginTop: 1 },
  lockedArrow: { fontFamily: F.regular, fontSize: 16, color: BORDER },

  // 타임라인
  emptyScheduleContainer: { alignItems: 'center', paddingVertical: 10, gap: 6 },
  addTextLink: { fontFamily: F.bold,     fontSize: 11, color: PINK, textDecorationLine: 'underline' },
  timeline: { gap: 10 },
  timelineItem: { flexDirection: 'row' },
  itemContent: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: BORDER, gap: 4 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontFamily: F.bold,     fontSize: 8 },
  itemTime: { fontFamily: F.regular,   fontSize: 8, color: '#9ca3af' },
  itemTitle: { fontFamily: F.bold,     fontSize: 11, color: DARK_ROSE },
  itemHospital: { fontFamily: F.regular, fontSize: 8, color: '#9ca3af' },
  notesBox: { backgroundColor: '#fff8f9', borderWidth: 0.5, borderColor: BORDER, padding: 6, borderRadius: 8 },
  notesText: { fontFamily: F.regular,  fontSize: 9, color: '#8c5060', fontStyle: 'italic' },

  // 일정 등록 모달
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: F.bold,    fontSize: 14, color: DARK_ROSE },
  closeBtnText: { fontFamily: F.regular, fontSize: 11, color: '#9ca3af' },
  formContainer: { gap: 10 },
  inputGroup: { marginBottom: 8 },
  inputLabel: { fontFamily: F.bold,    fontSize: 10, color: PINK, marginBottom: 3 },
  input: { fontFamily: F.regular, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff8f9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: DARK_ROSE },
  gridInputs: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  typeBtn: { backgroundColor: '#fff8f9', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  activeTypeBtn: { backgroundColor: PINK, borderColor: PINK },
  typeBtnText: { fontFamily: F.bold,   fontSize: 8, color: PINK },
  activeTypeBtnText: { color: '#fff' },
  subForm: { backgroundColor: '#fff8f9', borderWidth: 1, borderColor: BORDER, padding: 10, borderRadius: 14, gap: 6, marginBottom: 8 },
  subFormTitle: { fontFamily: F.bold,  fontSize: 10, color: PINK },
  medTimeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  subAddBtn: { backgroundColor: '#ffe4e6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  subAddBtnText: { fontFamily: F.bold, color: PINK, fontSize: 10 },
  tempMedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 6, borderRadius: 8, borderWidth: 0.5, borderColor: BORDER },
  tempMedText: { fontFamily: F.regular, fontSize: 8, color: DARK_ROSE, flex: 1 },
  deleteText: { fontFamily: F.regular,  fontSize: 8, color: '#ef4444' },

  // 약물 알림 힌트 (모달 내)
  medReminderHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  lockIconSm: { fontSize: 12 },
  medReminderHintTxtLocked: { fontFamily: F.regular,  fontSize: 10, color: MUTED, flex: 1 },
  medReminderHintTxtPremium: { fontFamily: F.semiBold, fontSize: 10, color: '#7c3aed' },

  submitBtn: { backgroundColor: PINK, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontFamily: F.bold, color: '#fff', fontSize: 12 },

  // 날짜 탭 힌트
  tapHint: { fontFamily: F.regular, fontSize: 11, color: '#c4a0ae', textAlign: 'center', paddingVertical: 10 },

  // 기분 & 메모 (Day Detail 모달 내)
  moodGridRow: { flexDirection: 'row', gap: 5, marginTop: 8 },
  moodGridBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#ffd6e0',
    backgroundColor: '#fff',
    gap: 1,
  },
  moodGridBtnActive: {
    backgroundColor: '#ffd6e0',
    borderColor: '#ffb3c6',
  },
  moodGridEmoji: { fontSize: 16 },
  moodGridLabel: { fontFamily: F.semiBold, fontSize: 9, color: '#8c5060' },
  memoInput: {
    fontFamily: F.regular,
    borderWidth: 1,
    borderColor: '#ffd6e0',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#5a3042',
    marginTop: 8,
    minHeight: 56,
    textAlignVertical: 'top',
  },

  // Day Detail 모달
  dayModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  dayModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  dayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dayModalDate: { fontFamily: F.bold, fontSize: 15, color: DARK_ROSE },
  dayPhaseBadgePeriod: {
    fontFamily: F.bold,
    fontSize: 11,
    color: '#c0005a',
    backgroundColor: '#ffd6e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  dayPhaseBadgeOvul: {
    fontFamily: F.bold,
    fontSize: 11,
    color: '#7c3aed',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  dayModalClose: { fontFamily: F.regular,  fontSize: 13, color: '#9ca3af', paddingTop: 2 },
  dayModalBody: { gap: 14 },

  // 섹션
  daySection: {
    backgroundColor: '#fff8f9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  daySectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  daySectionTitle: { fontFamily: F.bold,    fontSize: 13, color: DARK_ROSE },
  daySectionBtn: {
    backgroundColor: PINK,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  daySectionBtnTxt: { fontFamily: F.bold,    fontSize: 11, color: '#fff' },
  daySectionContent: { gap: 4 },
  dayInfoRow: { fontFamily: F.regular,  fontSize: 12, color: MUTED },
  dayInfoVal: { fontFamily: F.bold,     color: DARK_ROSE },
  dayEmptyTxt: { fontFamily: F.regular, fontSize: 11, color: '#c4a0ae', marginBottom: 8 },

  // 생리 입력 폼
  periodInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  periodInputGroup: { flex: 1 },
  periodInputLabel: { fontFamily: F.bold,    fontSize: 10, color: PINK, marginBottom: 3 },
  periodInput: {
    fontFamily: F.regular,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 12,
    color: DARK_ROSE,
  },
  periodSaveBtn: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  periodSaveBtnDisabled: { opacity: 0.45 },
  periodSaveBtnTxt: { fontFamily: F.bold, fontSize: 12, color: '#fff' },

  // 건강 기록 칩
  healthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  healthChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  healthChipTxt: { fontFamily: F.semiBold, fontSize: 12, color: DARK_ROSE },

  // 시술 일정 아이템
  dayScheduleItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    gap: 4,
  },
  dayScheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})
