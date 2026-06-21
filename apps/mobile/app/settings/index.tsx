import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, SafeAreaView, Alert, ActivityIndicator, Modal, Linking,
} from 'react-native'
import { router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import {
  usersApi, canUseClinicScheduler, ClinicFeature,
  useModeChange, useUserStore, MODE_OPTIONS,
  IUI_STAGE_OPTIONS, IVF_STAGE_OPTIONS, getStageLabelKo,
} from '@fertility/shared'
import type { PaywallSource } from '@fertility/shared'
import { clearAuth } from '../../lib/auth'
import {
  requestNotificationPermissions, registerPushToken,
  scheduleDailyBBTReminder, cancelDailyBBTReminder, rescheduleMedicationAlerts,
} from '../../lib/notifications'
import { getSubscriptionStatus } from '../../lib/purchases'
import { treatmentApi } from '@fertility/shared'
import PaywallModal from '../../components/PaywallModal'
import { F } from '../../lib/fonts'

const PINK       = '#ff8fab'
const DARK_ROSE  = '#5a3042'
const MUTED      = '#b07080'
const BORDER     = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

// ── 바텀시트 공통 래퍼 ──────────────────────────────────
function BottomSheet({ visible, title, subtitle, onClose, children }: {
  visible: boolean; title: string; subtitle?: string
  onClose: () => void; children: React.ReactNode
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={bs.overlay} activeOpacity={1} onPress={onClose} />
      <View style={bs.sheet}>
        <View style={bs.handle} />
        <Text style={bs.title}>{title}</Text>
        {subtitle && <Text style={bs.subtitle}>{subtitle}</Text>}
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </Modal>
  )
}

export default function SettingsScreen() {
  const { profile: storeProfile, syncProfile } = useUserStore()

  // 알림
  const [notifPermission, setNotifPermission] = useState(false)
  const [dailyBBT,        setDailyBBT]        = useState(false)
  const [medReminder,     setMedReminder]      = useState(false)
  const [checkingPermission, setCheckingPermission] = useState(false)
  const [subStatus, setSubStatus] = useState<{ isActive: boolean; expiresAt: string | null }>({
    isActive: false, expiresAt: null,
  })
  const [loading, setLoading] = useState(true)
  const [paywallSource, setPaywallSource] = useState<PaywallSource | null>(null)
  const isPremium = subStatus.isActive

  // 모드/단계 변경 훅
  const {
    sheet: modeSheet, saving: modeSaving, pendingMode,
    currentMode, currentStage,
    openModeSheet, openStageSheet, closeSheet,
    handleModeSelect, confirmToNatural, handleStageSelect,
  } = useModeChange()

  const closeModeSheet = async () => {
    closeSheet()
    await syncProfile()
  }

  const profile = storeProfile

  useEffect(() => {
    const init = async () => {
      try {
        await syncProfile()
      } catch {}

      const { status } = await Notifications.getPermissionsAsync()
      setNotifPermission(status === 'granted')

      const scheduled = await Notifications.getAllScheduledNotificationsAsync()
      setDailyBBT(scheduled.some(n => n.identifier === 'bom_daily_bbt'))
      setMedReminder(scheduled.some(n => (n.content.data as any)?.tag === 'medication'))

      const sub = await getSubscriptionStatus()
      setSubStatus(sub)
      setLoading(false)
    }
    init()
  }, [])

  const handlePaywallSuccess = async () => {
    const sub = await getSubscriptionStatus()
    setSubStatus(sub)
  }

  const handleNotifToggle = async (value: boolean) => {
    setCheckingPermission(true)
    if (value) {
      const granted = await requestNotificationPermissions()
      setNotifPermission(granted)
      if (granted) {
        await registerPushToken()
        if (dailyBBT) await scheduleDailyBBTReminder()
      } else {
        Alert.alert('알림 권한 필요', '기기 설정에서 BOM 앱의 알림을 허용해 주세요.')
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync()
      setNotifPermission(false)
      setDailyBBT(false)
      setMedReminder(false)
    }
    setCheckingPermission(false)
  }

  const handleDailyBBTToggle = async (value: boolean) => {
    if (!notifPermission) { Alert.alert('알림 권한 필요', '먼저 알림을 활성화해 주세요.'); return }
    setDailyBBT(value)
    if (value) await scheduleDailyBBTReminder()
    else await cancelDailyBBTReminder()
  }

  const handleMedReminderToggle = async (value: boolean) => {
    if (!notifPermission) { Alert.alert('알림 권한 필요', '먼저 알림을 활성화해 주세요.'); return }
    if (!canUseClinicScheduler(ClinicFeature.MEDICATION_REMINDER, { isPremium })) {
      setPaywallSource('medication_reminder'); return
    }
    setMedReminder(value)
    if (value) {
      try { const schedules = await treatmentApi.getAll(); await rescheduleMedicationAlerts(schedules) } catch {}
    } else {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync()
      for (const n of scheduled) {
        if ((n.content.data as any)?.tag === 'medication')
          await Notifications.cancelScheduledNotificationAsync(n.identifier)
      }
    }
  }

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: async () => { await clearAuth(); router.replace('/login' as any) } },
    ])
  }

  const stageOptions = (pendingMode ?? currentMode) === 'iui' ? IUI_STAGE_OPTIONS : IVF_STAGE_OPTIONS
  const modeLabel = MODE_OPTIONS.find(m => m.value === currentMode)?.label ?? '자연임신 준비 중이에요'

  if (loading) {
    return <SafeAreaView style={s.safe}><ActivityIndicator color={PINK} style={{ marginTop: 40 }} /></SafeAreaView>
  }

  return (
    <>
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content}>

          {/* 헤더 */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>설정</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* 프로필 카드 */}
          {profile && (
            <View style={s.profileCard}>
              <Text style={s.profileName}>{profile.name}</Text>
              <Text style={s.profileEmail}>{profile.email}</Text>
            </View>
          )}

          {/* ── 나의 치료 정보 ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>🌸 나의 치료 정보</Text>

            <TouchableOpacity style={s.row} onPress={openModeSheet} activeOpacity={0.8}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>현재 모드</Text>
                <Text style={s.rowDesc}>{modeLabel}</Text>
              </View>
              <Text style={s.chevron}>변경 ›</Text>
            </TouchableOpacity>

            {currentMode !== 'natural' && (
              <TouchableOpacity style={s.row} onPress={openStageSheet} activeOpacity={0.8}>
                <View style={s.rowLeft}>
                  <Text style={s.rowLabel}>현재 단계</Text>
                  <Text style={s.rowDesc}>
                    {currentStage ? getStageLabelKo(currentMode, currentStage) : '아직 미설정 — 탭해서 설정'}
                  </Text>
                </View>
                <Text style={s.chevron}>변경 ›</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 알림 설정 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>🔔 알림 설정</Text>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>앱 알림 활성화</Text>
                <Text style={s.rowDesc}>시술 일정·약물·기록 독려 알림</Text>
              </View>
              {checkingPermission
                ? <ActivityIndicator color={PINK} size="small" />
                : <Switch value={notifPermission} onValueChange={handleNotifToggle}
                    trackColor={{ false: BORDER, true: PINK }} thumbColor="#fff" />
              }
            </View>
            <View style={[s.row, !notifPermission && s.rowDisabled]}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>매일 아침 기초체온 알림</Text>
                <Text style={s.rowDesc}>매일 오전 7시 BBT 기록 독려</Text>
              </View>
              <Switch value={dailyBBT} onValueChange={handleDailyBBTToggle} disabled={!notifPermission}
                trackColor={{ false: BORDER, true: PINK }} thumbColor="#fff" />
            </View>
            {isPremium ? (
              <View style={[s.row, !notifPermission && s.rowDisabled]}>
                <View style={s.rowLeft}>
                  <Text style={s.rowLabel}>💊 약물 복용 알림</Text>
                  <Text style={s.rowDesc}>등록된 약물 정시 투약 알림</Text>
                </View>
                <Switch value={medReminder} onValueChange={handleMedReminderToggle} disabled={!notifPermission}
                  trackColor={{ false: BORDER, true: PINK }} thumbColor="#fff" />
              </View>
            ) : (
              <TouchableOpacity style={s.lockedRow} onPress={() => setPaywallSource('medication_reminder')} activeOpacity={0.8}>
                <View style={s.rowLeft}>
                  <Text style={[s.rowLabel, { color: PINK }]}>🔒 약물 복용 알림</Text>
                  <Text style={s.rowDesc}>프리미엄으로 정시 투약 알림 활성화</Text>
                </View>
                <Text style={s.chevron}>켜기 ›</Text>
              </TouchableOpacity>
            )}
            <View style={s.infoBox}>
              <Text style={s.infoText}>🌸 시술 D-1 알림은 시술 일정을 등록하면 자동으로 스케줄링돼요.</Text>
            </View>
          </View>

          {/* 구독 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>💎 구독</Text>
            {subStatus.isActive ? (
              <View style={s.subActiveBox}>
                <Text style={s.subActiveTitle}>✅ 프리미엄 구독 중</Text>
                {subStatus.expiresAt && (
                  <Text style={s.subActiveDesc}>{new Date(subStatus.expiresAt).toLocaleDateString('ko-KR')} 자동 갱신</Text>
                )}
              </View>
            ) : (
              <TouchableOpacity style={s.subBtn} onPress={() => router.push('/subscription' as any)} activeOpacity={0.85}>
                <Text style={s.subBtnText}>🌸 프리미엄 구독하기</Text>
                <Text style={s.subBtnArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 계정 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>👤 계정</Text>
            <TouchableOpacity style={s.dangerRow} onPress={handleLogout}>
              <Text style={s.dangerText}>로그아웃</Text>
            </TouchableOpacity>
          </View>

          {/* 약관 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>📋 약관 및 정책</Text>
            <TouchableOpacity
              style={s.row}
              onPress={() => Linking.openURL('https://cuboid-string-459.notion.site/Lunera-3864e4079c7880699f4cf6ac9f9c7952')}
              activeOpacity={0.8}
            >
              <Text style={s.rowLabel}>개인정보처리방침</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* ── 모드 변경 바텀시트 ── */}
      <BottomSheet
        visible={modeSheet === 'mode'}
        title="치료 모드 변경"
        subtitle="현재 상황에 맞는 모드를 선택해주세요"
        onClose={closeModeSheet}
      >
        <View style={{ gap: 8, paddingBottom: 24 }}>
          {MODE_OPTIONS.map(opt => {
            const isSelected = currentMode === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                style={[bs.optionBtn, isSelected && bs.optionBtnActive]}
                onPress={() => handleModeSelect(opt.value)}
                disabled={modeSaving}
                activeOpacity={0.8}
              >
                <View style={[bs.optionIcon, { backgroundColor: opt.color + '18' }]}>
                  <Text style={{ fontSize: 22 }}>{opt.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[bs.optionLabel, isSelected && { color: '#c0005a' }]}>{opt.label}</Text>
                  <Text style={bs.optionSub}>{opt.sub}</Text>
                </View>
                {isSelected && <View style={bs.selectedDot}><View style={bs.selectedDotInner} /></View>}
              </TouchableOpacity>
            )
          })}
        </View>
      </BottomSheet>

      {/* ── 시술 단계 변경 바텀시트 ── */}
      <BottomSheet
        visible={modeSheet === 'stage'}
        title={`${(pendingMode ?? currentMode) === 'iui' ? '인공수정(IUI)' : '시험관(IVF)'} 단계 선택`}
        subtitle="현재 진행 중인 단계를 선택해주세요"
        onClose={closeModeSheet}
      >
        <View style={{ gap: 8, paddingBottom: 24 }}>
          {stageOptions.map((opt, i) => {
            const isUnknown = opt.value === null
            const isSelected = currentStage === opt.value && !pendingMode
            return (
              <TouchableOpacity
                key={i}
                style={[bs.optionBtn, isSelected && bs.optionBtnActive, isUnknown && bs.optionBtnDashed]}
                onPress={async () => { await handleStageSelect(opt.value); await syncProfile() }}
                disabled={modeSaving}
                activeOpacity={0.8}
              >
                <View style={[bs.optionIcon, { backgroundColor: LIGHT_PINK }]}>
                  <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                </View>
                <Text style={[bs.optionLabel, isUnknown && { color: MUTED }, isSelected && { color: '#c0005a' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </BottomSheet>

      {/* ── 시술 → 자연임신 확인 바텀시트 ── */}
      <BottomSheet
        visible={modeSheet === 'confirm_nat'}
        title="자연임신 모드로 변경"
        onClose={closeModeSheet}
      >
        <View style={{ paddingBottom: 24, gap: 12 }}>
          <View style={bs.confirmNotice}>
            <Text style={bs.confirmNoticeText}>
              🌸 시술 관련 기록은 모두 유지됩니다.{'\n'}모드만 자연임신 준비로 변경할게요.
            </Text>
          </View>
          <TouchableOpacity
            style={[bs.confirmBtn, { backgroundColor: '#22c55e' }]}
            onPress={async () => { await confirmToNatural(); await syncProfile() }}
            disabled={modeSaving}
            activeOpacity={0.85}
          >
            {modeSaving
              ? <ActivityIndicator color="#fff" />
              : <Text style={bs.confirmBtnText}>자연임신 모드로 변경</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={bs.cancelBtn} onPress={closeModeSheet}>
            <Text style={bs.cancelBtnText}>취소</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* 페이월 */}
      <PaywallModal
        visible={paywallSource !== null}
        source={paywallSource ?? 'medication_reminder'}
        onClose={() => setPaywallSource(null)}
        onSuccess={handlePaywallSuccess}
      />
    </>
  )
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#fffbfc' },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn:     { width: 32 },
  backText:    { fontSize: 20, color: MUTED },
  headerTitle: { fontSize: 17, fontFamily: F.bold, color: DARK_ROSE },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: BORDER, marginBottom: 24, alignItems: 'center', gap: 4,
  },
  profileName:  { fontSize: 18, fontFamily: F.bold, color: DARK_ROSE },
  profileEmail: { fontSize: 12, color: MUTED },
  section:      { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontFamily: F.bold, color: DARK_ROSE, marginBottom: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 8,
  },
  rowDisabled: { opacity: 0.4 },
  rowLeft:  { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 14, fontFamily: F.semiBold, color: DARK_ROSE },
  rowDesc:  { fontSize: 11, color: MUTED, marginTop: 2 },
  chevron:  { fontSize: 12, fontFamily: F.semiBold, color: PINK },
  lockedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: LIGHT_PINK, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 8,
  },
  infoBox:  { backgroundColor: LIGHT_PINK, borderRadius: 14, padding: 14, marginTop: 4 },
  infoText: { fontSize: 12, color: MUTED, lineHeight: 18 },
  dangerRow: {
    backgroundColor: '#fff0f0', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#fecaca', alignItems: 'center',
  },
  dangerText:     { fontSize: 14, fontFamily: F.semiBold, color: '#ef4444' },
  subActiveBox:   { backgroundColor: '#d1fae5', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#a7f3d0' },
  subActiveTitle: { fontSize: 14, fontFamily: F.bold, color: '#065f46' },
  subActiveDesc:  { fontSize: 11, color: '#047857', marginTop: 4 },
  subBtn:         { backgroundColor: PINK, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subBtnText:     { fontSize: 14, fontFamily: F.bold, color: '#fff' },
  subBtnArrow:    { fontSize: 18, color: 'rgba(255,255,255,0.7)' },
})

const bs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '85%',
  },
  handle:   { width: 40, height: 4, backgroundColor: '#e0d0d8', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:    { fontSize: 17, fontFamily: F.bold, color: DARK_ROSE, marginBottom: 4 },
  subtitle: { fontSize: 12, color: MUTED, marginBottom: 16 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
  },
  optionBtnActive: { borderColor: PINK, backgroundColor: LIGHT_PINK },
  optionBtnDashed: { borderStyle: 'dashed', borderColor: '#e0c0c8' },
  optionIcon:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionLabel:   { fontSize: 14, fontFamily: F.semiBold, color: DARK_ROSE },
  optionSub:     { fontSize: 11, color: MUTED, marginTop: 2 },
  selectedDot:   { width: 20, height: 20, borderRadius: 10, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center' },
  selectedDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  confirmNotice: { backgroundColor: LIGHT_PINK, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  confirmNoticeText: { fontSize: 14, color: DARK_ROSE, lineHeight: 22 },
  confirmBtn:    { borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  confirmBtnText:{ fontSize: 15, fontFamily: F.bold, color: '#fff' },
  cancelBtn:     { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, color: MUTED },
})
