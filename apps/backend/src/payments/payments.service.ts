import { Injectable, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'

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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(private firebase: FirebaseService) {}

  async handleRevenueCatEvent(payload: any): Promise<{ received: boolean }> {
    const event = payload?.event
    if (!event) return { received: false }

    const eventType: RCEventType = event.type
    const appUserId: string = event.app_user_id  // RevenueCat logIn()에 넘긴 uid
    const expiresAt: string | null = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null
    const productId: string = event.product_id ?? ''

    this.logger.log(`이벤트: ${eventType} / 유저: ${appUserId} / 상품: ${productId}`)

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        await this.setSubscription(appUserId, 'active', expiresAt, productId)
        break

      case 'CANCELLATION':
        // 취소해도 만료 전까지는 이용 가능 → cancelled 상태로 표시
        await this.setSubscription(appUserId, 'cancelled', expiresAt, productId)
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
    expiresAt: string | null,
    productId: string,
  ): Promise<void> {
    const userRef = this.firebase.collection('users').doc(uid)
    const doc = await userRef.get()
    if (!doc.exists) {
      this.logger.warn(`구독 업데이트 실패: 유저 없음 (${uid})`)
      return
    }

    await userRef.update({
      subscriptionStatus: status,
      ...(expiresAt ? { trialEndsAt: expiresAt } : {}),
      subscriptionProductId: productId,
      subscriptionUpdatedAt: new Date().toISOString(),
    })

    this.logger.log(`구독 상태 업데이트: ${uid} → ${status}`)
  }
}
