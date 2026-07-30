import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CouplesService } from '../couples/couples.service'
import { randomUUID } from 'node:crypto'

@Injectable()
export class TreatmentService {
  private readonly logger = new Logger(TreatmentService.name)

  constructor(
    private firebase: FirebaseService,
    private notifications: NotificationsService,
    private couples: CouplesService,
  ) {}

  async getAll(uid: string) {
    try {
      // 기본: 자신의 기록 조회
      const mySnap = await this.firebase.collection('treatment_schedules')
        .where('userId', '==', uid)
        .orderBy('scheduledAt', 'desc')
        .limit(100)
        .get()

      const myRecords = mySnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // 배우자 연결 시 커플링 기록도 함께 조회
      const partnerUid = await this.couples.getPartnerUid(uid)
      if (!partnerUid) return myRecords

      const partnerSnap = await this.firebase.collection('treatment_schedules')
        .where('userId', '==', partnerUid)
        .orderBy('scheduledAt', 'desc')
        .limit(100)
        .get()

      const partnerRecords = partnerSnap.docs.map(d => ({ id: d.id, ...d.data(), isPartnerRecord: true }))

      // 날짜 내림차순 합친 목록
      return [...myRecords, ...partnerRecords].sort(
        (a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      )
    } catch (err) {
      this.logger.error('treatment getAll 오류:', err)
      throw new InternalServerErrorException('시술 일정 목록을 불러오는 중 오류가 발생했습니다')
    }
  }

  async save(uid: string, data: any) {
    try {
      const id = data.id || randomUUID()

      // 커플링 상태 조회: coupleId 자동 주입
      const userDoc = await this.firebase.collection('users').doc(uid).get()
      const coupleId = (userDoc.data() as any)?.coupleId ?? null

      const record = {
        ...data,
        id,
        userId: uid,
        coupleId,                            // 커플링용 참조 필드
        author: uid,                         // 마지막 수정자
        updatedAt: new Date().toISOString(),
      }
      await this.firebase.collection('treatment_schedules').doc(id).set(record, { merge: true })

      // 신규 일정(id 없음) + scheduled 상태일 때 알림 발송
      if (!data.id && record.status === 'scheduled') {
        // 1. 본인 알림
        this.notifications.scheduleAppointmentNotification(uid, record).catch(err => {
          this.logger.error('알림 발송 실패 (시술 저장은 완료됨):', err)
        })

        // 2. 배우자 알림 (커플링 후 커플링 노티픽 설정 확인 없이 기본 발송)
        const partnerUid = await this.couples.getPartnerUid(uid)
        if (partnerUid) {
          const scheduledDate = new Date(record.scheduledAt)
          const dateStr = `${scheduledDate.getMonth() + 1}월 ${scheduledDate.getDate()}일`
          const authorName = (userDoc.data() as any)?.name ?? '배우자'
          this.notifications.sendPushToUser(partnerUid, {
            title: '합니다! 시술 일정이 등록되었어요 관리하는 일정들 확인하실 수 있어요 예약',
            body: `${authorName}님이 ${dateStr} 일정(${record.title || record.type})을 등록했어요.`,
          }).catch(e => this.logger.warn('배우자 일정 알림 실패:', e))
        }
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
