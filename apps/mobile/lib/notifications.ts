// apps/mobile/lib/notifications.ts
// 알림 2트랙:
//  1) 로컬 알림  — expo-notifications 스케줄 (약물·D-1·BBT 독려)
//  2) 원격 푸시  — Expo Push Token → 백엔드 등록 → 백엔드가 발송

import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { notificationsApi } from '@fertility/shared'
import type { TreatmentSchedule } from '@fertility/shared'

// 포그라운드에서도 알림 배너·사운드 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAnnouncement: true,
  }),
})

// ============================================================
// 권한 요청 + Expo Push Token 발급
// ============================================================

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function registerPushToken(): Promise<void> {
  try {
    const granted = await requestNotificationPermissions()
    if (!granted) return

    const tokenData = await Notifications.getExpoPushTokenAsync()
    const expoPushToken = tokenData.data

    const platform = Platform.OS === 'ios' ? 'ios' : 'android'
    await notificationsApi.registerToken(expoPushToken, platform)
  } catch (e) {
    console.warn('[알림] Expo Push Token 등록 실패:', e)
  }
}

// ============================================================
// 로컬 알림 — 약물 복용 알림
// ============================================================

const MED_CHANNEL_ID = 'bom_medication'
const APPOINTMENT_CHANNEL_ID = 'bom_appointment'
const DAILY_CHANNEL_ID = 'bom_daily'

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(MED_CHANNEL_ID, {
    name: '약물 복용 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  })
  await Notifications.setNotificationChannelAsync(APPOINTMENT_CHANNEL_ID, {
    name: '시술 일정 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  })
  await Notifications.setNotificationChannelAsync(DAILY_CHANNEL_ID, {
    name: '일일 기록 독려',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  })
}

// 기존 약물·시술 알림 전부 취소 후 재스케줄
export async function rescheduleMedicationAlerts(schedules: TreatmentSchedule[]): Promise<void> {
  await ensureAndroidChannels()

  // 기존 예약 알림 중 약물·시술 관련만 취소
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  for (const n of scheduled) {
    const tag: string = (n.content.data as any)?.tag ?? ''
    if (tag === 'medication' || tag === 'appointment') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier)
    }
  }

  const upcomingSchedules = schedules.filter(s => s.status === 'scheduled')

  for (const schedule of upcomingSchedules) {
    // 1) 시술 D-1 알림
    await scheduleAppointmentReminder(schedule)

    // 2) 약물 복용 알림
    if (schedule.medications && schedule.medications.length > 0) {
      for (const med of schedule.medications) {
        await scheduleMedicationReminder(med, schedule.title)
      }
    }
  }
}

async function scheduleAppointmentReminder(schedule: TreatmentSchedule): Promise<void> {
  const scheduledAt = new Date(schedule.scheduledAt)
  const dayBefore = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
  dayBefore.setHours(9, 0, 0, 0)  // D-1 오전 9시

  if (dayBefore <= new Date()) return  // 이미 지난 시간

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `내일 ${schedule.title} 일정이 있어요 🌸`,
      body: `${scheduledAt.getMonth() + 1}월 ${scheduledAt.getDate()}일 ${scheduledAt.getHours()}시 예정${schedule.hospitalName ? ` · ${schedule.hospitalName}` : ''}`,
      sound: 'default',
      data: { tag: 'appointment', scheduleId: schedule.id },
      ...(Platform.OS === 'android' && { channelId: APPOINTMENT_CHANNEL_ID }),
    },
    trigger: { date: dayBefore },
  })
}

async function scheduleMedicationReminder(
  med: { name: string; dose: string; times: string[]; startDate: string; endDate?: string },
  scheduleTitle: string,
): Promise<void> {
  const startDate = new Date(med.startDate)
  const endDate = med.endDate ? new Date(med.endDate) : null
  const now = new Date()

  for (const timeStr of med.times) {
    const [hour, minute] = timeStr.split(':').map(Number)

    // 종료일이 오늘 이후인 경우만 스케줄
    if (endDate && endDate < now) continue

    // 시작일이 오늘 이전이면 오늘부터 스케줄, 이후면 해당 날짜부터
    const triggerStart = startDate > now ? startDate : now
    const trigger = new Date(triggerStart)
    trigger.setHours(hour, minute, 0, 0)
    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1)
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 약 복용 알림',
        body: `${timeStr} — ${med.name} ${med.dose} 복용 시간이에요`,
        sound: 'default',
        data: { tag: 'medication', medName: med.name },
        ...(Platform.OS === 'android' && { channelId: MED_CHANNEL_ID }),
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    })
  }
}

// ============================================================
// 로컬 알림 — 매일 BBT 기록 독려 (오전 7시)
// ============================================================

const DAILY_REMINDER_ID = 'bom_daily_bbt'

export async function scheduleDailyBBTReminder(): Promise<void> {
  await ensureAndroidChannels()

  // 이미 등록된 경우 중복 방지
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const alreadySet = scheduled.some(n => n.identifier === DAILY_REMINDER_ID)
  if (alreadySet) return

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: '🌡️ 오늘 기초체온 기록했나요?',
      body: '매일 기록이 정확한 배란일 예측에 도움이 돼요 💕',
      sound: 'default',
      data: { tag: 'daily_bbt' },
      ...(Platform.OS === 'android' && { channelId: DAILY_CHANNEL_ID }),
    },
    trigger: {
      hour: 7,
      minute: 0,
      repeats: true,
    },
  })
}

export async function cancelDailyBBTReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID)
}

// ============================================================
// 알림 전체 초기화 (앱 시작 시 호출)
// ============================================================

export async function initNotifications(schedules: TreatmentSchedule[]): Promise<void> {
  const granted = await requestNotificationPermissions()
  if (!granted) return

  await Promise.all([
    registerPushToken(),
    scheduleDailyBBTReminder(),
    rescheduleMedicationAlerts(schedules),
  ])
}

// ============================================================
// 포그라운드 알림 리스너 등록 (앱 루트에서 호출)
// ============================================================

export function addNotificationListeners() {
  // 포그라운드 알림 수신
  const receivedSub = Notifications.addNotificationReceivedListener(notification => {
    console.log('[알림 수신]', notification.request.content.title)
  })

  // 알림 탭 → 화면 이동 처리
  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any
    // 필요 시 router.push로 화면 이동 처리 가능
    console.log('[알림 탭]', data?.tag)
  })

  return () => {
    receivedSub.remove()
    responseSub.remove()
  }
}
