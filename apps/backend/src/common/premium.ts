import { FirebaseService } from '../firebase/firebase.service'

/// 서버 측 프리미엄 판정 — 클라이언트 값을 신뢰하지 않고 Firestore(RevenueCat 웹훅 반영값)를 읽는다.
/// 데이터 읽기/쓰기는 절대 막지 않고, 기능(알림 발송·스캔 횟수 등)만 게이트한다.
export function isPremiumUserData(data: any, now: Date = new Date()): boolean {
  const status: string = data?.subscriptionStatus ?? 'cancelled'
  if (status === 'active') return true
  if (status === 'trial') {
    const trialEndsAt: string | undefined = data?.trialEndsAt
    if (!trialEndsAt) return true
    return new Date(trialEndsAt) > now
  }
  if (status === 'cancelled') {
    const expiresAt: string | undefined = data?.subscriptionExpiresAt
    if (expiresAt) return new Date(expiresAt) > now
  }
  return false
}

export async function checkPremiumFromFirestore(firebase: FirebaseService, uid: string): Promise<boolean> {
  const doc = await firebase.collection('users').doc(uid).get()
  if (!doc.exists) return false
  return isPremiumUserData(doc.data())
}
