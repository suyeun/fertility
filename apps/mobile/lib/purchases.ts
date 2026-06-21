// apps/mobile/lib/purchases.ts
// RevenueCat 인앱결제 래퍼
// 실제 배포 전 App Store Connect / Google Play Console에서
// 제품 ID(bom_monthly, bom_annual)를 동일하게 등록해야 합니다.

import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
} from 'react-native-purchases'
import { Platform } from 'react-native'

// RevenueCat 대시보드에서 발급한 API 키
// https://app.revenuecat.com → 프로젝트 → API Keys
const RC_API_KEY_IOS     = process.env.EXPO_PUBLIC_RC_API_KEY_IOS     ?? ''
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? ''

// App Store Connect / Google Play에 등록한 제품 ID
export const PRODUCT_IDS = {
  MONTHLY: 'bom_monthly',  // 월간 구독
  ANNUAL:  'bom_annual',   // 연간 구독
} as const

// RevenueCat Entitlement ID (대시보드에서 설정한 이름)
export const ENTITLEMENT_ID = 'bom_premium'

let _initialized = false

// ──────────────────────────────────────────
// 초기화 (앱 시작 시 1회)
// ──────────────────────────────────────────
export async function initPurchases(userId?: string): Promise<void> {
  if (_initialized) return

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID
  if (!apiKey) {
    return
  }

  Purchases.setLogLevel(LOG_LEVEL.WARN)
  await Purchases.configure({ apiKey })

  if (userId) {
    await Purchases.logIn(userId)
  }

  _initialized = true
}

// ──────────────────────────────────────────
// 로그인 사용자 연동 (JWT 로그인 후 호출)
// ──────────────────────────────────────────
export async function identifyUser(userId: string): Promise<void> {
  if (!_initialized) return
  await Purchases.logIn(userId)
}

// ──────────────────────────────────────────
// 현재 구독 상태 조회
// ──────────────────────────────────────────
export async function getSubscriptionStatus(): Promise<{
  isActive: boolean
  productId: string | null
  expiresAt: string | null
}> {
  if (!_initialized) return { isActive: false, productId: null, expiresAt: null }

  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo()
    const entitlement = info.entitlements.active[ENTITLEMENT_ID]

    if (entitlement) {
      return {
        isActive: true,
        productId: entitlement.productIdentifier,
        expiresAt: entitlement.expirationDate,
      }
    }
    return { isActive: false, productId: null, expiresAt: null }
  } catch {
    return { isActive: false, productId: null, expiresAt: null }
  }
}

// ──────────────────────────────────────────
// 구매 가능한 패키지 목록 조회
// ──────────────────────────────────────────
export async function getOfferings(): Promise<PurchasesPackage[]> {
  if (!_initialized) return []

  try {
    const offerings = await Purchases.getOfferings()
    return offerings.current?.availablePackages ?? []
  } catch (e) {
    return []
  }
}

// ──────────────────────────────────────────
// 구매 실행
// ──────────────────────────────────────────
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean
  error?: string
}> {
  if (!_initialized) return { success: false, error: '결제 모듈이 초기화되지 않았어요.' }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    const isActive = !!customerInfo.entitlements.active[ENTITLEMENT_ID]
    return { success: isActive }
  } catch (e: any) {
    if (e.userCancelled) return { success: false, error: 'cancelled' }
    return { success: false, error: e.message ?? '결제 중 오류가 발생했어요.' }
  }
}

// ──────────────────────────────────────────
// 구매 복원
// ──────────────────────────────────────────
export async function restorePurchases(): Promise<boolean> {
  if (!_initialized) return false

  try {
    const info = await Purchases.restorePurchases()
    return !!info.entitlements.active[ENTITLEMENT_ID]
  } catch {
    return false
  }
}

// ──────────────────────────────────────────
// 구독 상태 변경 리스너
// ──────────────────────────────────────────
export function addCustomerInfoListener(
  callback: (info: CustomerInfo) => void,
): () => void {
  if (!_initialized) return () => {}
  Purchases.addCustomerInfoUpdateListener(callback)
  return () => Purchases.removeCustomerInfoUpdateListener(callback)
}
