// apps/mobile/app/settings/index.tsx
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { usersApi, canUseClinicScheduler, ClinicFeature } from '@fertility/shared'
import type { UserProfile, PaywallSource } from '@fertility/shared'
import { clearAuth } from '../../lib/auth'
import {
  requestNotificationPermissions,
  registerPushToken,
  scheduleDailyBBTReminder,
  cancelDailyBBTReminder,
  rescheduleMedicationAlerts,
} from '../../lib/notifications'
import { getSubscriptionStatus } from '../../lib/purchases'
import { treatmentApi } from '@fertility/shared'
import PaywallModal from '../../components/PaywallModal'

const PINK      = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED     = '#b07080'
const BORDER    = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

export default function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // 알림 토글 상태
  const [notifPermission, setNotifPermission] = useState(false)
  const [dailyBBT,        setDailyBBT]        = useState(false)
  const [medReminder,     setMedReminder]      = useState(false)
  const [checkingPermission, setCheckingPermission] = useState(false)
  const [subStatus, setSubStatus] = useState<{ isActive: boolean; expiresAt: string | null }>({
    isActive: false, expiresAt: null,
  })

  // 페이월 모달
  const [paywallSource, setPaywallSource] = useState<PaywallSource | null>(null)

  const isPremium = subStatus.isActive

  useEffect(() => {
    const init = async () => {
      try {
        const p = await usersApi.getProfile()
        setProfile(p)
      } catch {}

      const { status } = await Notifications.getPermissionsAsync()
      setNotifPermission(status === 'granted')

      const scheduled = await Notifications.getAllScheduledNotificationsAsync()
      setDailyBBT(scheduled.some(n => n.identifier === 'bom_daily_bbt'))

      // 약물 알림 활성 여부 확인
      setMedReminder(scheduled.some(n => (n.content.data as any)?.tag === 'medication'))

      const sub = await getSubscriptionStatus()
      setSubStatus(sub)

      setLoading(false)
    }
    init()
  }, [])

  // 구독 성공 후 상태 갱신
  const handlePaywallSuccess = async () => {
    const sub = await getSubscriptionStatus()
    setSubStatus(sub)
  }

  // ── 앱 알림 권한 토글 ──
  const handleNotifToggle = async (value: boolean) => {
    setCheckingPermission(true)
    if (value) {
      const granted = await requestNotificationPermissions()
      setNotifPermission(granted)
      if (granted) {
        await registerPushToken()
        if (dailyBBT) await scheduleDailyBBTReminder()
      } else {
        Alert.alert(
          '알림 권한 필요',
          '기기 설정에서 BOM 앱의 알림을 허용해 주세요.',
          [{ text: '확인' }],
        )
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync()
      setNotifPermission(false)
      setDailyBBT(false)
      setMedReminder(false)
    }
    setCheckingPermission(false)
  }

  // ── 일일 BBT 알림 토글 ──
  const handleDailyBBTToggle = async (value: boolean) => {
    if (!notifPermission) {
      Alert.alert('알림 권한 필요', '먼저 알림을 활성화해 주세요.')
      return
    }
    setDailyBBT(value)
    if (value) await scheduleDailyBBTReminder()
    else await cancelDailyBBTReminder()
  }

  // ── 약물 알림 토글 — MEDICATION_REMINDER 게이트 ──
  const handleMedReminderToggle = async (value: boolean) => {
    if (!notifPermission) {
      Alert.alert('알림 권한 필요', '먼저 알림을 활성화해 주세요.')
      return
    }

    const canEnable = canUseClinicScheduler(ClinicFeature.MEDICATION_REMINDER, { isPremium })
    if (!canEnable) {
      setPaywallSource('medication_reminder')
      return
    }

    setMedReminder(value)
    if (value) {
      // 현재 등록된 모든 시술 일정의 약물 알림 재스케줄
      try {
        const schedules = await treatmentApi.getAll()
        await rescheduleMedicationAlerts(schedules)
      } catch {}
    } else {
      // 약물 알림만 취소 (appointment D-1은 유지)
      const scheduled = await Notifications.getAllScheduledNotificationsAsync()
      for (const n of scheduled) {
        if ((n.content.data as any)?.tag === 'medication') {
          await Notifications.cancelScheduledNotificationAsync(n.identifier)
        }
      }
    }
  }

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await clearAuth()
          router.replace('/login' as any)
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={PINK} style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

          {/* 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>설정</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* 프로필 */}
          {profile && (
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              <View style={styles.stageBadge}>
                <Text style={styles.stageText}>{STAGE_LABEL[profile.treatmentStage || 'natural']}</Text>
              </View>
            </View>
          )}

          {/* 알림 설정 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 알림 설정</Text>

            {/* 앱 알림 */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>앱 알림 활성화</Text>
                <Text style={styles.rowDesc}>시술 일정·약물·기록 독려 알림</Text>
              </View>
              {checkingPermission
                ? <ActivityIndicator color={PINK} size="small" />
                : <Switch
                    value={notifPermission}
                    onValueChange={handleNotifToggle}
                    trackColor={{ false: BORDER, true: PINK }}
                    thumbColor="#fff"
                  />
              }
            </View>

            {/* 일일 BBT */}
            <View style={[styles.row, !notifPermission && styles.rowDisabled]}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>매일 아침 기초체온 알림</Text>
                <Text style={styles.rowDesc}>매일 오전 7시 BBT 기록 독려</Text>
              </View>
              <Switch
                value={dailyBBT}
                onValueChange={handleDailyBBTToggle}
                disabled={!notifPermission}
                trackColor={{ false: BORDER, true: PINK }}
                thumbColor="#fff"
              />
            </View>

            {/* ── 약물 복용 알림 — 프리미엄 게이트 ── */}
            {isPremium ? (
              // 프리미엄: 활성 스위치
              <View style={[styles.row, !notifPermission && styles.rowDisabled]}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowLabel}>💊 약물 복용 알림</Text>
                  <Text style={styles.rowDesc}>등록된 약물 정시 투약 알림</Text>
                </View>
                <Switch
                  value={medReminder}
                  onValueChange={handleMedReminderToggle}
                  disabled={!notifPermission}
                  trackColor={{ false: BORDER, true: PINK }}
                  thumbColor="#fff"
                />
              </View>
            ) : (
              // 비프리미엄: 잠긴 미리보기 — 숨기지 않고 비활성 노출
              <TouchableOpacity
                style={styles.lockedRow}
                onPress={() => setPaywallSource('medication_reminder')}
                activeOpacity={0.8}
              >
                <View style={styles.lockedRowLeft}>
                  <View style={styles.lockBadge}>
                    <Text style={styles.lockBadgeTxt}>🔒</Text>
                  </View>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowLabel, { color: PINK }]}>약물 복용 알림</Text>
                    <Text style={styles.rowDesc}>프리미엄으로 정시 투약 알림 활성화</Text>
                  </View>
                </View>
                <Text style={styles.lockedCta}>켜기 ›</Text>
              </TouchableOpacity>
            )}

            {/* 시술 D-1 알림 안내 (무료) */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                🌸 시술 D-1 알림은 시술 일정을 등록하면 자동으로 스케줄링돼요.
              </Text>
            </View>
          </View>

          {/* 구독 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💎 구독</Text>
            {subStatus.isActive ? (
              <View style={styles.subActiveBox}>
                <Text style={styles.subActiveTitle}>✅ 프리미엄 구독 중</Text>
                {subStatus.expiresAt && (
                  <Text style={styles.subActiveDesc}>
                    {new Date(subStatus.expiresAt).toLocaleDateString('ko-KR')} 자동 갱신
                  </Text>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.subBtn}
                onPress={() => router.push('/subscription' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.subBtnText}>🌸 프리미엄 구독하기</Text>
                <Text style={styles.subBtnArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 계정 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 계정</Text>
            <TouchableOpacity style={styles.dangerRow} onPress={handleLogout}>
              <Text style={styles.dangerText}>로그아웃</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* 페이월 모달 */}
      <PaywallModal
        visible={paywallSource !== null}
        source={paywallSource ?? 'medication_reminder'}
        onClose={() => setPaywallSource(null)}
        onSuccess={handlePaywallSuccess}
      />
    </>
  )
}

const STAGE_LABEL: Record<string, string> = {
  natural: '🌱 자연임신 준비',
  iui:     '🧪 인공수정(IUI)',
  ivf:     '🧬 시험관(IVF)',
  fet:     '❄️ 동결이식(FET)',
  pregnant:'🌸 임신 성공',
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#fffbfc' },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn:     { width: 32 },
  backText:    { fontSize: 20, color: MUTED },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DARK_ROSE },

  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: BORDER, marginBottom: 24,
    alignItems: 'center', gap: 4,
  },
  profileName:  { fontSize: 18, fontWeight: '700', color: DARK_ROSE },
  profileEmail: { fontSize: 12, color: MUTED },
  stageBadge:   { backgroundColor: LIGHT_PINK, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 6 },
  stageText:    { fontSize: 12, color: PINK, fontWeight: '600' },

  section:      { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: DARK_ROSE, marginBottom: 12 },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 8,
  },
  rowDisabled: { opacity: 0.4 },
  rowLeft:     { flex: 1, marginRight: 12 },
  rowLabel:    { fontSize: 14, fontWeight: '600', color: DARK_ROSE },
  rowDesc:     { fontSize: 11, color: MUTED, marginTop: 2 },

  // 잠긴 약물 알림 행
  lockedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: LIGHT_PINK, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 8,
  },
  lockedRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  lockBadge:     { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,143,171,0.15)', alignItems: 'center', justifyContent: 'center' },
  lockBadgeTxt:  { fontSize: 14 },
  lockedCta:     { fontSize: 13, fontWeight: '700', color: PINK },

  infoBox:  { backgroundColor: LIGHT_PINK, borderRadius: 14, padding: 14, marginTop: 4 },
  infoText: { fontSize: 12, color: MUTED, lineHeight: 18 },

  dangerRow: {
    backgroundColor: '#fff0f0', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#fecaca', alignItems: 'center',
  },
  dangerText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },

  subActiveBox: {
    backgroundColor: '#d1fae5', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#a7f3d0',
  },
  subActiveTitle: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  subActiveDesc:  { fontSize: 11, color: '#047857', marginTop: 4 },

  subBtn: {
    backgroundColor: PINK, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  subBtnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  subBtnArrow: { fontSize: 18, color: 'rgba(255,255,255,0.7)' },
})
