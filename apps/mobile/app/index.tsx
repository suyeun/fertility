// apps/mobile/app/index.tsx
import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Pressable,
} from 'react-native'
import { useHomeData, authApi, usersApi, cyclesApi, hormonesApi, treatmentApi, diaryApi } from '@fertility/shared'
import type { MenstrualCycle, HormoneRecord, TreatmentSchedule, DiaryEntry, UserProfile } from '@fertility/shared'
import { router } from 'expo-router'
import { loadStoredToken, loadUser, clearAuth } from '../lib/auth'
import { initNotifications, addNotificationListeners } from '../lib/notifications'
import { initPurchases, identifyUser } from '../lib/purchases'
import { useVersionCheck } from '../lib/useVersionCheck'
import UpdateModal from '../components/UpdateModal'

const PINK = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED = '#b07080'
const BORDER = '#ffd6e0'
const CARD_BG = '#fff'
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

  // 앱 버전 체크
  const { result: versionResult, openStore } = useVersionCheck()

  // 알림 리스너 등록 (포그라운드 수신 + 탭 처리)
  useEffect(() => {
    const unsubscribe = addNotificationListeners()
    return unsubscribe
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const token = await loadStoredToken()
        if (!token) {
          router.replace('/login' as any)
          return
        }

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
        setCycles(c)
        setHormones(h)
        setSchedules(s)
        setDiaries(d)

        // RevenueCat 초기화 + 알림 초기화 병렬 실행
        await initPurchases(me.id).catch(() => {})
        identifyUser(me.id).catch(() => {})
        initNotifications(s).catch(e => console.warn('[알림 초기화 실패]', e))
      } catch (e) {
        console.error('초기화 실패:', e)
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
      <View style={[s.flex1, s.center]}>
        <ActivityIndicator size="large" color={PINK} />
      </View>
    )
  }

  return (
    <>
      {/* 버전 업데이트 모달 */}
      <UpdateModal
        status={showOptional ? versionResult.status : 'ok'}
        message={versionResult.message}
        onUpdate={() => openStore(versionResult.storeUrl)}
        onLater={versionResult.status === 'optional' ? () => setShowOptional(false) : undefined}
      />

    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* 인사 */}
      <Text style={s.greeting}>{profile?.name || '사용자'}님, 안녕하세요 🌸</Text>

      {/* 히어로 카드 */}
      <View style={s.hero}>
        <View style={s.ddayBadge}>
          <Text style={s.ddayNum}>{home.ovulationDDay}</Text>
          <Text style={s.ddayLabel}>배란까지</Text>
        </View>
        <Text style={s.heroMeta}>오늘의 사이클 상태</Text>
        <Text style={s.heroPhase}>{home.todayPhaseLabel}</Text>
        <Text style={s.heroDay}>사이클 {home.currentCycleDay}일째</Text>
        <View style={s.heroTip}>
          <Text style={s.heroTipText}>{home.todayTip}</Text>
        </View>
      </View>

      {/* 빠른 기록 */}
      <View style={s.quickGrid}>
        <Pressable style={s.quickCard} onPress={() => router.push('/records' as any)}>
          <Text style={s.quickIcon}>🌡️</Text>
          <Text style={s.quickTitle}>오늘 기초체온</Text>
          {todayHormone?.bbt ? (
            <Text style={s.quickValue}>{todayHormone.bbt}°C</Text>
          ) : (
            <>
              <Text style={s.quickEmpty}>아직 기록 없음</Text>
              <Text style={s.quickCta}>기록하기 →</Text>
            </>
          )}
        </Pressable>
        <Pressable style={s.quickCard} onPress={() => router.push('/records' as any)}>
          <Text style={s.quickIcon}>🥚</Text>
          <Text style={s.quickTitle}>배란 테스트기</Text>
          {todayHormone?.opkIndex !== undefined ? (
            <Text style={s.quickValue}>OPK {todayHormone.opkIndex}/10</Text>
          ) : (
            <>
              <Text style={s.quickEmpty}>아직 기록 없음</Text>
              <Text style={s.quickCta}>기록하기 →</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* 오늘 할 일 */}
      {home.todayTasks.length > 0 && (
        <View style={s.section}>
          <Text style={s.secTitle}>📋 오늘 할 일</Text>
          {home.todayTasks.map(task => (
            <View key={task.id} style={s.taskRow}>
              <View style={[s.taskIconWrap, { backgroundColor: task.colorKey === 'pink' ? LIGHT_PINK : '#eef2ff' }]}>
                <Text style={{ fontSize: 18 }}>{task.emoji}</Text>
              </View>
              <View style={s.taskMeta}>
                <Text style={[s.taskTitle, task.done && { color: MUTED, textDecorationLine: 'line-through' }]}>
                  {task.title}
                </Text>
                <Text style={s.taskSub}>{task.subtitle}</Text>
              </View>
              <View style={[s.dot, { backgroundColor: task.done ? '#d4a0b0' : (task.colorKey === 'pink' ? PINK : '#818cf8') }]} />
            </View>
          ))}
        </View>
      )}

      {/* 오늘의 마음 */}
      <View style={s.section}>
        <View style={s.secHeader}>
          <Text style={s.secTitle}>📝 오늘의 마음</Text>
          <TouchableOpacity onPress={() => router.push('/diary' as any)}>
            <Text style={s.secMore}>쓰러 가기 ›</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.taskRow} onPress={() => router.push('/diary' as any)}>
          <View style={[s.taskIconWrap, { backgroundColor: LIGHT_PINK }]}>
            <Text style={{ fontSize: 18 }}>{latestDiary ? '😊' : '📝'}</Text>
          </View>
          <View style={s.taskMeta}>
            {latestDiary ? (
              <Text style={s.taskTitle} numberOfLines={1}>{latestDiary.content}</Text>
            ) : (
              <>
                <Text style={[s.taskTitle, { color: MUTED, fontWeight: '400' }]}>오늘 감정을 기록해보세요</Text>
                <Text style={s.taskSub}>AI가 따뜻하게 응원해드려요</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* 이번 주 스트릭 */}
      <View style={s.section}>
        <View style={s.secHeader}>
          <Text style={s.secTitle}>📊 이번 주 기록</Text>
          <TouchableOpacity onPress={() => router.push('/records' as any)}>
            <Text style={s.secMore}>전체 보기 ›</Text>
          </TouchableOpacity>
        </View>
        <View style={s.streakCard}>
          <View style={s.streakRow}>
            {home.weekStreak.map((day, i) => (
              <View key={i} style={s.streakDayCol}>
                <Text style={[s.streakDayLabel, day.isToday && { color: PINK, fontWeight: '500' }]}>
                  {day.label}
                </Text>
                <View style={[
                  s.streakCircle,
                  day.recorded
                    ? { backgroundColor: day.isToday ? BORDER : PINK }
                    : { backgroundColor: LIGHT_PINK, borderWidth: day.isToday ? 1.5 : 0.5, borderColor: day.isToday ? PINK : BORDER },
                ]}>
                  {day.recorded && (
                    <Text style={{ fontSize: 12, color: day.isToday ? PINK : '#fff', fontWeight: '700' }}>✓</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
          <Text style={s.streakText}>
            {home.streakCount > 0
              ? `이번 주 ${home.streakCount}일 연속 기록 중 🔥`
              : '오늘부터 기록을 시작해봐요 ✨'}
          </Text>
        </View>
      </View>

      {/* AI 채팅 배너 */}
      <TouchableOpacity
        style={s.chatBanner}
        onPress={() => router.push('/chat' as any)}
        activeOpacity={0.85}
      >
        <View style={s.chatBannerLeft}>
          <Text style={s.chatBannerEmoji}>🌸</Text>
          <View>
            <Text style={s.chatBannerTitle}>AI 파트너 봄이 — 서비스 준비중</Text>
            <Text style={s.chatBannerSub}>곧 만나요! 수치·주기·시술 AI 상담 💕</Text>
          </View>
        </View>
        <Text style={s.chatBannerArrow}>›</Text>
      </TouchableOpacity>

      {/* 설정 진입 */}
      <TouchableOpacity
        style={s.settingsRow}
        onPress={() => router.push('/settings' as any)}
        activeOpacity={0.7}
      >
        <Text style={s.settingsText}>⚙️ 설정 · 알림 관리</Text>
        <Text style={s.settingsArrow}>›</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
    </>
  )
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#fff8f9' },
  greeting: { fontSize: 17, fontWeight: '500', color: DARK_ROSE, marginHorizontal: 14, marginTop: 16, marginBottom: 12 },

  // Hero
  hero: { marginHorizontal: 14, marginBottom: 12, backgroundColor: PINK, borderRadius: 22, padding: 18, position: 'relative' },
  ddayBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  ddayNum: { fontSize: 18, fontWeight: '500', color: '#fff' },
  ddayLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  heroMeta: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  heroPhase: { fontSize: 26, fontWeight: '500', color: '#fff', marginBottom: 2 },
  heroDay: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  heroTip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10 },
  heroTipText: { fontSize: 12, color: '#fff', lineHeight: 18 },

  // Quick
  quickGrid: { flexDirection: 'row', gap: 8, marginHorizontal: 14, marginBottom: 12 },
  quickCard: { flex: 1, backgroundColor: CARD_BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 18, padding: 14 },
  quickIcon: { fontSize: 22, marginBottom: 6 },
  quickTitle: { fontSize: 12, fontWeight: '500', color: DARK_ROSE, marginBottom: 2 },
  quickValue: { fontSize: 13, fontWeight: '500', color: PINK },
  quickEmpty: { fontSize: 12, color: '#d4a0b0' },
  quickCta: { fontSize: 11, color: PINK, fontWeight: '500', marginTop: 2 },

  // Section
  section: { marginHorizontal: 14, marginBottom: 12 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  secTitle: { fontSize: 13, fontWeight: '500', color: DARK_ROSE },
  secMore: { fontSize: 11, color: PINK, fontWeight: '500' },

  // Task
  taskRow: { backgroundColor: CARD_BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  taskIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  taskMeta: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: '500', color: DARK_ROSE },
  taskSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Streak
  streakCard: { backgroundColor: CARD_BG, borderWidth: 0.5, borderColor: BORDER, borderRadius: 16, padding: 14 },
  streakRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  streakDayCol: { alignItems: 'center', gap: 4 },
  streakDayLabel: { fontSize: 11, color: MUTED },
  streakCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  streakText: { fontSize: 11, color: MUTED, textAlign: 'center' },

  // AI Chat Banner
  chatBanner: {
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: PINK,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  chatBannerEmoji: { fontSize: 28 },
  chatBannerTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 },
  chatBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  chatBannerArrow: { fontSize: 22, color: 'rgba(255,255,255,0.7)', fontWeight: '300' },

  settingsRow: {
    marginHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  settingsText: { fontSize: 13, color: MUTED, fontWeight: '500' },
  settingsArrow: { fontSize: 18, color: BORDER },
})
