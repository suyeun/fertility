// apps/mobile/components/PaywallModal.tsx
// 페이월 모달 — CLINIC 프리미엄 기능 잠금 시 트리거
//
// source 파라미터로 어느 잠금 지점에서 왔는지 전달 (전환율 분석용).
// 실제 구매·복원은 RevenueCat SDK가 담당. 직접 결제 정보를 다루지 않는다.

import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native'
import type { PurchasesPackage } from 'react-native-purchases'
import {
  getOfferings, purchasePackage, PRODUCT_IDS,
} from '../lib/purchases'
import type { PaywallSource } from '@fertility/shared'

const PINK      = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED     = '#b07080'
const BORDER    = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

// ────────────────────────────────────────────────────
// source별 콘텐츠
// ────────────────────────────────────────────────────
const SOURCE_CONTENT: Record<PaywallSource, { title: string; description: string; emoji: string }> = {
  medication_reminder: {
    emoji: '💊',
    title: '약물 알림은\n프리미엄 기능이에요',
    description: '주사·질정·경구약 투여 시각에 맞춰\n정시 푸시 알림을 보내드려요.',
  },
  multi_schedule: {
    emoji: '📅',
    title: '다회차 일정 관리는\n프리미엄 기능이에요',
    description: '2회차부터는 프리미엄으로\n모든 시술 일정을 한눈에 관리하세요.',
  },
  analytics: {
    emoji: '📊',
    title: '추이 분석은\n프리미엄 기능이에요',
    description: '호르몬 수치·주기 패턴·시술 결과를\n장기 차트로 분석해드려요.',
  },
  generic: {
    emoji: '🌸',
    title: '프리미엄 기능이에요',
    description: '더 많은 기능을 이용하려면\nBOM 프리미엄을 시작해보세요.',
  },
}

const PREMIUM_FEATURES = [
  { emoji: '💊', text: '약물·주사 정시 알림 (핵심)' },
  { emoji: '📅', text: '다회차 시술 일정 무제한 등록' },
  { emoji: '📊', text: '호르몬·주기 추이 분석 차트' },
  { emoji: '🤖', text: 'AI 채팅 무제한 — 수치·시술 Q&A' },
  { emoji: '🌸', text: '감정 일기 AI 분석 + 매일 응원' },
]

// ────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────
interface PaywallModalProps {
  visible: boolean
  source: PaywallSource
  onClose: () => void
  onSuccess?: () => void   // 구매 성공 후 화면 새로고침 콜백
}

export default function PaywallModal({ visible, source, onClose, onSuccess }: PaywallModalProps) {
  const [packages, setPackages]     = useState<PurchasesPackage[]>([])
  const [selected, setSelected]     = useState<PurchasesPackage | null>(null)
  const [loading, setLoading]       = useState(true)
  const [purchasing, setPurchasing] = useState(false)

  const content = SOURCE_CONTENT[source]

  useEffect(() => {
    if (!visible) return
    const load = async () => {
      setLoading(true)
      try {
        const pkgs = await getOfferings()
        setPackages(pkgs)
        // 연간 구독 기본 선택 (없으면 월간)
        const annual = pkgs.find(p => p.product.identifier === PRODUCT_IDS.ANNUAL)
        setSelected(annual ?? pkgs[0] ?? null)
      } catch (e) {
        console.warn('[PaywallModal] offerings 로드 실패:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [visible])

  // 14일 무료체험 시작 → RevenueCat 구매 플로우
  const handleStartTrial = async () => {
    if (!selected) return
    setPurchasing(true)
    try {
      const result = await purchasePackage(selected)
      if (result.success) {
        onClose()
        Alert.alert(
          '구독 시작 🌸',
          '14일 무료체험이 시작됐어요!\n약물 알림을 포함한 모든 기능을 사용해보세요.',
          [{ text: '확인', onPress: onSuccess }],
        )
      } else if (result.error && result.error !== 'cancelled') {
        Alert.alert('결제 오류', result.error ?? '잠시 후 다시 시도해주세요.')
      }
    } finally {
      setPurchasing(false)
    }
  }

  const isAnnual = (pkg: PurchasesPackage) => pkg.product.identifier === PRODUCT_IDS.ANNUAL

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* 헤더 */}
          <View style={s.header}>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>

            <Text style={s.emoji}>{content.emoji}</Text>

            <View style={s.lockBadge}>
              <Text style={s.lockBadgeTxt}>🔒 프리미엄 전용</Text>
            </View>

            <Text style={s.title}>{content.title}</Text>
            <Text style={s.desc}>{content.description}</Text>
          </View>

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 프리미엄 기능 목록 */}
            <Text style={s.featLabel}>프리미엄 포함 기능</Text>
            <View style={s.featBox}>
              {PREMIUM_FEATURES.map((f, i) => (
                <View key={i} style={s.featRow}>
                  <Text style={s.featEmoji}>{f.emoji}</Text>
                  <Text style={s.featText}>{f.text}</Text>
                </View>
              ))}
            </View>

            {/* 플랜 선택 */}
            {loading ? (
              <ActivityIndicator color={PINK} style={{ marginVertical: 16 }} />
            ) : packages.length === 0 ? (
              <View style={s.noPlan}>
                <Text style={s.noPlanText}>구독 플랜을 불러올 수 없어요.{'\n'}잠시 후 다시 시도해주세요.</Text>
              </View>
            ) : (
              <View style={s.plans}>
                {packages.map(pkg => {
                  const isSel = selected?.product.identifier === pkg.product.identifier
                  const annual = isAnnual(pkg)
                  return (
                    <TouchableOpacity
                      key={pkg.product.identifier}
                      style={[s.planCard, isSel && s.planCardSel]}
                      onPress={() => setSelected(pkg)}
                      activeOpacity={0.8}
                    >
                      {annual && (
                        <View style={s.saveBadge}>
                          <Text style={s.saveBadgeTxt}>🔥 최대 40% 할인</Text>
                        </View>
                      )}
                      <View style={s.planRow}>
                        <View style={[s.radio, isSel && s.radioSel]}>
                          {isSel && <View style={s.radioDot} />}
                        </View>
                        <View style={s.planInfo}>
                          <Text style={[s.planName, isSel && s.planNameSel]}>
                            {annual ? '연간 구독' : '월간 구독'}
                          </Text>
                          {annual && (
                            <Text style={s.planSub}>
                              월 {Math.round(pkg.product.price / 12).toLocaleString()}원 환산
                            </Text>
                          )}
                        </View>
                        <Text style={[s.planPrice, isSel && s.planPriceSel]}>
                          {pkg.product.priceString}
                          <Text style={s.planPeriod}>{annual ? '/년' : '/월'}</Text>
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[s.cta, (!selected || purchasing || loading) && s.ctaDisabled]}
              onPress={handleStartTrial}
              disabled={!selected || purchasing || loading}
              activeOpacity={0.85}
            >
              {purchasing
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.ctaTxt}>14일 무료체험 시작</Text>
              }
            </TouchableOpacity>

            <Text style={s.legal}>
              무료체험 후 자동 결제됩니다 · 언제든지 App Store / Play Store에서 해지 가능
            </Text>

            <TouchableOpacity onPress={onClose} style={s.later}>
              <Text style={s.laterTxt}>나중에</Text>
            </TouchableOpacity>
          </ScrollView>

        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
  },

  // 헤더 (그라디언트 배경 모사)
  header: {
    backgroundColor: LIGHT_PINK,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 16, color: MUTED },
  emoji: { fontSize: 40, marginBottom: 10 },
  lockBadge: {
    backgroundColor: 'rgba(255,143,171,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,143,171,0.3)',
    marginBottom: 10,
  },
  lockBadgeTxt: { fontSize: 11, fontWeight: '700', color: PINK },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK_ROSE,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },

  // 바디
  body:    { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 8 },

  featLabel: { fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 10 },
  featBox: {
    backgroundColor: LIGHT_PINK,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    marginBottom: 18,
  },
  featRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featEmoji: { fontSize: 18, width: 26 },
  featText:  { fontSize: 13, color: DARK_ROSE, flex: 1, lineHeight: 19 },

  // 플랜
  plans:   { gap: 10, marginBottom: 16 },
  planCard: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#fff',
    position: 'relative',
  },
  planCardSel: { borderColor: PINK, backgroundColor: '#fff8fa' },
  saveBadge: {
    position: 'absolute', top: -10, right: 12,
    backgroundColor: PINK, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  saveBadgeTxt: { fontSize: 9, color: '#fff', fontWeight: '700' },
  planRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSel: { borderColor: PINK },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PINK },
  planInfo: { flex: 1 },
  planName: { fontSize: 14, fontWeight: '700', color: MUTED },
  planNameSel: { color: DARK_ROSE },
  planSub:  { fontSize: 11, color: MUTED, marginTop: 1 },
  planPrice: { fontSize: 16, fontWeight: '800', color: MUTED },
  planPriceSel: { color: PINK },
  planPeriod: { fontSize: 12, fontWeight: '400' },

  noPlan: { paddingVertical: 16, alignItems: 'center' },
  noPlanText: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18 },

  // CTA
  cta: {
    backgroundColor: PINK,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaDisabled: { opacity: 0.5, shadowOpacity: 0 },
  ctaTxt:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  legal:   { fontSize: 10, color: '#c4a0ae', textAlign: 'center', lineHeight: 15, marginBottom: 10 },
  later:   { alignItems: 'center', paddingVertical: 12 },
  laterTxt: { fontSize: 13, color: MUTED },
})
