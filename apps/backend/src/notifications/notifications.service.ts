import { Injectable, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'

// Expo Push Token 여부 판별
const isExpoPushToken = (token: string) => token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')

// ──────────────────────────────────────────
// 구독 상태 확인 (백엔드 재검증)
// RevenueCat 웹훅이 Firestore를 업데이트하는 단일 소스 구조.
// 클라이언트가 보낸 값을 신뢰하지 않고 Firestore에서 직접 읽어 검증.
// ──────────────────────────────────────────
async function checkPremiumFromFirestore(
  firebase: FirebaseService,
  uid: string,
): Promise<boolean> {
  const doc = await firebase.collection('users').doc(uid).get()
  if (!doc.exists) return false
  const data = doc.data() as any
  const status: string = data?.subscriptionStatus ?? 'cancelled'

  if (status === 'active') return true
  if (status === 'trial') {
    const trialEndsAt: string | undefined = data?.trialEndsAt
    if (!trialEndsAt) return true
    return new Date(trialEndsAt) > new Date()
  }
  // 'cancelled' — subscriptionExpiresAt이 미래이면 만료 전 유효 기간
  if (status === 'cancelled') {
    const expiresAt: string | undefined = data?.subscriptionExpiresAt
    if (expiresAt) return new Date(expiresAt) > new Date()
  }
  return false
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private firebase: FirebaseService) {}

  // ──────────────────────────────────────────
  // 토큰 등록 (Expo Push Token 또는 FCM 토큰 모두 지원)
  // ──────────────────────────────────────────
  async registerToken(uid: string, token: string, platform: 'ios' | 'android') {
    const tokenType = isExpoPushToken(token) ? 'expo' : 'fcm'
    await this.firebase.collection('push_tokens').doc(uid).set({
      uid, token, platform, tokenType,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    this.logger.log(`푸시 토큰 등록: ${uid} / ${tokenType} / ${platform}`)
    return { success: true }
  }

  // ──────────────────────────────────────────
  // 단일 사용자에게 푸시 발송 (Expo 또는 FCM 자동 선택)
  // ──────────────────────────────────────────
  private async sendToUser(uid: string, payload: {
    title: string
    body: string
    data?: Record<string, string>
  }): Promise<void> {
    const doc = await this.firebase.collection('push_tokens').doc(uid).get()
    if (!doc.exists) return

    const { token, tokenType } = doc.data() as any

    if (tokenType === 'expo') {
      await this.sendViaExpo(token, payload)
    } else {
      await this.sendViaFCM(token, payload)
    }
  }

  // Expo Push API 발송
  private async sendViaExpo(expoPushToken: string, payload: {
    title: string; body: string; data?: Record<string, string>
  }): Promise<void> {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(message),
    })
    const result = await res.json()
    if (result?.data?.status === 'error') {
      this.logger.warn(`Expo 푸시 발송 오류: ${JSON.stringify(result.data)}`)
    } else {
      this.logger.log(`Expo 푸시 발송 완료: ${expoPushToken.slice(0, 30)}...`)
    }
  }

  // Firebase Admin (FCM) 직접 발송
  private async sendViaFCM(fcmToken: string, payload: {
    title: string; body: string; data?: Record<string, string>
  }): Promise<void> {
    await this.firebase.messaging.send({
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      apns: { payload: { aps: { sound: 'default' } } },
      android: { notification: { sound: 'default' } },
    })
    this.logger.log(`FCM 직접 발송 완료`)
  }

  // ──────────────────────────────────────────
  // 시술 일정 D-1 알림 예약 — Firestore 큐에 저장
  // 서버 재시작과 무관하게 유지된다.
  // ──────────────────────────────────────────
  async scheduleAppointmentNotification(uid: string, schedule: any): Promise<void> {
    const scheduledAt = new Date(schedule.scheduledAt)
    const sendAt = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
    sendAt.setHours(9, 0, 0, 0)

    if (sendAt <= new Date()) return

    const month = scheduledAt.getMonth() + 1
    const day = scheduledAt.getDate()
    const hour = scheduledAt.getHours()
    const hospitalSuffix = schedule.hospitalName ? ` · ${schedule.hospitalName}` : ''

    // scheduleId 기반 고정 doc ID — 같은 일정 재등록 시 덮어써서 중복 큐 방지
    const docId = `appointment_${schedule.id}`
    await this.firebase.collection('scheduled_notifications').doc(docId).set({
      uid,
      type: 'appointment',
      sendAt: sendAt.toISOString(),
      sent: false,
      processing: false,
      payload: {
        title: `내일 ${schedule.title} 일정이 있어요 🌸`,
        body: `${month}월 ${day}일 ${hour}시 예정${hospitalSuffix}`,
        data: { type: 'appointment', scheduleId: schedule.id },
      },
      createdAt: new Date().toISOString(),
    })

    this.logger.log(`D-1 알림 큐 등록: ${schedule.title} / 발송 예정 ${sendAt.toISOString()}`)
  }

  // ──────────────────────────────────────────
  // 예약 알림 처리 — Cloud Scheduler에서 주기적으로 호출
  // sendAt이 지났고 아직 발송 안 된 문서를 처리한다.
  // ──────────────────────────────────────────
  async processScheduledNotifications(): Promise<{ processed: number }> {
    const now = new Date().toISOString()
    const snap = await this.firebase
      .collection('scheduled_notifications')
      .where('sent', '==', false)
      .where('processing', '==', false)
      .where('sendAt', '<=', now)
      .get()

    if (snap.empty) return { processed: 0 }

    // 트랜잭션으로 processing=true 선점 — 동시 폴러가 같은 문서를 중복 처리하는 것을 방지
    const claimed: FirebaseFirestore.DocumentSnapshot[] = []
    await Promise.all(
      snap.docs.map(async (doc) => {
        try {
          await this.firebase.db.runTransaction(async (tx) => {
            const fresh = await tx.get(doc.ref)
            if (fresh.data()?.processing || fresh.data()?.sent) return
            tx.update(doc.ref, { processing: true })
          })
          claimed.push(doc)
        } catch {
          // 다른 인스턴스가 먼저 선점한 경우 — 건너뜀
        }
      })
    )

    const results = await Promise.allSettled(
      claimed.map(async (doc) => {
        const { uid, payload } = doc.data()
        await this.sendToUser(uid, payload)
        await doc.ref.update({ sent: true, processing: false, sentAt: new Date().toISOString() })
      })
    )

    // 발송 실패한 문서는 processing을 되돌려 다음 사이클에 재시도
    await Promise.all(
      results.map(async (result, i) => {
        if (result.status === 'rejected') {
          await claimed[i].ref.update({ processing: false })
          this.logger.warn(`예약 알림 발송 실패: ${claimed[i].id} / ${result.reason}`)
        }
      })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    this.logger.log(`예약 알림 처리 완료: ${succeeded}/${claimed.length}건`)

    return { processed: succeeded }
  }

  // ──────────────────────────────────────────
  // 약물 복용 원격 알림 — 프리미엄 전용
  // 발송 직전 Firestore에서 구독 상태를 재검증한다.
  // 클라이언트 값을 신뢰하지 않으며, RevenueCat이 Firestore를 업데이트하는 단일 소스 구조.
  //
  // [데이터 보존 정책]
  // 이 함수는 알림 발송(기능)만 게이트하며,
  // 약물 기록 데이터 자체에 대한 읽기/쓰기는 절대 차단하지 않는다.
  // ──────────────────────────────────────────
  async sendMedicationReminder(uid: string, medicationName: string, time: string): Promise<void> {
    const isPremium = await checkPremiumFromFirestore(this.firebase, uid)

    if (!isPremium) {
      this.logger.warn(`약물 알림 발송 거부 — 비프리미엄 사용자: ${uid}`)
      return
    }

    await this.sendToUser(uid, {
      title: '💊 약 복용 알림',
      body: `${time} — ${medicationName} 복용 시간이에요`,
      data: { type: 'medication' },
    })
  }

  // ──────────────────────────────────────────
  // 일일 BBT 기록 독려 (Cloud Scheduler 트리거용)
  // 구독 게이트 없음 — 기록 독려는 무료 제공.
  // ──────────────────────────────────────────
  async sendDailyReminder(uid: string): Promise<void> {
    await this.sendToUser(uid, {
      title: '🌡️ 오늘 기초체온 기록했나요?',
      body: '매일 기록이 정확한 배란일 예측에 도움이 돼요 💕',
      data: { type: 'daily_bbt' },
    })
  }

  async sendAllDailyReminders(): Promise<{ sent: number }> {
    const snap = await this.firebase.collection('push_tokens').get()
    const results = await Promise.allSettled(
      snap.docs.map(doc => this.sendDailyReminder(doc.data().uid))
    )
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) this.logger.warn(`일일 알림 발송 실패: ${failed}건`)
    return { sent: snap.docs.length - failed }
  }
}
