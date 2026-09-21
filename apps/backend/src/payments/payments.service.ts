import { Injectable, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { ApiTags } from '@nestjs/swagger'

// RevenueCat 이벤트 타입
// https://www.revenuecat.com/docs/webhooks
type RCEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'TEST'
  | 'TRANSFER'

/// 운영 서버가 샌드박스(테스트 결제) 이벤트를 무시해야 하는지.
/// 테스트 구매가 실제 사용자 문서를 active 로 바꾸는 사고를 막는다.
/// 운영에서 샌드박스 검증이 필요하면 REVENUECAT_ALLOW_SANDBOX=true 로 일시 허용한다.
export function shouldIgnoreSandboxEvent(
  environment: string | undefined,
  nodeEnv: string | undefined,
  allowSandbox: string | undefined,
): boolean {
  if (environment !== 'SANDBOX') return false
  if (nodeEnv !== 'production') return false
  return allowSandbox !== 'true'
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(private firebase: FirebaseService) {}

  async handleRevenueCatEvent(payload: any): Promise<{ received: boolean; ignored?: string }> {
    const event = payload?.event
    if (!event) return { received: false }

    const eventType: RCEventType = event.type
    const environment: string | undefined = event.environment // 'SANDBOX' | 'PRODUCTION'

    // 대시보드 "테스트 전송" — URL·시크릿 확인용. 사용자 데이터는 건드리지 않는다.
    if (eventType === 'TEST') {
      this.logger.log('RevenueCat TEST 이벤트 수신 — 웹훅 연결 정상')
      return { received: true, ignored: 'test' }
    }

    if (shouldIgnoreSandboxEvent(environment, process.env.NODE_ENV, process.env.REVENUECAT_ALLOW_SANDBOX)) {
      this.logger.warn(`샌드박스 이벤트 무시 (운영): ${eventType} / 유저: ${event.app_user_id}`)
      return { received: true, ignored: 'sandbox' }
    }

    const appUserId: string = event.app_user_id  // RevenueCat logIn()에 넘긴 uid
    if (!appUserId) {
      this.logger.warn(`app_user_id 없는 이벤트: ${eventType}`)
      return { received: true, ignored: 'no_user' }
    }
    // [BIZ-002] expiresAt을 subscriptionExpiresAt으로 명확하게 분리
    const subscriptionExpiresAt: string | null = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null
    const productId: string = event.product_id ?? ''

    this.logger.log(`이벤트: ${eventType} / 유저: ${appUserId} / 상품: ${productId} / 환경: ${environment ?? 'unknown'}`)

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        await this.setSubscription(appUserId, 'active', subscriptionExpiresAt, productId)
        break

      case 'CANCELLATION':
        // 취소해도 만료 전까지는 이용 가능 → cancelled 상태로 표시
        await this.setSubscription(appUserId, 'cancelled', subscriptionExpiresAt, productId)
        break

      case 'EXPIRATION':
      case 'BILLING_ISSUE':
        await this.setSubscription(appUserId, 'cancelled', null, productId)
        break

      default:
        this.logger.log(`처리하지 않는 이벤트 타입: ${eventType}`)
    }

    return { received: true }
  }

  private async setSubscription(
    uid: string,
    status: 'active' | 'trial' | 'cancelled',
    subscriptionExpiresAt: string | null,
    productId: string,
  ): Promise<void> {
    try {
      const userRef = this.firebase.collection('users').doc(uid)

      // [PERF-004] set({ merge: true })으로 원자적 처리 — get() 후 update() 패턴의 race condition 제거
      // [BIZ-002] trialEndsAt → subscriptionExpiresAt (구독 만료와 트라이얼 만료 필드 분리)
      await userRef.set(
        {
          subscriptionStatus: status,
          ...(subscriptionExpiresAt ? { subscriptionExpiresAt } : {}),
          subscriptionProductId: productId,
          subscriptionUpdatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      this.logger.log(`구독 상태 업데이트: ${uid} → ${status}`)
    } catch (err) {
      this.logger.error(`구독 업데이트 실패 (${uid}):`, err)
      throw err
    }
  }
}
