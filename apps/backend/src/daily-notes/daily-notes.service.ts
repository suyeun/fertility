import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { SaveDailyNoteDto } from './dto/save-daily-note.dto'

@Injectable()
export class DailyNotesService {
  private readonly logger = new Logger(DailyNotesService.name)

  constructor(private firebase: FirebaseService) {}

  private docId(uid: string, date: string) {
    return `${uid}_${date}`
  }

  async getAll(uid: string) {
    try {
      const snap = await this.firebase.collection('daily_notes')
        .where('userId', '==', uid)
        .orderBy('date', 'desc')
        .get()
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (err) {
      this.logger.error('daily-notes getAll 오류:', err)
      throw new InternalServerErrorException('메모 목록을 불러오는 중 오류가 발생했습니다')
    }
  }

  async getByDate(uid: string, date: string) {
    try {
      const doc = await this.firebase.collection('daily_notes').doc(this.docId(uid, date)).get()
      if (!doc.exists) return null
      return { id: doc.id, ...doc.data() }
    } catch (err) {
      this.logger.error('daily-notes getByDate 오류:', err)
      throw new InternalServerErrorException('메모를 불러오는 중 오류가 발생했습니다')
    }
  }

  async save(uid: string, date: string, dto: SaveDailyNoteDto) {
    try {
      const id = this.docId(uid, date)
      const docRef = this.firebase.collection('daily_notes').doc(id)
      const existing = await docRef.get()

      const record = {
        ...(existing.exists ? existing.data() : {}),
        ...dto,
        id,
        userId: uid,
        date,
        migratedFromDiary: existing.exists ? (existing.data() as any)?.migratedFromDiary ?? false : false,
        createdAt: existing.exists ? (existing.data() as any)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await docRef.set(record, { merge: true })
      return record
    } catch (err) {
      this.logger.error('daily-notes save 오류:', err)
      throw new InternalServerErrorException('메모를 저장하는 중 오류가 발생했습니다')
    }
  }

  async delete(uid: string, id: string) {
    try {
      const docRef = this.firebase.collection('daily_notes').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) throw new NotFoundException('메모를 찾을 수 없습니다')
      if (doc.data()?.userId !== uid) throw new ForbiddenException('삭제 권한이 없습니다')

      await docRef.delete()
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err
      this.logger.error('daily-notes delete 오류:', err)
      throw new InternalServerErrorException('메모를 삭제하는 중 오류가 발생했습니다')
    }
  }
}
