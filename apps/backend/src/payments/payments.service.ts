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

/// RevenueCat cancel_reason / expiration_reason → 한글 라벨과 환불 여부.
/// https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
export function describeCancelReason(reason: string | undefined | null): { label: string; isRefund: boolean } {
  switch (reason) {
    case 'CUSTOMER_SUPPORT':
      return { label: '고객 지원 환불', isRefund: true }          // 스토어(Apple/Google)가 환불 처리
    case 'UNSUBSCRIBE':
      return { label: '사용자 해지', isRefund: false }             // 만료일까지 이용 후 종료
    case 'BILLING_ERROR':
      return { label: '결제 실패', isRefund: false }
    case 'DEVELOPER_INITIATED':
      return { label: '개발사 취소', isRefund: false }
    case 'PRICE_INCREASE':
      return { label: '가격 인상 미동의', isRefund: false }
    case 'SUBSCRIPTION_PAUSED':
      return { label: '일시정지', isRefund: false }
    case 'UNKNOWN':
    case undefined:
    case null:
      return { label: '사유 미상', isRefund: false }
    default:
      return { label: reason, isRefund: false }
  }
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

      case 'CANCELLATION': {
        // 취소해도 만료 전까지는 이용 가능 → cancelled 상태로 표시.
        // 환불(CUSTOMER_SUPPORT)은 만료 시각이 환불 시점으로 내려와 즉시 잠긴다.
        const reason = describeCancelReason(event.cancel_reason)
        this.logger.log(`구독 취소 사유: ${reason.label} (${event.cancel_reason ?? 'unknown'}) / 유저: ${appUserId} / 환불: ${reason.isRefund}`)
        await this.setSubscription(appUserId, 'cancelled', subscriptionExpiresAt, productId, {
          cancelReason: event.cancel_reason ?? null,
          isRefund: reason.isRefund,
        })
        break
      }

      case 'EXPIRATION': {
        const reason = describeCancelReason(event.expiration_reason)
        this.logger.log(`구독 만료 사유: ${reason.label} (${event.expiration_reason ?? 'unknown'}) / 유저: ${appUserId}`)
        await this.setSubscription(appUserId, 'cancelled', null, productId, {
          cancelReason: event.expiration_reason ?? null,
          isRefund: reason.isRefund,
        })
        break
      }

      case 'BILLING_ISSUE':
        this.logger.warn(`결제 실패 (BILLING_ISSUE) / 유저: ${appUserId} / 상품: ${productId}`)
        await this.setSubscription(appUserId, 'cancelled', null, productId, {
          cancelReason: 'BILLING_ERROR',
          isRefund: false,
        })
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
    cancel?: { cancelReason: string | null; isRefund: boolean },
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
          // 취소·만료 사유 — 환불 분쟁·이탈 분석용. 활성화 시에는 지운다.
          ...(cancel
            ? {
                subscriptionCancelReason: cancel.cancelReason,
                subscriptionRefunded: cancel.isRefund,
                subscriptionCancelledAt: new Date().toISOString(),
              }
            : status === 'active'
              ? { subscriptionCancelReason: null, subscriptionRefunded: false }
              : {}),
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
