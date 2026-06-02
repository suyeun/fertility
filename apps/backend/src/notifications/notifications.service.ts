import { Injectable, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'

// Expo Push Token 여부 판별
const isExpoPushToken = (token: string) => token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')

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
  // 시술 일정 D-1 원격 알림
  // ──────────────────────────────────────────
  async scheduleAppointmentNotification(uid: string, schedule: any): Promise<void> {
    const scheduledAt = new Date(schedule.scheduledAt)
    const dayBefore = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
    dayBefore.setHours(9, 0, 0, 0)

    if (dayBefore <= new Date()) return

    const delayMs = dayBefore.getTime() - Date.now()
    this.logger.log(`D-1 알림 예약: ${schedule.title} / ${Math.round(delayMs / 3600000)}시간 후`)

    // setTimeout으로 지연 발송 (소규모 운영용)
    // 운영 환경에서는 Cloud Tasks / BullMQ 등 큐 시스템 권장
    setTimeout(async () => {
      try {
        await this.sendToUser(uid, {
          title: `내일 ${schedule.title} 일정이 있어요 🌸`,
          body: `${scheduledAt.getMonth() + 1}월 ${scheduledAt.getDate()}일 ${scheduledAt.getHours()}시 예정${schedule.hospitalName ? ` · ${schedule.hospitalName}` : ''}`,
          data: { type: 'appointment', scheduleId: schedule.id },
        })
      } catch (e) {
        this.logger.warn(`D-1 지연 발송 실패: ${e}`)
      }
    }, delayMs)
  }

  // ──────────────────────────────────────────
  // 약물 복용 원격 알림 (서버 발송 — 로컬 알림과 병행)
  // ──────────────────────────────────────────
  async sendMedicationReminder(uid: string, medicationName: string, time: string): Promise<void> {
    await this.sendToUser(uid, {
      title: '💊 약 복용 알림',
      body: `${time} — ${medicationName} 복용 시간이에요`,
      data: { type: 'medication' },
    })
  }

  // ──────────────────────────────────────────
  // 일일 BBT 기록 독려 (Cloud Scheduler 트리거용)
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
