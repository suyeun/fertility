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
} from 'react-native'
import {
  useCycleCalendar, cyclesApi, hormonesApi, treatmentApi, diaryApi,
  canUseClinicScheduler, isPremiumProfile, ClinicFeature,
} from '@fertility/shared'
import type {
  TreatmentSchedule, Medication, TreatmentType, HormoneRecord,
  UserProfile, PaywallSource,
} from '@fertility/shared'
import { DayCell } from '../../components/calendar/DayCell'
import { CycleSummary } from '../../components/calendar/CycleSummary'
import { MoodPicker } from '../../components/calendar/MoodPicker'
import PaywallModal from '../../components/PaywallModal'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { rescheduleMedicationAlerts } from '../../lib/notifications'
import { getSubscriptionStatus } from '../../lib/purchases'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const LEGEND = [
  { color: '#ffd6e0', label: '생리' },
  { color: '#fce4f5', label: '가임기' },
  { color: '#ff8fab', label: '배란일' },
  { color: '#fda4af', label: '관계일(❤️)' },
]

const PINK      = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED     = '#b07080'
const BORDER    = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

export default function CalendarScreen() {
  const [user, setUser]         = useState<any>(null)
  const [profile, setProfile]   = useState<UserProfile | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [cycles, setCycles]     = useState<any[]>([])
  const [schedules, setSchedules] = useState<TreatmentSchedule[]>([])
  const [hormones, setHormones] = useState<HormoneRecord[]>([])
  const [loading, setLoading]   = useState(true)

  // 페이월 모달
  const [paywallSource, setPaywallSource] = useState<PaywallSource | null>(null)

  // 일정 등록 폼 상태
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [scheduleType,  setScheduleType]  = useState<TreatmentType>('IVF')
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
      setCycles(fetchedCycles)
      setHormones(fetchedHormones)
      setSchedules(fetchedSchedules)
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

        // 프로필 + 구독 상태 병렬 로드
        const [p, sub] = await Promise.all([
          // usersApi.getProfile()은 @fertility/shared에서 import 필요
          import('@fertility/shared').then(m => m.usersApi.getProfile()).catch(() => null),
          getSubscriptionStatus(),
        ])

        if (p) {
          setProfile(p)
          // TODO: [RevenueCat 연동] RevenueCat SDK(sub.isActive)가 단일 소스.
          // profile의 subscriptionStatus는 웹훅 동기화 지연이 있을 수 있으므로
          // 모바일에서는 SDK 값을 우선한다.
          setIsPremium(sub.isActive)
        }

        await fetchData(u.uid)
      } catch { setLoading(false) }
    }
    init()
  }, [fetchData])

  // 페이월 성공 후 구독 상태 새로고침
  const handlePaywallSuccess = async () => {
    const sub = await getSubscriptionStatus()
    setIsPremium(sub.isActive)
  }

  // ──────────────────────────────────────────
  // 달력 상태
  // ──────────────────────────────────────────
  const latestCycle = cycles[0]
  const lastPeriod  = latestCycle ? new Date(latestCycle.startDate) : new Date('2024-01-15')
  const cycleLength  = latestCycle?.cycleLength  || 28
  const periodLength = latestCycle?.periodLength || 5

  const {
    currentYear, currentMonth, calendarDays,
    selectedDate, selectedMood,
    nextOvulationDate, nextPeriodDate,
    currentCycleDay, todayPhaseLabel,
    goToPrevMonth, goToNextMonth,
    selectDate, selectMood, formatKorDate,
  } = useCycleCalendar(lastPeriod, cycleLength, periodLength)

  const selectedDateStr = selectedDate
    ? selectedDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  useEffect(() => {
    const loadCheckedMeds = async () => {
      try {
        const saved = await AsyncStorage.getItem(`med_checked_${selectedDateStr}`)
        setCheckedMeds(saved ? JSON.parse(saved) : {})
      } catch { setCheckedMeds({}) }
    }
    loadCheckedMeds()
  }, [selectedDateStr])

  // ──────────────────────────────────────────
  // 이벤트 핸들러
  // ──────────────────────────────────────────
  const handleSelectMood = async (mood: any) => {
    selectMood(mood)
    if (user) {
      try {
        const diaries = await diaryApi.getAll()
        const todayDiary = diaries.find(d => d.date === selectedDateStr)
        await diaryApi.save(selectedDateStr, {
          mood,
          content: todayDiary?.content || '오늘 기분을 캘린더에서 기록했어요.',
        })
      } catch {}
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
    if (!user || !scheduleTitle.trim()) return

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
      const fullDateTime = `${selectedDateStr}T${scheduleTime || '09:00'}`
      await treatmentApi.save({
        type: scheduleType,
        title: scheduleTitle,
        scheduledAt: fullDateTime,
        status: 'scheduled',
        hospitalName,
        notes: scheduleNotes,
        medications,
      })
      const updated = await treatmentApi.getAll()
      setSchedules(updated)

      // [데이터 보존] 약물 기록 데이터는 항상 저장. 알림 스케줄만 프리미엄 게이트.
      // 비프리미엄: 약물 데이터는 저장되지만 로컬 알림은 스케줄하지 않는다.
      const schedulesForAlerts = isPremium
        ? updated
        : updated.map(s => ({ ...s, medications: undefined }))
      rescheduleMedicationAlerts(schedulesForAlerts).catch(() => {})

      setIsScheduleModalOpen(false)
      setScheduleTitle(''); setHospitalName('')
      setScheduleNotes(''); setMedications([])
      setScheduleTime('09:00')
    } catch (err) {
      console.error(err)
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
            {WEEKDAYS.map(d => <Text key={d} style={styles.weekday}>{d}</Text>)}
          </View>

          {/* 날짜 그리드 */}
          <View style={styles.grid}>
            {calendarDays.map((day, i) => {
              const dateStr = day.date.toISOString().split('T')[0]
              const dayHormone = hormones.find(h => h.recordedAt === dateStr)
              return (
                <DayCell
                  key={i}
                  day={day}
                  isSelected={selectedDate?.getTime() === day.date.getTime()}
                  hasIntercourse={dayHormone?.intercourse === true}
                  onPress={selectDate}
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

          <CycleSummary
            nextOvulationDate={nextOvulationDate}
            nextPeriodDate={nextPeriodDate}
            currentCycleDay={currentCycleDay}
            cycleLength={cycleLength}
            formatKorDate={formatKorDate}
          />
          <MoodPicker selected={selectedMood} onSelect={handleSelectMood} />

          {/* ══════════════════════════════════════
              선택한 날짜 상세
              ══════════════════════════════════════ */}
          <View style={styles.dateRecordsContainer}>
            <Text style={styles.selectedDateTitle}>🌸 {selectedDateStr} 상세 일정</Text>

            {/* ── 투약 체크리스트 ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💊 복용/투약 체크리스트</Text>

              {/* [데이터 보존] 약물 기록 원본은 구독 상태와 무관하게 항상 표시 */}
              {dateMedications.length > 0 ? (
                <View style={styles.checklist}>
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
              ) : (
                <Text style={styles.emptyText}>선택된 날짜의 예정된 투약이 없습니다.</Text>
              )}

              {/* ── 약물 알림 — 프리미엄 게이트 ── */}
              <View style={styles.reminderDivider} />
              {isPremium ? (
                // 프리미엄: 알림 켜기 버튼 활성
                <TouchableOpacity
                  style={styles.reminderBtn}
                  onPress={handleEnableMedicationReminder}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reminderBtnIcon}>🔔</Text>
                  <Text style={styles.reminderBtnTxt}>약물 알림 켜기</Text>
                </TouchableOpacity>
              ) : (
                // 비프리미엄: 잠긴 미리보기 — 숨기지 않고 비활성 노출
                <TouchableOpacity
                  style={styles.lockedBtn}
                  onPress={() => setPaywallSource('medication_reminder')}
                  activeOpacity={0.8}
                >
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

            {/* ── 시술/진료 일정 타임라인 ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 시술 및 진료 일정</Text>
              {dateSchedules.length > 0 ? (
                <View style={styles.timeline}>
                  {dateSchedules.map((sc, i) => {
                    const dateObj = new Date(sc.scheduledAt)
                    const timeStr = dateObj.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                    const badgeStyle = getBadgeStyle(sc.type)
                    return (
                      <View key={sc.id || i} style={styles.timelineItem}>
                        <View style={styles.itemContent}>
                          <View style={styles.itemHeader}>
                            <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }]}>
                              <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{getTypeBadge(sc.type)}</Text>
                            </View>
                            <Text style={styles.itemTime}>{timeStr}</Text>
                          </View>
                          <Text style={styles.itemTitle}>{sc.title}</Text>
                          {sc.hospitalName ? <Text style={styles.itemHospital}>🏢 {sc.hospitalName}</Text> : null}
                          {sc.notes ? (
                            <View style={styles.notesBox}>
                              <Text style={styles.notesText}>{sc.notes}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    )
                  })}
                </View>
              ) : (
                <View style={styles.emptyScheduleContainer}>
                  <Text style={styles.emptyText}>등록된 시술/진료 일정이 없습니다.</Text>
                  <TouchableOpacity onPress={() => { setMedStartDate(selectedDateStr); setIsScheduleModalOpen(true) }}>
                    <Text style={styles.addTextLink}>+ 일정 등록하기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
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

              {/* 일정 종류 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>일정 종류</Text>
                <View style={styles.typeSelector}>
                  {(['IVF', 'IUI', 'FET', 'monitoring', 'other'] as TreatmentType[]).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, scheduleType === t && styles.activeTypeBtn]}
                      onPress={() => setScheduleType(t)}
                    >
                      <Text style={[styles.typeBtnText, scheduleType === t && styles.activeTypeBtnText]}>
                        {t === 'IVF' && '시험관'}
                        {t === 'IUI' && '인공수정'}
                        {t === 'FET' && '동결이식'}
                        {t === 'monitoring' && '초음파'}
                        {t === 'other' && '기타'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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

      {/* 페이월 모달 */}
      <PaywallModal
        visible={paywallSource !== null}
        source={paywallSource ?? 'generic'}
        onClose={() => setPaywallSource(null)}
        onSuccess={handlePaywallSuccess}
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
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 20, color: '#fff', lineHeight: 24 },
  headerSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  addScheduleBtn: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  addScheduleBtnText: { color: PINK, fontSize: 11, fontWeight: '700' },

  // 달력
  weekdays: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: PINK },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 12 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, fontWeight: '600', color: '#8c5060' },

  // 상세 섹션
  dateRecordsContainer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#fce4f5', gap: 14 },
  selectedDateTitle: { fontSize: 14, fontWeight: '700', color: '#8c5060', marginBottom: 4 },
  card: { backgroundColor: '#fff8f9', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: BORDER },
  cardTitle: { fontSize: 11, fontWeight: '700', color: PINK, marginBottom: 10 },

  // 체크리스트
  checklist: { gap: 8 },
  checkItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 10 },
  checkItemDone: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  checkLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: PINK, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: PINK, borderColor: PINK },
  checkTick: { color: '#fff', fontSize: 10, fontWeight: '700' },
  medName: { fontSize: 11, fontWeight: '700', color: DARK_ROSE },
  textDone: { color: '#9ca3af', textDecorationLine: 'line-through' },
  medDose: { fontSize: 8, color: '#9ca3af', marginTop: 1 },
  timeLabel: { fontSize: 9, fontWeight: '700', color: PINK, backgroundColor: '#ffe4e6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  timeLabelDone: { color: '#9ca3af', backgroundColor: '#f3f4f6' },
  emptyText: { fontSize: 11, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },

  // 약물 알림 게이트
  reminderDivider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  reminderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f3e8ff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#d8b4fe',
  },
  reminderBtnIcon: { fontSize: 15 },
  reminderBtnTxt: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  lockedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: LIGHT_PINK, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  lockedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockIcon: { fontSize: 15 },
  lockedTitle: { fontSize: 12, fontWeight: '700', color: PINK },
  lockedDesc: { fontSize: 10, color: MUTED, marginTop: 1 },
  lockedArrow: { fontSize: 16, color: BORDER },

  // 타임라인
  emptyScheduleContainer: { alignItems: 'center', paddingVertical: 10, gap: 6 },
  addTextLink: { fontSize: 11, color: PINK, fontWeight: '700', textDecorationLine: 'underline' },
  timeline: { gap: 10 },
  timelineItem: { flexDirection: 'row' },
  itemContent: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: BORDER, gap: 4 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 8, fontWeight: '700' },
  itemTime: { fontSize: 8, color: '#9ca3af' },
  itemTitle: { fontSize: 11, fontWeight: '700', color: DARK_ROSE },
  itemHospital: { fontSize: 8, color: '#9ca3af' },
  notesBox: { backgroundColor: '#fff8f9', borderWidth: 0.5, borderColor: BORDER, padding: 6, borderRadius: 8 },
  notesText: { fontSize: 9, color: '#8c5060', fontStyle: 'italic' },

  // 일정 등록 모달
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 14, fontWeight: '700', color: DARK_ROSE },
  closeBtnText: { fontSize: 11, color: '#9ca3af' },
  formContainer: { gap: 10 },
  inputGroup: { marginBottom: 8 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: PINK, marginBottom: 3 },
  input: { borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff8f9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: DARK_ROSE },
  gridInputs: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  typeBtn: { backgroundColor: '#fff8f9', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  activeTypeBtn: { backgroundColor: PINK, borderColor: PINK },
  typeBtnText: { fontSize: 8, fontWeight: '700', color: PINK },
  activeTypeBtnText: { color: '#fff' },
  subForm: { backgroundColor: '#fff8f9', borderWidth: 1, borderColor: BORDER, padding: 10, borderRadius: 14, gap: 6, marginBottom: 8 },
  subFormTitle: { fontSize: 10, fontWeight: '700', color: PINK },
  medTimeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  subAddBtn: { backgroundColor: '#ffe4e6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  subAddBtnText: { color: PINK, fontSize: 10, fontWeight: '700' },
  tempMedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 6, borderRadius: 8, borderWidth: 0.5, borderColor: BORDER },
  tempMedText: { fontSize: 8, color: DARK_ROSE, flex: 1 },
  deleteText: { fontSize: 8, color: '#ef4444' },

  // 약물 알림 힌트 (모달 내)
  medReminderHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  lockIconSm: { fontSize: 12 },
  medReminderHintTxtLocked: { fontSize: 10, color: MUTED, flex: 1 },
  medReminderHintTxtPremium: { fontSize: 10, color: '#7c3aed', fontWeight: '600' },

  submitBtn: { backgroundColor: PINK, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})
