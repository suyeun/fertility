import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { NotificationsService } from '../notifications/notifications.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class TreatmentService {
  constructor(
    private firebase: FirebaseService,
    private notifications: NotificationsService,
  ) {}

  async getAll(uid: string) {
    const snap = await this.firebase.collection('treatment_schedules')
      .where('userId', '==', uid)
      .orderBy('scheduledAt', 'desc')
      .get()
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  async save(uid: string, data: any) {
    const id = data.id || uuidv4()
    const record = { ...data, id, userId: uid }
    await this.firebase.collection('treatment_schedules').doc(id).set(record, { merge: true })

    // 새 일정이면 FCM 알림 스케줄 등록
    if (!data.id && record.status === 'scheduled') {
      await this.notifications.scheduleAppointmentNotification(uid, record)
    }

    return record
  }

  async updateStatus(uid: string, id: string, status: string) {
    await this.firebase.collection('treatment_schedules').doc(id).update({ status })
    return { id, status }
  }

  async delete(uid: string, id: string) {
    await this.firebase.collection('treatment_schedules').doc(id).delete()
  }
}
