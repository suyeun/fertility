'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { treatmentApi } from '@fertility/shared'
import {
  canUseClinicScheduler, isPremiumProfile, ClinicFeature,
} from '@fertility/shared'
import type {
  TreatmentSchedule, TreatmentType, TreatmentStatus, Medication, UserMode,
  PaywallSource,
} from '@fertility/shared'
import {
  Plus, Calendar, Building2, Pill, ChevronDown, ChevronUp,
  CheckCircle2, Clock, XCircle, Trash2, AlertCircle, Syringe,
  Lock, Bell, BellOff,
} from 'lucide-react'
import PaywallModal from '../../../components/PaywallModal'

// ============================
// 모드별 일정 종류 설정
// ============================

const CLINIC_TYPE_LABELS: Record<TreatmentType, string> = {
  IVF:        '🧬 시험관 (IVF)',
  IUI:        '🧪 인공수정 (IUI)',
  FET:        '❄️ 동결이식 (FET)',
  monitoring: '🔬 초음파/모니터링',
  other:      '📋 기타 진료',
}

// NATURAL 모드 전용 — TreatmentType 재활용 (monitoring=산부인과, other=메모, IUI=숙제일)
const NATURAL_TYPE_OPTIONS: { type: TreatmentType; label: string }[] = [
  { type: 'monitoring', label: '🏥 산부인과 방문 / 초음파' },
  { type: 'IUI',        label: '❤️ 오늘의 숙제 (관계일)' },
  { type: 'other',      label: '📝 일반 건강/기록 메모' },
]

const TYPE_COLORS: Record<TreatmentType, string> = {
  IVF:        'bg-purple-100 text-purple-700',
  IUI:        'bg-pink-100 text-pink-700',
  FET:        'bg-sky-100 text-sky-700',
  monitoring: 'bg-rose-100 text-rose-700',
  other:      'bg-gray-100 text-gray-600',
}

const STATUS_CONFIG: Record<TreatmentStatus, { label: string; icon: React.ReactNode; color: string }> = {
  scheduled: { label: '예정',  icon: <Clock size={13} />,        color: 'text-amber-600 bg-amber-50 border-amber-200' },
  completed: { label: '완료',  icon: <CheckCircle2 size={13} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelled: { label: '취소',  icon: <XCircle size={13} />,      color: 'text-gray-400 bg-gray-50 border-gray-200' },
}

const EMPTY_MED = {
  name: '', dose: '',
  times: ['08:00'],
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
}

export default function TreatmentPage() {
  const { user, profile } = useAuth()

  const mode: UserMode = (profile?.currentMode as UserMode)
    ?? (profile?.treatmentStage === 'natural' ? 'NATURAL' : 'CLINIC')

  // TODO: [RevenueCat 연동] profile.subscriptionStatus는 RevenueCat 웹훅이 동기화.
  // isPremiumProfile은 해당 필드만 읽으며 로컬에서 임의 override하지 않는다.
  const isPremium = profile
    ? isPremiumProfile({
        subscriptionStatus: profile.subscriptionStatus,
        trialEndsAt: profile.trialEndsAt,
        subscriptionExpiresAt: profile.subscriptionExpiresAt,
      })
    : false

  const [schedules,    setSchedules]    = useState<TreatmentSchedule[]>([])
  const [loading,      setLoading]      = useState(true)
  const [isModalOpen,  setIsModalOpen]  = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)

  // 페이월 모달 상태
  const [paywallSource, setPaywallSource] = useState<PaywallSource | null>(null)

  const showPaywall = (source: PaywallSource) => setPaywallSource(source)

  // 폼 상태
  const defaultType: TreatmentType = mode === 'NATURAL' ? 'monitoring' : 'monitoring'
  const [type,          setType]          = useState<TreatmentType>(defaultType)
  const [title,         setTitle]         = useState('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [hospitalName,  setHospitalName]  = useState('')
  const [notes,         setNotes]         = useState('')
  const [medications,   setMedications]   = useState<typeof EMPTY_MED[]>([])

  // 약물 폼 (CLINIC 전용)
  const [showMedForm, setShowMedForm] = useState(false)
  const [medName,     setMedName]     = useState('')
  const [medDose,     setMedDose]     = useState('')
  const [medStart,    setMedStart]    = useState(new Date().toISOString().split('T')[0])
  const [medEnd,      setMedEnd]      = useState('')
  const [medTimes,    setMedTimes]    = useState('08:00')

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await treatmentApi.getAll()
      data.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      setSchedules(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (user) fetchSchedules() }, [user, fetchSchedules])

  const resetForm = () => {
    setType(mode === 'NATURAL' ? 'monitoring' : 'monitoring')
    setTitle(''); setHospitalName(''); setNotes('')
    setMedications([]); setShowMedForm(false)
    setMedName(''); setMedDose(''); setMedTimes('08:00')
    setScheduledDate(new Date().toISOString().split('T')[0])
    setScheduledTime('09:00')
  }

  const addMedication = () => {
    if (!medName.trim() || !medDose.trim()) return
    setMedications(prev => [...prev, {
      name: medName.trim(), dose: medDose.trim(),
      times: medTimes.split(',').map(t => t.trim()).filter(Boolean),
      startDate: medStart, endDate: medEnd || undefined,
    }])
    setMedName(''); setMedDose(''); setMedTimes('08:00'); setShowMedForm(false)
  }

  const removeMedication = (idx: number) =>
    setMedications(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!user || !title.trim()) return

    // CLINIC 모드: 다회차 일정 게이트 (2건 이상 등록 시 프리미엄 필요)
    if (mode === 'CLINIC') {
      const canRegister = canUseClinicScheduler(ClinicFeature.REGISTER_FIRST_SCHEDULE, {
        isPremium,
        existingScheduleCount: schedules.length,
      })
      if (!canRegister) {
        showPaywall('multi_schedule')
        return
      }
    }

    setSaving(true)
    try {
      await treatmentApi.save({
        type, title: title.trim(),
        scheduledAt: `${scheduledDate}T${scheduledTime}:00`,
        status: 'scheduled',
        hospitalName: hospitalName.trim() || undefined,
        notes: notes.trim() || undefined,
        medications: medications.length > 0 ? medications : undefined,
      })
      await fetchSchedules()
      setIsModalOpen(false)
      resetForm()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (schedule: TreatmentSchedule, status: TreatmentStatus) => {
    if (!user) return
    try {
      await treatmentApi.save({ ...schedule, status })
      await fetchSchedules()
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id: string) => {
    if (!user || !confirm('이 일정을 삭제할까요?')) return
    try { await treatmentApi.delete(id) } catch {}
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  // 약물 알림 켜기 — MEDICATION_REMINDER 게이트 검사
  const handleEnableMedicationReminder = () => {
    const canEnable = canUseClinicScheduler(ClinicFeature.MEDICATION_REMINDER, { isPremium })
    if (!canEnable) {
      showPaywall('medication_reminder')
      return
    }
    // TODO: [알림 연동] 프리미엄 확인 후 알림 활성화 로직 구현.
    // 백엔드 notifications.service의 sendMedicationReminder는 서버에서 subscription 재검증.
    alert('약물 알림이 활성화됐어요 💊')
  }

  const upcoming = schedules.filter(s => s.status === 'scheduled')
  const past     = schedules.filter(s => s.status !== 'scheduled')

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  // 카드에 표시할 라벨 (모드 무관하게 항상 올바른 텍스트로)
  const getTypeLabel = (t: TreatmentType): string => {
    if (mode === 'NATURAL') {
      return NATURAL_TYPE_OPTIONS.find(o => o.type === t)?.label ?? CLINIC_TYPE_LABELS[t]
    }
    return CLINIC_TYPE_LABELS[t]
  }

  // ============================
  // 약물 알림 잠금 프리뷰 — CLINIC 전용
  // 데이터(약물 목록) 자체는 숨기지 않음. 알림 활성화 기능만 잠금.
  // ============================
  const MedicationReminderSection = ({ medications }: { medications?: Medication[] }) => {
    if (!medications || medications.length === 0) return null

    return (
      <div className="mt-3">
        <p className="text-[11px] font-semibold text-[#b07080] mb-1.5 flex items-center gap-1">
          <Pill size={11} />약물
        </p>

        {/* [데이터 보존] 약물 기록 원본은 구독 상태와 무관하게 항상 보여준다 */}
        <div className="space-y-1.5 mb-2">
          {medications.map((m, i) => (
            <div key={i} className="bg-purple-50 rounded-xl px-3 py-2 text-xs">
              <span className="font-semibold text-purple-800">{m.name}</span>
              <span className="text-purple-500 ml-1">{m.dose}</span>
              <span className="text-purple-400 ml-2">{m.times.join(' · ')}</span>
              <span className="text-purple-300 ml-2">{m.startDate}{m.endDate ? ` ~ ${m.endDate}` : ''}</span>
            </div>
          ))}
        </div>

        {/* 약물 알림 — 프리미엄 게이트 */}
        {isPremium ? (
          // 프리미엄: 알림 켜기 버튼 활성
          <button
            onClick={handleEnableMedicationReminder}
            className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 font-semibold active:scale-[0.98] transition-all w-full"
          >
            <Bell size={12} />
            <span>약물 알림 켜기</span>
          </button>
        ) : (
          // 비프리미엄: 잠긴 미리보기 — 숨기지 않고 비활성 상태로 노출
          <button
            onClick={() => showPaywall('medication_reminder')}
            className="flex items-center gap-2 text-xs text-[#b07080] bg-[#fff0f4] border border-[#ffd6e0] rounded-xl px-3 py-2 w-full group hover:border-[#ff8fab]/60 transition-all"
          >
            <Lock size={12} className="text-[#ff8fab] shrink-0" />
            <span className="flex-1 text-left">
              <span className="font-semibold text-[#ff8fab]">프리미엄으로 알림 켜기</span>
              <span className="text-[#c4a0ae] ml-1">— 정시 투약 알림 활성화</span>
            </span>
            <BellOff size={12} className="text-[#ffd6e0]" />
          </button>
        )}
      </div>
    )
  }

  // ============================
  // 일정 카드 컴포넌트
  // ============================
  const ScheduleCard = ({ s }: { s: TreatmentSchedule }) => {
    const isExpanded = expandedId === s.id
    const status = STATUS_CONFIG[s.status]
    return (
      <div className={`border border-rose-100/60 rounded-2xl overflow-hidden bg-white transition-all ${s.status === 'cancelled' ? 'opacity-60' : ''}`}
        style={{ boxShadow: '0 1px 4px -1px rgba(255,143,171,0.12)' }}>
        <div className="flex items-start gap-3 p-4 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : s.id)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[s.type]}`}>
                {getTypeLabel(s.type)}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${status.color}`}>
                {status.icon}{status.label}
              </span>
            </div>
            <p className="font-semibold text-sm text-[#5a3042] truncate">{s.title}</p>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-[#b07080]">
              <Calendar size={11} />
              <span>{formatDate(s.scheduledAt)}</span>
              {s.hospitalName && (<><span className="mx-1">·</span><Building2 size={11} /><span className="truncate">{s.hospitalName}</span></>)}
            </div>
          </div>
          {isExpanded ? <ChevronUp size={16} className="text-[#ffd6e0] mt-1 shrink-0" /> : <ChevronDown size={16} className="text-[#ffd6e0] mt-1 shrink-0" />}
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-rose-100/60 pt-3 space-y-3">
            {s.notes && <p className="text-xs text-[#8c5060] bg-[#fff0f4] rounded-xl p-3">{s.notes}</p>}

            {/* CLINIC 모드: 약물 + 알림 영역 (데이터 열람은 항상 허용) */}
            {mode === 'CLINIC' && (
              <MedicationReminderSection medications={s.medications} />
            )}

            {/* NATURAL 모드: 약물 목록만 단순 표시 */}
            {mode === 'NATURAL' && s.medications && s.medications.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#b07080] mb-1.5 flex items-center gap-1"><Pill size={11} />약물</p>
                <div className="space-y-1.5">
                  {s.medications.map((m, i) => (
                    <div key={i} className="bg-purple-50 rounded-xl px-3 py-2 text-xs">
                      <span className="font-semibold text-purple-800">{m.name}</span>
                      <span className="text-purple-500 ml-1">{m.dose}</span>
                      <span className="text-purple-400 ml-2">{m.times.join(' · ')}</span>
                      <span className="text-purple-300 ml-2">{m.startDate}{m.endDate ? ` ~ ${m.endDate}` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {s.status === 'scheduled' && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleStatusChange(s, 'completed')} className="flex-1 py-1.5 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-700 active:scale-95 transition-all">완료 처리</button>
                <button onClick={() => handleStatusChange(s, 'cancelled')} className="flex-1 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-500 active:scale-95 transition-all">취소</button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-xl bg-red-50 text-red-400 active:scale-95"><Trash2 size={14} /></button>
              </div>
            )}
            {s.status !== 'scheduled' && (
              <button onClick={() => handleDelete(s.id)} className="flex items-center gap-1 text-xs text-red-300 hover:text-red-500 transition-colors">
                <Trash2 size={12} />삭제
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">

      {/* 헤더 — 모드별 문구 분기 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#5a3042]">
            {mode === 'NATURAL' ? '내 일정' : '시술 일정'}
          </h2>
          <p className="text-xs text-[#b07080] mt-0.5">
            {mode === 'NATURAL'
              ? '산부인과 방문, 숙제일 등을 기록해요'
              : 'IVF·IUI·FET 일정과 약물을 관리해요'}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#ff8fab] text-white rounded-2xl text-xs font-semibold shadow-sm active:scale-95 transition-all"
        >
          <Plus size={14} />일정 추가
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <span className="w-8 h-8 border-4 border-[#ff8fab] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <section>
            <h3 className="text-xs font-semibold text-[#b07080] mb-2 flex items-center gap-1">
              <Clock size={12} />예정된 일정 ({upcoming.length})
            </h3>
            {upcoming.length === 0 ? (
              <div className="bg-white border border-[#ffd6e0] rounded-2xl p-6 text-center">
                <Syringe size={28} className="text-[#ffd6e0] mx-auto mb-2" />
                <p className="text-sm text-[#c4a0ae] font-medium">예정된 일정이 없어요</p>
                <p className="text-xs text-[#c4a0ae] mt-1">+ 일정 추가 버튼으로 등록해보세요</p>
              </div>
            ) : (
              <div className="space-y-2">{upcoming.map(s => <ScheduleCard key={s.id} s={s} />)}</div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-[#c4a0ae] mb-2">지난 일정 ({past.length})</h3>
              <div className="space-y-2">{past.map(s => <ScheduleCard key={s.id} s={s} />)}</div>
            </section>
          )}
        </>
      )}

      {/* 면책 문구 */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-2xl p-3">
        <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[10px] text-amber-700 leading-relaxed">
          이 앱의 일정 정보는 개인 기록용이며 의료적 조언을 대체하지 않습니다. 시술 관련 사항은 반드시 담당 의료진과 상의하세요.
        </p>
      </div>

      {/* ============================
          일정 추가 모달 — 모드별 분기
          ============================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 pt-5 pb-3 border-b border-[#ffd6e0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#5a3042]">
                  {mode === 'NATURAL' ? '일정 추가' : '시술 일정 추가'}
                </h3>
                <p className="text-[10px] text-[#b07080] mt-0.5">
                  {mode === 'NATURAL' ? '🌱 자연임신 모드' : '🏥 시술 모드'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[#b07080] hover:text-[#5a3042] text-sm">닫기</button>
            </div>

            <div className="px-5 py-4 space-y-4">

              {/* ── 일정 종류 — 모드별 분기 ── */}
              <div>
                <label className="text-xs font-semibold text-[#b07080] mb-2 block">일정 종류</label>

                {mode === 'NATURAL' ? (
                  // 자연임신: 3개 옵션만
                  <div className="flex flex-col gap-2">
                    {NATURAL_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.type}
                        onClick={() => setType(opt.type)}
                        className={`py-3 px-4 rounded-2xl text-sm font-semibold text-left transition-all active:scale-[0.98] ${
                          type === opt.type
                            ? 'bg-[#ff8fab] text-white shadow-sm'
                            : 'bg-[#fff0f4] text-[#8c5060] hover:bg-[#ffd6e0]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  // 시술 모드: 기존 5개 그리드
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(CLINIC_TYPE_LABELS) as TreatmentType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`py-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-95 ${
                          type === t
                            ? 'bg-[#ff8fab] text-white shadow-sm'
                            : 'bg-[#fff0f4] text-[#8c5060] hover:bg-[#ffd6e0]'
                        }`}
                      >
                        {CLINIC_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 제목 */}
              <div>
                <label className="text-xs font-semibold text-[#b07080] mb-1.5 block">일정 제목 *</label>
                <input
                  type="text"
                  placeholder={
                    mode === 'NATURAL'
                      ? '예) 배란 초음파, 3주기 첫 방문...'
                      : '예) 3차 난포 모니터링, 채취 전날 검진...'
                  }
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border border-[#ffd6e0] rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff8fab]/30 placeholder:text-[#ffd6e0] bg-[#fff8f9]"
                />
              </div>

              {/* 날짜 · 시간 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#b07080] mb-1.5 block">날짜</label>
                  <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                    className="w-full border border-[#ffd6e0] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff8fab]/30 bg-[#fff8f9]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#b07080] mb-1.5 block">시간</label>
                  <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                    className="w-full border border-[#ffd6e0] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff8fab]/30 bg-[#fff8f9]" />
                </div>
              </div>

              {/* 병원명 — 자연임신 '숙제일'이면 숨김 */}
              {!(mode === 'NATURAL' && type === 'IUI') && (
                <div>
                  <label className="text-xs font-semibold text-[#b07080] mb-1.5 block">
                    {mode === 'NATURAL' ? '병원명 (선택)' : '병원명 (선택)'}
                  </label>
                  <input
                    type="text"
                    placeholder="예) 마리아병원, 차병원..."
                    value={hospitalName}
                    onChange={e => setHospitalName(e.target.value)}
                    className="w-full border border-[#ffd6e0] rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff8fab]/30 placeholder:text-[#ffd6e0] bg-[#fff8f9]"
                  />
                </div>
              )}

              {/* 메모 */}
              <div>
                <label className="text-xs font-semibold text-[#b07080] mb-1.5 block">메모 (선택)</label>
                <textarea
                  placeholder={mode === 'NATURAL' ? '준비사항, 느낀 점 등...' : '준비사항, 주의사항 등 메모...'}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-[#ffd6e0] rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff8fab]/30 placeholder:text-[#ffd6e0] resize-none bg-[#fff8f9]"
                />
              </div>

              {/* ── 약물 섹션 — CLINIC 전용 ── */}
              {mode === 'CLINIC' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#b07080] flex items-center gap-1">
                      <Pill size={12} />약물/주사 추가 (선택)
                    </label>
                    <button onClick={() => setShowMedForm(v => !v)} className="text-xs text-[#ff8fab] font-semibold">
                      {showMedForm ? '닫기' : '+ 추가'}
                    </button>
                  </div>

                  {medications.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {medications.map((m, i) => (
                        <div key={i} className="flex items-center justify-between bg-purple-50 rounded-xl px-3 py-2 text-xs">
                          <div>
                            <span className="font-semibold text-purple-800">{m.name}</span>
                            <span className="text-purple-500 ml-1">{m.dose}</span>
                            <span className="text-purple-400 ml-1">{m.times.join('·')}</span>
                          </div>
                          <button onClick={() => removeMedication(i)} className="text-red-300 hover:text-red-500 ml-2">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showMedForm && (
                    <div className="bg-purple-50 rounded-2xl p-3 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-purple-500 font-semibold block mb-1">약/주사 이름</label>
                          <input type="text" placeholder="예) 고날에프" value={medName} onChange={e => setMedName(e.target.value)}
                            className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300/40 placeholder:text-purple-200 bg-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-purple-500 font-semibold block mb-1">용량</label>
                          <input type="text" placeholder="예) 150IU" value={medDose} onChange={e => setMedDose(e.target.value)}
                            className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300/40 placeholder:text-purple-200 bg-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-purple-500 font-semibold block mb-1">복용 시간 (쉼표 구분)</label>
                          <input type="text" placeholder="08:00, 20:00" value={medTimes} onChange={e => setMedTimes(e.target.value)}
                            className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300/40 placeholder:text-purple-200 bg-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-purple-500 font-semibold block mb-1">시작일</label>
                          <input type="date" value={medStart} onChange={e => setMedStart(e.target.value)}
                            className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300/40 bg-white" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-purple-500 font-semibold block mb-1">종료일 (선택)</label>
                        <input type="date" value={medEnd} onChange={e => setMedEnd(e.target.value)}
                          className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300/40 bg-white" />
                      </div>

                      {/* 약물 알림 안내 — 잠금 미리보기 */}
                      {!isPremium ? (
                        <button
                          onClick={() => { setIsModalOpen(false); showPaywall('medication_reminder') }}
                          className="flex items-center gap-2 w-full bg-white border border-[#ffd6e0] rounded-xl p-2.5 text-left"
                        >
                          <Lock size={11} className="text-[#ff8fab] shrink-0" />
                          <span className="text-[9px] text-[#b07080] leading-relaxed flex-1">
                            <span className="text-[#ff8fab] font-semibold">프리미엄으로 알림 켜기</span>
                            {' '}— 정시 투약 푸시 알림
                          </span>
                        </button>
                      ) : (
                        <div className="bg-white rounded-xl p-2 border border-purple-100">
                          <p className="text-[9px] text-purple-400 leading-relaxed">
                            💊 저장 후 일정 카드에서 약물 알림을 활성화하세요.
                          </p>
                        </div>
                      )}

                      <button
                        onClick={addMedication}
                        disabled={!medName.trim() || !medDose.trim()}
                        className="w-full py-2 rounded-xl text-xs font-semibold bg-purple-400 text-white disabled:opacity-40 active:scale-95 transition-all"
                      >
                        약물 추가
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 저장 버튼 */}
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-[#ff8fab] text-white shadow-sm disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {saving ? '저장 중...' : '일정 저장'}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* 페이월 모달 */}
      {paywallSource && (
        <PaywallModal
          source={paywallSource}
          onClose={() => setPaywallSource(null)}
        />
      )}

    </div>
  )
}
