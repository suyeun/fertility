import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
  Share, Modal,
} from 'react-native'
import { router } from 'expo-router'
import { couplesApi } from '@fertility/shared'
import type { CoupleStatusResponse } from '@fertility/shared'
import { F } from '../../lib/fonts'

const PINK       = '#ff8fab'
const DARK_ROSE  = '#5a3042'
const MUTED      = '#b07080'
const BORDER     = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'
const PURPLE     = '#7c3aed'
const PURPLE_BG  = '#ede9fe'

export default function CoupleScreen() {
  const [status, setStatus]         = useState<CoupleStatusResponse | null>(null)
  const [loading, setLoading]       = useState(true)
  const [codeInput, setCodeInput]   = useState('')
  const [joining, setJoining]       = useState(false)
  const [inviting, setInviting]     = useState(false)
  const [showUnlinkModal, setShowUnlinkModal] = useState(false)
  const [unlinking, setUnlinking]   = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await couplesApi.me()
      setStatus(res)
    } catch {
      Alert.alert('오류', '연결 상태를 불러올 수 없어요')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── 초대코드 생성 ──────────────────────────────
  const handleCreateInvite = async () => {
    try {
      setInviting(true)
      const res = await couplesApi.invite()
      await load()

      const expiresDate = new Date(res.expiresAt)
      const expiresStr = `${expiresDate.getMonth() + 1}월 ${expiresDate.getDate()}일 ${expiresDate.getHours()}시`

      Alert.alert(
        '초대코드 생성 완료 💕',
        `코드: ${res.inviteCode}\n\n유효기간: ${expiresStr}까지\n\n배우자에게 코드를 알려주세요.`,
        [
          { text: '공유하기', onPress: () => shareCode(res.inviteCode) },
          { text: '닫기', style: 'cancel' },
        ]
      )
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '초대코드 생성 중 문제가 발생했어요')
    } finally {
      setInviting(false)
    }
  }

  // ── 코드 공유 ──────────────────────────────────
  const shareCode = async (code: string) => {
    await Share.share({
      message: `BOM 앱 배우자 연결 초대코드: ${code}\n\n앱에서 설정 → 배우자 연결 → 코드 입력 후 함께 기록을 공유해요 💕`,
      title: 'BOM 배우자 초대',
    })
  }

  // ── 코드 입력 후 연결 ───────────────────────────
  const handleJoin = async () => {
    const code = codeInput.trim().toUpperCase()
    if (code.length !== 6) {
      Alert.alert('코드 확인', '6자리 코드를 정확히 입력해주세요')
      return
    }
    try {
      setJoining(true)
      const res = await couplesApi.join(code)
      await load()
      Alert.alert('연결 완료 💕', `${res.partnerName}님과 연결되었어요!\n이제 일정과 기록을 함께 확인할 수 있어요.`)
      setCodeInput('')
    } catch (e: any) {
      Alert.alert('연결 실패', e?.message ?? '유효하지 않거나 만료된 코드예요')
    } finally {
      setJoining(false)
    }
  }

  // ── 연결 해제 ──────────────────────────────────
  const handleUnlink = async () => {
    if (!status?.coupleId) return
    try {
      setUnlinking(true)
      await couplesApi.unlink(status.coupleId)
      setShowUnlinkModal(false)
      await load()
      Alert.alert('연결 해제 완료', '배우자 연결이 해제되었어요. 과거 공유 기록은 유지됩니다.')
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '연결 해제 중 문제가 발생했어요')
    } finally {
      setUnlinking(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 60 }} color={PINK} />
      </SafeAreaView>
    )
  }

  const isLinked = status?.linked
  const isPending = !isLinked && status?.inviteCode

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>배우자 연결 💕</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── 연결된 상태 ── */}
        {isLinked && (
          <>
            <View style={styles.linkedCard}>
              <View style={styles.partnerAvatarRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>💑</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkedTitle}>연결됨</Text>
                  <Text style={styles.linkedName}>{status?.partnerName ?? '배우자'}님과 함께 기록 중</Text>
                  <Text style={styles.linkedRole}>
                    내 역할: {status?.role === 'OWNER' ? '초대자' : '파트너'}
                  </Text>
                </View>
              </View>
              <View style={styles.linkedFeatures}>
                <FeatureRow emoji="📅" text="시술 일정 함께 열람 · 기록" />
                <FeatureRow emoji="💊" text="복약 스케줄 공동 확인" />
                <FeatureRow emoji="📊" text="호르몬 수치 함께 추적" />
                <FeatureRow emoji="📔" text="감정일기 — 선택적 공유 가능" />
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                연결 해제 후에도 과거에 함께 기록한 데이터는 유지됩니다. 신규 기록부터 비공유로 전환돼요.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.unlinkBtn}
              onPress={() => setShowUnlinkModal(true)}
            >
              <Text style={styles.unlinkBtnText}>연결 해제하기</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── PENDING 상태 (코드 발급됨, 아직 연결 안됨) ── */}
        {isPending && (
          <>
            <View style={[styles.linkedCard, { borderColor: '#c4b5fd', backgroundColor: PURPLE_BG }]}>
              <Text style={[styles.linkedTitle, { color: PURPLE }]}>초대 대기 중 ⏳</Text>
              <Text style={styles.pendingCode}>{status?.inviteCode}</Text>
              <Text style={[styles.linkedRole, { color: PURPLE }]}>
                배우자가 이 코드를 앱에 입력하면 연결돼요
              </Text>
              {status?.expiresAt && (
                <Text style={[styles.infoText, { color: PURPLE, marginTop: 6 }]}>
                  만료: {new Date(status.expiresAt).toLocaleString('ko-KR')}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: PURPLE }]}
                onPress={() => shareCode(status!.inviteCode!)}
              >
                <Text style={[styles.shareBtnText, { color: PURPLE }]}>📤 코드 공유하기</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.inviteBtn, { opacity: inviting ? 0.6 : 1 }]}
              onPress={handleCreateInvite}
              disabled={inviting}
            >
              {inviting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.inviteBtnText}>🔄 새 코드 재발급</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── 미연결 상태 ── */}
        {!isLinked && !isPending && (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroEmoji}>💑</Text>
              <Text style={styles.heroTitle}>배우자와 함께 기록하세요</Text>
              <Text style={styles.heroDesc}>
                난임은 혼자가 아니에요. 배우자와 시술 일정·복약·호르몬 수치를 함께 확인하고 응원할 수 있어요.
              </Text>
            </View>

            {/* 초대코드 생성 (OWNER) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>초대코드 보내기</Text>
              <Text style={styles.sectionDesc}>배우자에게 코드를 보내 연결을 시작하세요</Text>
              <TouchableOpacity
                style={[styles.inviteBtn, { opacity: inviting ? 0.6 : 1 }]}
                onPress={handleCreateInvite}
                disabled={inviting}
              >
                {inviting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.inviteBtnText}>💌 초대코드 생성하기</Text>
                }
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 코드 입력 (PARTNER) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>초대코드 입력하기</Text>
              <Text style={styles.sectionDesc}>배우자가 보낸 6자리 코드를 입력하세요</Text>
              <View style={styles.codeInputRow}>
                <TextInput
                  style={styles.codeInput}
                  value={codeInput}
                  onChangeText={v => setCodeInput(v.toUpperCase().slice(0, 6))}
                  placeholder="예: AB1234"
                  placeholderTextColor={MUTED}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.joinBtn, { opacity: joining ? 0.6 : 1 }]}
                  onPress={handleJoin}
                  disabled={joining}
                >
                  {joining
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.joinBtnText}>연결</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* 공유 기능 안내 */}
            <View style={styles.featureListCard}>
              <Text style={styles.featureListTitle}>연결 후 이런 걸 함께 할 수 있어요</Text>
              <FeatureRow emoji="📅" text="시술 일정 함께 열람 · 기록" />
              <FeatureRow emoji="💊" text="복약 스케줄 공동 확인" />
              <FeatureRow emoji="📊" text="호르몬 수치 공유" />
              <FeatureRow emoji="🔔" text="일정 등록 시 배우자에게 알림" />
              <FeatureRow emoji="📔" text="감정일기 — 선택적으로 공유" />
            </View>
          </>
        )}

        {/* 면책 안내 */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            배우자와 공유된 정보는 제3자에게 공개되지 않으며 기존 인증 체계로 보호됩니다.
          </Text>
        </View>
      </ScrollView>

      {/* 연결 해제 확인 모달 */}
      <Modal visible={showUnlinkModal} transparent animationType="fade" onRequestClose={() => setShowUnlinkModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>연결 해제할까요?</Text>
            <Text style={styles.modalDesc}>
              해제 후에도 과거 기록은 유지돼요.{'\n'}새 기록부터 비공유로 전환됩니다.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowUnlinkModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { opacity: unlinking ? 0.6 : 1 }]}
                onPress={handleUnlink}
                disabled={unlinking}
              >
                {unlinking
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>연결 해제</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: LIGHT_PINK },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },

  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  backBtn: { marginBottom: 4 },
  backText: { fontFamily: F.regular, fontSize: 13, color: MUTED },
  headerTitle: { fontFamily: F.bold, fontSize: 20, color: DARK_ROSE },

  // 연결 완료 카드
  linkedCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1.5, borderColor: BORDER,
    shadowColor: PINK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  partnerAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: LIGHT_PINK, borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { fontSize: 28 },
  linkedTitle:  { fontFamily: F.bold, fontSize: 16, color: DARK_ROSE },
  linkedName:   { fontFamily: F.semiBold, fontSize: 14, color: DARK_ROSE, marginTop: 2 },
  linkedRole:   { fontFamily: F.regular, fontSize: 12, color: MUTED, marginTop: 2 },
  linkedFeatures: { gap: 8, marginTop: 4 },

  // PENDING 코드
  pendingCode: {
    fontFamily: F.bold, fontSize: 34, color: PURPLE,
    letterSpacing: 8, textAlign: 'center', marginVertical: 16,
  },
  shareBtn: {
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', marginTop: 10,
  },
  shareBtnText: { fontFamily: F.bold, fontSize: 14 },

  // 미연결 히어로
  heroCard: {
    backgroundColor: PINK, borderRadius: 20, padding: 24,
    alignItems: 'center', marginTop: 8,
  },
  heroEmoji: { fontSize: 48, marginBottom: 10 },
  heroTitle: { fontFamily: F.bold, fontSize: 18, color: '#fff', marginBottom: 8 },
  heroDesc:  { fontFamily: F.regular, fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20 },

  // 섹션
  section:     { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: BORDER },
  sectionTitle: { fontFamily: F.bold, fontSize: 15, color: DARK_ROSE, marginBottom: 4 },
  sectionDesc:  { fontFamily: F.regular, fontSize: 12, color: MUTED, marginBottom: 14 },

  // 초대 버튼
  inviteBtn: {
    backgroundColor: PINK, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
  },
  inviteBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },

  // 구분선
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontFamily: F.regular, fontSize: 12, color: MUTED },

  // 코드 입력
  codeInputRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    flex: 1, backgroundColor: LIGHT_PINK, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 12,
    fontFamily: F.bold, fontSize: 20, color: DARK_ROSE, letterSpacing: 4,
    textAlign: 'center',
  },
  joinBtn: {
    backgroundColor: DARK_ROSE, borderRadius: 12,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  joinBtnText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },

  // 기능 목록
  featureListCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: BORDER },
  featureListTitle: { fontFamily: F.bold, fontSize: 14, color: DARK_ROSE, marginBottom: 12 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  featureEmoji: { fontSize: 18, width: 26 },
  featureText: { fontFamily: F.regular, fontSize: 13, color: DARK_ROSE, flex: 1 },

  // 안내 카드
  infoCard: {
    backgroundColor: '#fff8e1', borderRadius: 12, padding: 12,
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 14, marginTop: 1 },
  infoText: { fontFamily: F.regular, fontSize: 12, color: '#78350f', flex: 1, lineHeight: 18 },

  // 연결 해제 버튼
  unlinkBtn: {
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#fca5a5',
  },
  unlinkBtnText: { fontFamily: F.semiBold, fontSize: 14, color: '#dc2626' },

  // 면책
  disclaimer: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12 },
  disclaimerText: { fontFamily: F.regular, fontSize: 11, color: '#166534', lineHeight: 17 },

  // 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    marginHorizontal: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  modalTitle:  { fontFamily: F.bold, fontSize: 17, color: DARK_ROSE, marginBottom: 8 },
  modalDesc:   { fontFamily: F.regular, fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 20 },
  modalBtns:   { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, backgroundColor: LIGHT_PINK, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  modalCancelText:  { fontFamily: F.semiBold, fontSize: 14, color: DARK_ROSE },
  modalConfirm:     { flex: 1, backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalConfirmText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
})
