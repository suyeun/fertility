import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Pressable, SafeAreaView,
} from 'react-native'
import {
  useHomeData, authApi, usersApi, cyclesApi, hormonesApi, treatmentApi, diaryApi,
  useUserStore, getQuickActions, getStageLabelKo, getStageProgress,
  IUI_STAGE_ORDER, IVF_STAGE_ORDER,
} from '@fertility/shared'
import type {
  MenstrualCycle, HormoneRecord, TreatmentSchedule, DiaryEntry,
  TreatmentMode, CurrentStage,
} from '@fertility/shared'
import { router } from 'expo-router'
import { loadStoredToken, clearAuth } from '../../lib/auth'
import { initNotifications, addNotificationListeners } from '../../lib/notifications'
import { initPurchases, identifyUser } from '../../lib/purchases'
import { useVersionCheck } from '../../lib/useVersionCheck'
import UpdateModal from '../../components/UpdateModal'
import { F } from '../../lib/fonts'

const PINK       = '#ff8fab'
const DARK_ROSE  = '#5a3042'
const MUTED      = '#b07080'
const BORDER     = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

function getDDay(target: Date): string {
  const t = new Date(target)
  t.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.ceil((t.getTime() - now.getTime()) / 86400000)
  if (diff === 0) return 'D-Day'
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`
}

// ── 단계 진행 바 ─────────────────────────────────────────────
function StageBar({ mode, stage }: { mode: TreatmentMode; stage: CurrentStage }) {
  const { index, total } = getStageProgress(mode, stage)
  const dots = Array.from({ length: total }, (_, i) => i)
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
      {dots.map(i => (
        <View
          key={i}
          style={{
            flex: 1, height: 5, borderRadius: 3,
            backgroundColor: i <= index ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
          }}
        />
      ))}
    </View>
  )
}

// ── 자연임신 위상 뱃지 ────────────────────────────────────────
const PHASE_BADGE: Record<string, { emoji: string; label: string; color: string }> = {
  menstrual:  { emoji: '🔴', label: '생리기',  color: 'rgba(255,255,255,0.22)' },
  follicular: { emoji: '🟢', label: '난포기',  color: 'rgba(255,255,255,0.22)' },
  ovulation:  { emoji: '⭐', label: '배란기',  color: 'rgba(255,255,255,0.28)' },
  luteal:     { emoji: '🟡', label: '황체기',  color: 'rgba(255,255,255,0.22)' },
}

// ── 히어로 카드 ──────────────────────────────────────────────
function HeroCard({
  treatmentMode, currentStage, phase, cycleDay, stageDay, tip, dDay, periodDDay,
  isFertileWindow, hasCycleData, upcomingSchedule,
}: {
  treatmentMode: TreatmentMode
  currentStage: CurrentStage
  phase: string
  cycleDay: number
  stageDay: number | null
  tip: string
  dDay: string
  periodDDay: string
  isFertileWindow: boolean
  hasCycleData: boolean
  upcomingSchedule: TreatmentSchedule | null
}) {
  // 자연임신 — 사이클 데이터 없음
  if (treatmentMode === 'natural' && !hasCycleData) {
    return (
      <TouchableOpacity
        style={[hero.card, { backgroundColor: PINK }]}
        onPress={() => router.push('/settings' as any)}
        activeOpacity={0.9}
      >
        <Text style={hero.meta}>🌱 자연임신 준비 중</Text>
        <Text style={[hero.phase, { fontSize: 16, marginBottom: 6 }]}>
          생리 시작일을 입력하면{'\n'}주기를 알려드려요
        </Text>
        <View style={hero.ctaBtn}>
          <Text style={[hero.ctaBtnText, { color: DARK_ROSE }]}>생리 정보 입력하러 가기 →</Text>
        </View>
      </TouchableOpacity>
    )
  }

  // 자연임신 — 사이클 데이터 있음
  if (treatmentMode === 'natural') {
    const effectivePhase = isFertileWindow && phase === 'follicular' ? 'follicular' : phase
    const badge = PHASE_BADGE[effectivePhase] ?? PHASE_BADGE.follicular
    const isGaim = isFertileWindow && phase === 'follicular'

    let dDayText: string
    let dDayLabel: string
    if (phase === 'menstrual') {
      dDayText = `${cycleDay}일차`
      dDayLabel = '생리'
    } else if (phase === 'ovulation') {
      dDayText = '오늘 🌟'
      dDayLabel = '배란 예정일'
    } else if (phase === 'luteal') {
      dDayText = periodDDay
      dDayLabel = '생리 예정'
    } else {
      dDayText = dDay
      dDayLabel = '배란까지'
    }

    return (
      <View style={[hero.card, { backgroundColor: PINK }]}>
        <View style={hero.ddayBadge}>
          <Text style={hero.ddayNum}>{dDayText}</Text>
          <Text style={hero.ddayLabel}>{dDayLabel}</Text>
        </View>
        <Text style={hero.meta}>🌱 자연임신 준비 중</Text>
        <View style={[hero.phaseBadge, { backgroundColor: badge.color }]}>
          <Text style={hero.phaseBadgeText}>{badge.emoji} {isGaim ? '가임기' : badge.label}</Text>
        </View>
        <Text style={hero.day}>사이클 {cycleDay}일째</Text>
        <View style={hero.tipBox}>
          <Text style={hero.tipText}>{tip}</Text>
        </View>
        {(isFertileWindow || phase === 'ovulation') && (
          <View style={[hero.tipBox, { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Text style={hero.tipText}>💗 지금은 가임기! 오늘 타이밍을 놓치지 마세요</Text>
          </View>
        )}
      </View>
    )
  }

  // IUI/IVF — 단계 미설정
  if (currentStage === null) {
    const modeLabel = treatmentMode === 'iui' ? 'IUI 인공수정' : 'IVF 시험관'
    const modeIcon  = treatmentMode === 'iui' ? '💉' : '🔬'
    return (
      <View style={[hero.card, { backgroundColor: '#c084fc' }]}>
        <Text style={hero.meta}>{modeIcon} {modeLabel}</Text>
        <Text style={[hero.phase, { fontSize: 18, marginBottom: 6 }]}>치료 단계를 설정해주세요</Text>
        <Text style={[hero.day, { marginBottom: 14 }]}>
          단계를 설정하면 맞춤 정보를 드려요
        </Text>
        <TouchableOpacity
          style={hero.ctaBtn}
          onPress={() => router.push('/settings' as any)}
        >
          <Text style={hero.ctaBtnText}>지금 설정하기 →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // IUI/IVF — 단계 설정됨
  const bgColor    = treatmentMode === 'iui' ? '#a855f7' : '#7c3aed'
  const modeLabel  = treatmentMode === 'iui' ? 'IUI 인공수정' : 'IVF 시험관'
  const modeIcon   = treatmentMode === 'iui' ? '💉' : '🔬'
  return (
    <View style={[hero.card, { backgroundColor: bgColor }]}>
      <View style={hero.ddayBadge}>
        <Text style={hero.ddayNum}>{stageDay ?? cycleDay}일</Text>
        <Text style={hero.ddayLabel}>치료 중</Text>
      </View>
      <Text style={hero.meta}>{modeIcon} {modeLabel}</Text>
      <Text style={[hero.phase, { fontSize: 20 }]}>{getStageLabelKo(treatmentMode, currentStage)}</Text>
      <StageBar mode={treatmentMode} stage={currentStage} />
      {upcomingSchedule && (
        <View style={[hero.tipBox, { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Text style={hero.tipText}>
            📅 {upcomingSchedule.title}까지 {getDDay(new Date(upcomingSchedule.scheduledAt))}
          </Text>
        </View>
      )}
      <View style={[hero.tipBox, { marginTop: upcomingSchedule ? 6 : 10 }]}>
        <Text style={hero.tipText}>{tip}</Text>
      </View>
    </View>
  )
}

// ── 빠른 기록 카드 ────────────────────────────────────────────
function QuickCard({ emoji, label, value, onPress }: { emoji: string; label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable style={q.card} onPress={onPress}>
      <Text style={q.icon}>{emoji}</Text>
      <Text style={q.label}>{label}</Text>
      {value
        ? <Text style={q.value}>{value}</Text>
        : <Text style={q.cta}>기록하기 →</Text>
      }
    </Pressable>
  )
}

// ── 할 일 항목 ────────────────────────────────────────────────
function TaskRow({ emoji, title, subtitle, done, colorKey, onPress }: {
  emoji: string; title: string; subtitle: string; done: boolean
  colorKey: 'pink' | 'indigo'; onPress?: () => void
}) {
  const iconBg = colorKey === 'pink' ? LIGHT_PINK : '#eef2ff'
  const dotBg  = done ? '#d4a0b0' : (colorKey === 'pink' ? PINK : '#818cf8')
  return (
    <TouchableOpacity style={t.row} onPress={onPress} activeOpacity={0.85}>
      <View style={[t.icon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={t.text}>
        <Text style={[t.title, done && t.done]}>{title}</Text>
        <Text style={t.sub}>{subtitle}</Text>
      </View>
      <View style={[t.dot, { backgroundColor: dotBg }]} />
    </TouchableOpacity>
  )
}

// ── 메인 화면 ─────────────────────────────────────────────────
export default function HomeScreen() {
  const { profile: storeProfile, syncProfile } = useUserStore()

  const [serverProfile, setServerProfile] = useState<any>(null)
  const [cycles,    setCycles]    = useState<MenstrualCycle[]>([])
  const [hormones,  setHormones]  = useState<HormoneRecord[]>([])
  const [schedules, setSchedules] = useState<TreatmentSchedule[]>([])
  const [diaries,   setDiaries]   = useState<DiaryEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showOptional, setShowOptional] = useState(true)

  const { result: versionResult, openStore } = useVersionCheck()

  useEffect(() => {
    const unsub = addNotificationListeners()
    return unsub
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const token = await loadStoredToken()
        if (!token) { router.replace('/login' as any); return }

        const me = await authApi.me()

        const prof = await usersApi.getProfile()
        if (!prof?.treatmentStage) {
          setLoading(false)
          router.replace('/onboarding')
          return
        }
        setServerProfile(prof)
        await syncProfile()

        const [c, h, s, d] = await Promise.all([
          cyclesApi.getAll(),
          hormonesApi.getAll(),
          treatmentApi.getAll(),
          diaryApi.getAll(),
        ])

        const unwrap = (r: any) => Array.isArray(r) ? r : (r?.data ?? [])
        setCycles(unwrap(c)); setHormones(unwrap(h))
        setSchedules(unwrap(s)); setDiaries(unwrap(d))

        await initPurchases(me.id).catch(() => {})
        identifyUser(me.id).catch(() => {})
        initNotifications(unwrap(s)).catch(e => console.warn('[알림 초기화 실패]', e))
      } catch {
        await clearAuth()
        router.replace('/login' as any)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const profile = storeProfile ?? serverProfile

  const treatmentMode  = (profile?.treatmentStage as TreatmentMode) ?? 'natural'
  const currentStage   = (profile as any)?._currentStage as CurrentStage ?? null
  const stageStartedAt = (profile as any)?._stageStartedAt as string | null ?? null
  const stageDay = stageStartedAt
    ? Math.max(1, Math.floor((Date.now() - new Date(stageStartedAt).getTime()) / 86400000) + 1)
    : null

  const home = useHomeData(treatmentMode, currentStage, cycles, hormones, schedules, diaries)

  const todayStr    = new Date().toISOString().split('T')[0]
  const todayDiary  = diaries.find(d => d.date === todayStr) ?? null

  const hasCycleData = cycles.length > 0

  const upcomingSchedule = useMemo(() => {
    return schedules
      .filter(s => s.scheduledAt.split('T')[0] >= todayStr && s.status !== 'cancelled')
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0] ?? null
  }, [schedules, todayStr])

  const [quickA, quickB] = getQuickActions(treatmentMode, currentStage)

  const todayHormone = hormones.find(h => h.recordedAt.split('T')[0] === todayStr)
  const quickAValue = treatmentMode === 'natural' && quickA.emoji === '🌡️' && todayHormone?.bbt
    ? `${todayHormone.bbt}°C`
    : undefined
  const quickBValue = treatmentMode === 'natural' && quickB.emoji === '🥚' && todayHormone?.opkIndex !== undefined
    ? `OPK ${todayHormone.opkIndex}/10`
    : undefined

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={PINK} />
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <UpdateModal
        status={showOptional ? versionResult.status : 'ok'}
        message={versionResult.message}
        onUpdate={() => openStore(versionResult.storeUrl)}
        onLater={versionResult.status === 'optional' ? () => setShowOptional(false) : undefined}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* 섹션 A — 헤더 */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>🌸 봄 &nbsp;|&nbsp; {profile?.name || '테스터'}님, 안녕하세요</Text>
            <Text style={s.greetingSub}>오늘도 따뜻하게 함께할게요</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings' as any)} style={s.settingsBtn}>
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* 섹션 B — 히어로 카드 */}
        <HeroCard
          treatmentMode={treatmentMode}
          currentStage={currentStage}
          phase={home.todayCycleInfo?.phase ?? 'follicular'}
          cycleDay={home.currentCycleDay}
          stageDay={stageDay}
          tip={home.todayTip}
          dDay={home.ovulationDDay}
          periodDDay={home.periodDDay}
          isFertileWindow={home.isFertileWindow}
          hasCycleData={hasCycleData}
          upcomingSchedule={upcomingSchedule}
        />

        {/* 섹션 C — 빠른 기록 */}
        <View style={s.secHeader}>
          <Text style={s.secTitle}>⚡ 빠른 기록</Text>
        </View>
        <View style={s.row}>
          <QuickCard emoji={quickA.emoji} label={quickA.label} value={quickAValue} onPress={() => router.push(quickA.route as any)} />
          <QuickCard emoji={quickB.emoji} label={quickB.label} value={quickBValue} onPress={() => router.push(quickB.route as any)} />
        </View>

        {/* 섹션 D — 오늘 할 일 */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>🗓️ 오늘 할 일</Text>
          </View>
          {treatmentMode !== 'natural' && currentStage === null ? (
            <TouchableOpacity style={t.row} onPress={() => router.push('/settings' as any)}>
              <View style={[t.icon, { backgroundColor: '#eef2ff' }]}>
                <Text style={{ fontSize: 18 }}>🗓️</Text>
              </View>
              <View style={t.text}>
                <Text style={t.title}>치료 단계를 설정하면 맞춤 할 일이 나와요</Text>
                <Text style={t.sub}>지금 설정하러 가기 →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={t.list}>
              {home.todayTasks.map(task => (
                <TaskRow
                  key={task.id}
                  emoji={task.emoji}
                  title={task.title}
                  subtitle={task.subtitle}
                  done={task.done}
                  colorKey={task.colorKey}
                  onPress={task.route ? () => router.push(task.route as any) : undefined}
                />
              ))}
            </View>
          )}
        </View>

        {/* 섹션 E — 오늘의 마음 */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>📝 오늘의 마음</Text>
            <TouchableOpacity onPress={() => router.push('/records' as any)}>
              <Text style={s.secLink}>쓰러 가기 ›</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={t.row} onPress={() => router.push('/records' as any)}>
            <View style={[t.icon, { backgroundColor: LIGHT_PINK }]}>
              <Text style={{ fontSize: 18 }}>{todayDiary ? '😊' : '📝'}</Text>
            </View>
            <View style={t.text}>
              {todayDiary ? (
                <Text style={t.title} numberOfLines={2}>{todayDiary.content}</Text>
              ) : (
                <>
                  <Text style={[t.title, { color: MUTED, fontWeight: '400' }]}>오늘 기분을 기록해봐요 💭</Text>
                  <Text style={t.sub}>AI가 따뜻하게 응원해드려요</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* 섹션 F — 이번 주 기록 */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>📈 이번 주 기록</Text>
            <TouchableOpacity onPress={() => router.push('/records' as any)}>
              <Text style={s.secLink}>전체 보기 ›</Text>
            </TouchableOpacity>
          </View>
          <View style={streak.card}>
            <View style={streak.row}>
              {home.weekStreak.map((day, i) => (
                <View key={i} style={streak.col}>
                  <Text style={[streak.label, day.isToday && streak.labelToday]}>{day.label}</Text>
                  <View style={[
                    streak.circle,
                    day.recorded
                      ? { backgroundColor: day.isToday ? BORDER : PINK }
                      : { backgroundColor: LIGHT_PINK, borderWidth: day.isToday ? 1.5 : 0.5, borderColor: day.isToday ? PINK : BORDER },
                  ]}>
                    {day.recorded && day.recordIcon ? (
                      <Text style={{ fontSize: 13 }}>{day.recordIcon}</Text>
                    ) : day.recorded ? (
                      <Text style={{ fontSize: 11, color: day.isToday ? PINK : '#fff', fontWeight: '700' }}>✓</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
            <Text style={streak.summary}>
              {home.streakCount > 0
                ? `${home.streakCount}일 연속 기록 중이에요 🔥`
                : '오늘부터 기록을 시작해봐요 ✨'}
            </Text>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#fff8f9' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff8f9' },
  scroll:      { flex: 1 },
  content:     { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  greeting:    { fontFamily: F.semiBold, fontSize: 16, color: DARK_ROSE },
  greetingSub: { fontFamily: F.regular,  fontSize: 12, color: MUTED, marginTop: 2 },
  settingsBtn: { padding: 4 },
  row:         { flexDirection: 'row', gap: 10, marginBottom: 16 },
  section:     { marginBottom: 16 },
  secHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  secTitle:    { fontFamily: F.bold,     fontSize: 14, color: DARK_ROSE },
  secLink:     { fontFamily: F.semiBold, fontSize: 12, color: PINK },
})

const hero = StyleSheet.create({
  card: {
    borderRadius: 22, padding: 20, marginBottom: 14, position: 'relative',
  },
  meta:    { fontFamily: F.regular, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  phase:   { fontFamily: F.bold,    fontSize: 24, color: '#fff', marginBottom: 2, paddingRight: 70 },
  day:     { fontFamily: F.regular, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 10 },
  tipBox:  { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  tipText: { fontFamily: F.regular, fontSize: 12, color: '#fff', lineHeight: 18 },
  phaseBadge: {
    alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 6,
  },
  phaseBadgeText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  ddayBadge: {
    position: 'absolute', top: 18, right: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
  },
  ddayNum:   { fontFamily: F.bold,    fontSize: 18, color: '#fff' },
  ddayLabel: { fontFamily: F.regular, fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  ctaBtn:    { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, alignSelf: 'flex-start' },
  ctaBtnText:{ fontFamily: F.bold, fontSize: 13, color: '#7c3aed' },
})

const q = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 18, padding: 16,
  },
  icon:  { fontSize: 22, marginBottom: 8 },
  label: { fontFamily: F.regular,  fontSize: 11, color: MUTED, marginBottom: 4 },
  value: { fontFamily: F.bold,     fontSize: 16, color: PINK },
  cta:   { fontFamily: F.semiBold, fontSize: 12, color: PINK },
})

const t = StyleSheet.create({
  list: { gap: 8 },
  row:  {
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  icon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text:  { flex: 1 },
  title: { fontFamily: F.semiBold, fontSize: 13, color: DARK_ROSE },
  sub:   { fontFamily: F.regular,  fontSize: 11, color: MUTED, marginTop: 3 },
  done:  { color: MUTED, textDecorationLine: 'line-through' },
  dot:   { width: 8, height: 8, borderRadius: 4 },
})

const streak = StyleSheet.create({
  card:       { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 16 },
  row:        { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  col:        { alignItems: 'center', gap: 6 },
  label:      { fontFamily: F.regular, fontSize: 11, color: MUTED },
  labelToday: { fontFamily: F.bold,    fontSize: 11, color: PINK },
  circle:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summary:    { fontFamily: F.regular, fontSize: 12, color: MUTED, textAlign: 'center' },
})
