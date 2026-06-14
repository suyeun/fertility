import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { NotificationsService } from '../notifications/notifications.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class TreatmentService {
  private readonly logger = new Logger(TreatmentService.name)

  constructor(
    private firebase: FirebaseService,
    private notifications: NotificationsService,
  ) {}

  async getAll(uid: string) {
    try {
      const snap = await this.firebase.collection('treatment_schedules')
        .where('userId', '==', uid)
        .orderBy('scheduledAt', 'desc')
        .limit(100)
        .get()
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (err) {
      this.logger.error('treatment getAll 오류:', err)
      throw new InternalServerErrorException('시술 일정 목록을 불러오는 중 오류가 발생했습니다')
    }
  }

  async save(uid: string, data: any) {
    try {
      const id = data.id || uuidv4()
      const record = { ...data, id, userId: uid }
      await this.firebase.collection('treatment_schedules').doc(id).set(record, { merge: true })

      // 새 일정 생성(id 없음) + scheduled 상태일 때만 알림 발송
      if (!data.id && record.status === 'scheduled') {
        // 알림 실패가 시술 저장을 실패시키지 않도록 독립 실행
        this.notifications.scheduleAppointmentNotification(uid, record).catch(err => {
          this.logger.error('알림 발송 실패 (시술 저장은 완료됨):', err)
        })
      }

      return record
    } catch (err) {
      this.logger.error('treatment save 오류:', err)
      throw new InternalServerErrorException('시술 일정을 저장하는 중 오류가 발생했습니다')
    }
  }

  async updateStatus(uid: string, id: string, status: string) {
    try {
      const docRef = this.firebase.collection('treatment_schedules').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) throw new NotFoundException('시술 일정을 찾을 수 없습니다')
      if (doc.data()?.userId !== uid) throw new ForbiddenException('수정 권한이 없습니다')

      await docRef.update({ status })
      return { id, status }
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err
      this.logger.error('treatment updateStatus 오류:', err)
      throw new InternalServerErrorException('시술 상태를 변경하는 중 오류가 발생했습니다')
    }
  }

  async delete(uid: string, id: string) {
    try {
      const docRef = this.firebase.collection('treatment_schedules').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) throw new NotFoundException('시술 일정을 찾을 수 없습니다')
      if (doc.data()?.userId !== uid) throw new ForbiddenException('삭제 권한이 없습니다')

      await docRef.delete()
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err
      this.logger.error('treatment delete 오류:', err)
      throw new InternalServerErrorException('시술 일정을 삭제하는 중 오류가 발생했습니다')
    }
  }
}
