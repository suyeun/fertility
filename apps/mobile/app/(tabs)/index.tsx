import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Pressable, SafeAreaView,
} from 'react-native'
import { useHomeData, authApi, usersApi, cyclesApi, hormonesApi, treatmentApi, diaryApi } from '@fertility/shared'
import type { MenstrualCycle, HormoneRecord, TreatmentSchedule, DiaryEntry, UserProfile } from '@fertility/shared'
import { router } from 'expo-router'
import { loadStoredToken, clearAuth } from '../../lib/auth'
import { initNotifications, addNotificationListeners } from '../../lib/notifications'
import { initPurchases, identifyUser } from '../../lib/purchases'
import { useVersionCheck } from '../../lib/useVersionCheck'
import UpdateModal from '../../components/UpdateModal'
import { F } from '../../lib/fonts'

const PINK      = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED     = '#b07080'
const BORDER    = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [cycles, setCycles] = useState<MenstrualCycle[]>([])
  const [hormones, setHormones] = useState<HormoneRecord[]>([])
  const [schedules, setSchedules] = useState<TreatmentSchedule[]>([])
  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showOptional, setShowOptional] = useState(true)

  const { result: versionResult, openStore } = useVersionCheck()

  useEffect(() => {
    const unsubscribe = addNotificationListeners()
    return unsubscribe
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const token = await loadStoredToken()
        if (!token) { router.replace('/login' as any); return }

        const me = await authApi.me()
        setUser({ uid: me.id, email: me.email })

        const p = await usersApi.getProfile()
        if (!p?.treatmentStage) {
          setLoading(false)
          router.replace('/onboarding')
          return
        }
        setProfile(p)

        const [c, h, s, d] = await Promise.all([
          cyclesApi.getAll(),
          hormonesApi.getAll(),
          treatmentApi.getAll(),
          diaryApi.getAll(),
        ])
        const unwrap = (r: any) => Array.isArray(r) ? r : (r?.data ?? [])
        setCycles(unwrap(c))
        setHormones(unwrap(h))
        setSchedules(unwrap(s))
        setDiaries(unwrap(d))

        await initPurchases(me.id).catch(() => {})
        identifyUser(me.id).catch(() => {})
        initNotifications(s).catch(e => console.warn('[알림 초기화 실패]', e))
      } catch {
        await clearAuth()
        router.replace('/login' as any)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const home = useHomeData(profile?.treatmentStage, cycles, hormones, schedules, diaries)

  const todayStr = new Date().toISOString().split('T')[0]
  const todayHormone = hormones.find(h => h.recordedAt.split('T')[0] === todayStr)
  const latestDiary = diaries[0]

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

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 인사말 */}
        <Text style={s.greeting}>안녕하세요, {profile?.name || '사용자'}님 🌸</Text>

        {/* 히어로 카드 */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.heroMeta}>오늘의 사이클</Text>
            <Text style={s.heroPhase}>{home.todayPhaseLabel}</Text>
            <Text style={s.heroDay}>사이클 {home.currentCycleDay}일째</Text>
          </View>
          <View style={s.ddayBadge}>
            <Text style={s.ddayNum}>{home.ovulationDDay}</Text>
            <Text style={s.ddayLabel}>배란까지</Text>
          </View>
          <View style={s.heroTip}>
            <Text style={s.heroTipText}>{home.todayTip}</Text>
          </View>
        </View>

        {/* 빠른 기록 */}
        <View style={s.row}>
          <Pressable style={s.quickCard} onPress={() => router.push('/records' as any)}>
            <Text style={s.quickIcon}>🌡️</Text>
            <Text style={s.quickLabel}>기초체온</Text>
            {todayHormone?.bbt
              ? <Text style={s.quickValue}>{todayHormone.bbt}°C</Text>
              : <Text style={s.quickCta}>기록하기 →</Text>
            }
          </Pressable>
          <Pressable style={s.quickCard} onPress={() => router.push('/records' as any)}>
            <Text style={s.quickIcon}>🥚</Text>
            <Text style={s.quickLabel}>배란 테스트기</Text>
            {todayHormone?.opkIndex !== undefined
              ? <Text style={s.quickValue}>OPK {todayHormone.opkIndex}/10</Text>
              : <Text style={s.quickCta}>기록하기 →</Text>
            }
          </Pressable>
        </View>

        {/* 오늘 할 일 */}
        {home.todayTasks.length > 0 && (
          <View style={s.section}>
            <View style={s.secHeader}>
              <Text style={s.secTitle}>📋 오늘 할 일</Text>
            </View>
            <View style={s.taskList}>
              {home.todayTasks.map(task => (
                <View key={task.id} style={s.taskRow}>
                  <View style={[s.taskIcon, { backgroundColor: task.colorKey === 'pink' ? LIGHT_PINK : '#eef2ff' }]}>
                    <Text style={{ fontSize: 18 }}>{task.emoji}</Text>
                  </View>
                  <View style={s.taskText}>
                    <Text style={[s.taskTitle, task.done && s.taskDone]}>{task.title}</Text>
                    <Text style={s.taskSub}>{task.subtitle}</Text>
                  </View>
                  <View style={[s.dot, { backgroundColor: task.done ? '#d4a0b0' : (task.colorKey === 'pink' ? PINK : '#818cf8') }]} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 오늘의 마음 */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>📝 오늘의 마음</Text>
            <TouchableOpacity onPress={() => router.push('/records' as any)}>
              <Text style={s.secLink}>쓰러 가기 ›</Text>
            </TouchableOpacity>
          </View>
          <View style={s.taskList}>
          <TouchableOpacity style={s.taskRow} onPress={() => router.push('/records' as any)}>
            <View style={[s.taskIcon, { backgroundColor: LIGHT_PINK }]}>
              <Text style={{ fontSize: 18 }}>{latestDiary ? '😊' : '📝'}</Text>
            </View>
            <View style={s.taskText}>
              {latestDiary ? (
                <Text style={s.taskTitle} numberOfLines={2}>{latestDiary.content}</Text>
              ) : (
                <>
                  <Text style={[s.taskTitle, { color: MUTED, fontWeight: '400' }]}>오늘 감정을 기록해보세요</Text>
                  <Text style={s.taskSub}>AI가 따뜻하게 응원해드려요</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
          </View>
        </View>

        {/* 이번 주 기록 */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>📊 이번 주 기록</Text>
            <TouchableOpacity onPress={() => router.push('/records' as any)}>
              <Text style={s.secLink}>전체 보기 ›</Text>
            </TouchableOpacity>
          </View>
          <View style={s.streakCard}>
            <View style={s.streakRow}>
              {home.weekStreak.map((day, i) => (
                <View key={i} style={s.streakCol}>
                  <Text style={[s.streakLabel, day.isToday && s.streakLabelToday]}>
                    {day.label}
                  </Text>
                  <View style={[
                    s.streakCircle,
                    day.recorded
                      ? { backgroundColor: day.isToday ? BORDER : PINK }
                      : { backgroundColor: LIGHT_PINK, borderWidth: day.isToday ? 1.5 : 0.5, borderColor: day.isToday ? PINK : BORDER },
                  ]}>
                    {day.recorded && (
                      <Text style={{ fontSize: 11, color: day.isToday ? PINK : '#fff', fontWeight: '700' }}>✓</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
            <Text style={s.streakSummary}>
              {home.streakCount > 0
                ? `이번 주 ${home.streakCount}일 연속 기록 중 🔥`
                : '오늘부터 기록을 시작해봐요 ✨'}
            </Text>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#fff8f9' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff8f9' },
  scroll:      { flex: 1 },
  content:     { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },

  // 인사말
  greeting: { fontFamily: F.semiBold, fontSize: 18, color: DARK_ROSE, marginBottom: 16 },

  // 히어로
  hero: {
    backgroundColor: PINK,
    borderRadius: 22,
    padding: 20,
    marginBottom: 12,
    position: 'relative',
  },
  heroLeft:  {},
  heroMeta:  { fontFamily: F.regular, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  heroPhase: { fontFamily: F.bold,    fontSize: 24, color: '#fff', marginBottom: 2 },
  heroDay:   { fontFamily: F.regular, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 14 },
  heroTip:   { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  heroTipText: { fontFamily: F.regular, fontSize: 12, color: '#fff', lineHeight: 18 },
  ddayBadge: {
    position: 'absolute', top: 18, right: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center',
  },
  ddayNum:   { fontFamily: F.bold,    fontSize: 20, color: '#fff' },
  ddayLabel: { fontFamily: F.regular, fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // 빠른 기록
  row:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickCard: {
    flex: 1, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 18, padding: 16,
  },
  quickIcon:  { fontSize: 22, marginBottom: 8 },
  quickLabel: { fontFamily: F.regular,  fontSize: 11, color: MUTED, marginBottom: 4 },
  quickValue: { fontFamily: F.bold,     fontSize: 16, color: PINK },
  quickCta:   { fontFamily: F.semiBold, fontSize: 12, color: PINK },

  // 섹션
  section:   { marginBottom: 16 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  secTitle:  { fontFamily: F.bold,     fontSize: 14, color: DARK_ROSE },
  secLink:   { fontFamily: F.semiBold, fontSize: 12, color: PINK },

  // 태스크 리스트 + 행
  taskList: { gap: 8 },
  taskRow: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  taskIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  taskText:  { flex: 1 },
  taskTitle: { fontFamily: F.semiBold, fontSize: 13, color: DARK_ROSE },
  taskSub:   { fontFamily: F.regular,  fontSize: 11, color: MUTED, marginTop: 3 },
  taskDone:  { color: MUTED, textDecorationLine: 'line-through' },
  dot:       { width: 8, height: 8, borderRadius: 4 },

  // 스트릭
  streakCard: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 18, padding: 16,
  },
  streakRow:         { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  streakCol:         { alignItems: 'center', gap: 6 },
  streakLabel:       { fontFamily: F.regular,  fontSize: 11, color: MUTED },
  streakLabelToday:  { fontFamily: F.bold,     fontSize: 11, color: PINK },
  streakCircle:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  streakSummary:     { fontFamily: F.regular,  fontSize: 12, color: MUTED, textAlign: 'center' },
})
