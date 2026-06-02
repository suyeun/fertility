// apps/mobile/app/subscription/index.tsx
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native'
import { router } from 'expo-router'
import type { PurchasesPackage } from 'react-native-purchases'
import {
  getOfferings,
  getSubscriptionStatus,
  purchasePackage,
  restorePurchases,
  PRODUCT_IDS,
} from '../../lib/purchases'

const PINK = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED = '#b07080'
const BORDER = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'
const PURPLE = '#7c3aed'

const FEATURES = [
  { emoji: '🤖', text: 'AI 채팅 무제한 — 수치·주기·시술 Q&A' },
  { emoji: '🌡️', text: '호르몬 수치 트렌드 분석 리포트' },
  { emoji: '💊', text: '약물 복용 알림 + 시술 일정 관리' },
  { emoji: '📊', text: '사이클 패턴 심층 분석' },
  { emoji: '🌸', text: '감정 일기 AI 분석 — 매일 응원 메시지' },
]

export default function SubscriptionScreen() {
  const [packages, setPackages] = useState<PurchasesPackage[]>([])
  const [selected, setSelected] = useState<PurchasesPackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<{ isActive: boolean; expiresAt: string | null }>({ isActive: false, expiresAt: null })

  useEffect(() => {
    const init = async () => {
      const [pkgs, status] = await Promise.all([
        getOfferings(),
        getSubscriptionStatus(),
      ])
      setPackages(pkgs)
      setCurrentStatus(status)

      // 연간 구독을 기본 선택 (있으면)
      const annual = pkgs.find(p => p.product.identifier === PRODUCT_IDS.ANNUAL)
      setSelected(annual ?? pkgs[0] ?? null)
      setLoading(false)
    }
    init()
  }, [])

  const handlePurchase = async () => {
    if (!selected) return
    setPurchasing(true)
    try {
      const result = await purchasePackage(selected)
      if (result.success) {
        Alert.alert(
          '구독 완료 🌸',
          'BOM 프리미엄이 활성화됐어요!\n모든 기능을 자유롭게 이용하세요.',
          [{ text: '시작하기', onPress: () => router.replace('/') }],
        )
      } else if (result.error !== 'cancelled') {
        Alert.alert('결제 오류', result.error ?? '잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setPurchasing(false)
    }
  }

  const handleRestore = async () => {
    setRestoring(true)
    try {
      const restored = await restorePurchases()
      if (restored) {
        Alert.alert('복원 완료', '기존 구독이 복원됐어요 🌸', [
          { text: '확인', onPress: () => router.replace('/') },
        ])
      } else {
        Alert.alert('복원 내역 없음', '이 계정으로 구매한 구독 내역이 없어요.')
      }
    } finally {
      setRestoring(false)
    }
  }

  const formatPrice = (pkg: PurchasesPackage) =>
    pkg.product.priceString

  const isAnnual = (pkg: PurchasesPackage) =>
    pkg.product.identifier === PRODUCT_IDS.ANNUAL

  const monthlyPriceFromAnnual = (pkg: PurchasesPackage): string => {
    const monthly = pkg.product.price / 12
    return `월 ${Math.round(monthly).toLocaleString()}원`
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={PINK} size="large" style={{ marginTop: 60 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 닫기 */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* 헤더 */}
        <Text style={styles.logo}>🌸</Text>
        <Text style={styles.title}>BOM 프리미엄</Text>
        <Text style={styles.subtitle}>임신 준비의 모든 것을 함께해요</Text>

        {/* 현재 구독 중 배지 */}
        {currentStatus.isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>
              ✅ 현재 구독 중 {currentStatus.expiresAt ? `· ${new Date(currentStatus.expiresAt).toLocaleDateString('ko-KR')} 만료` : ''}
            </Text>
          </View>
        )}

        {/* 기능 목록 */}
        <View style={styles.featureBox}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* 구독 플랜 선택 */}
        {packages.length === 0 ? (
          <View style={styles.noPackage}>
            <Text style={styles.noPackageText}>
              현재 구독 플랜을 불러올 수 없어요.{'\n'}잠시 후 다시 시도해 주세요.
            </Text>
          </View>
        ) : (
          <View style={styles.plans}>
            {packages.map(pkg => {
              const isSelected = selected?.product.identifier === pkg.product.identifier
              const annual = isAnnual(pkg)
              return (
                <TouchableOpacity
                  key={pkg.product.identifier}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                  onPress={() => setSelected(pkg)}
                  activeOpacity={0.8}
                >
                  {annual && (
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>🔥 최대 40% 할인</Text>
                    </View>
                  )}
                  <View style={styles.planRow}>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                        {annual ? '연간 구독' : '월간 구독'}
                      </Text>
                      {annual && (
                        <Text style={styles.planMonthly}>{monthlyPriceFromAnnual(pkg)} 환산</Text>
                      )}
                    </View>
                    <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                      {formatPrice(pkg)}
                      <Text style={styles.planPeriod}>{annual ? '/년' : '/월'}</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* 구매 버튼 */}
        <TouchableOpacity
          style={[styles.purchaseBtn, (!selected || purchasing || currentStatus.isActive) && styles.purchaseBtnDisabled]}
          onPress={handlePurchase}
          disabled={!selected || purchasing || currentStatus.isActive}
          activeOpacity={0.85}
        >
          {purchasing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.purchaseBtnText}>
                {currentStatus.isActive ? '구독 중' : '구독 시작하기'}
              </Text>
          }
        </TouchableOpacity>

        {/* 복원 + 안내 */}
        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
          {restoring
            ? <ActivityIndicator color={MUTED} size="small" />
            : <Text style={styles.restoreText}>기존 구매 복원</Text>
          }
        </TouchableOpacity>

        <Text style={styles.legal}>
          구독은 자동 갱신되며 갱신 전 24시간 이내에 요금이 청구됩니다.{'\n'}
          언제든지 App Store / Play Store 설정에서 해지할 수 있습니다.{'\n'}
          구매 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fffbfc' },
  content: { padding: 24, paddingBottom: 40 },

  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  closeText: { fontSize: 18, color: MUTED },

  logo: { fontSize: 52, textAlign: 'center', marginTop: 8 },
  title: { fontSize: 24, fontWeight: '800', color: DARK_ROSE, textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 6, marginBottom: 20 },

  activeBadge: {
    backgroundColor: '#d1fae5', borderRadius: 20, paddingVertical: 8,
    paddingHorizontal: 16, alignSelf: 'center', marginBottom: 16,
  },
  activeBadgeText: { fontSize: 13, color: '#065f46', fontWeight: '600' },

  featureBox: {
    backgroundColor: LIGHT_PINK, borderRadius: 20, padding: 18,
    marginBottom: 24, gap: 12,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureEmoji: { fontSize: 20, width: 28 },
  featureText: { fontSize: 13, color: DARK_ROSE, flex: 1, lineHeight: 19 },

  plans: { gap: 12, marginBottom: 20 },
  planCard: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 18,
    padding: 16, backgroundColor: '#fff', position: 'relative',
  },
  planCardSelected: { borderColor: PINK, backgroundColor: '#fff8fa' },

  saveBadge: {
    position: 'absolute', top: -10, right: 14,
    backgroundColor: PINK, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  saveBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: BORDER, alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: PINK },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PINK },

  planInfo: { flex: 1 },
  planName: { fontSize: 15, fontWeight: '700', color: MUTED },
  planNameSelected: { color: DARK_ROSE },
  planMonthly: { fontSize: 11, color: MUTED, marginTop: 2 },

  planPrice: { fontSize: 17, fontWeight: '800', color: MUTED },
  planPriceSelected: { color: PINK },
  planPeriod: { fontSize: 12, fontWeight: '400' },

  noPackage: { padding: 24, alignItems: 'center' },
  noPackageText: { color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  purchaseBtn: {
    backgroundColor: PINK, borderRadius: 18, paddingVertical: 17,
    alignItems: 'center', marginBottom: 14,
    shadowColor: PINK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  purchaseBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  purchaseBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  restoreBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 20 },
  restoreText: { color: MUTED, fontSize: 13 },

  legal: {
    fontSize: 10, color: '#c4a0ae', textAlign: 'center', lineHeight: 16,
  },
})
