import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { CouplesService } from '../couples/couples.service'
import { PaginatedResult, PaginationQueryDto } from '../common/pagination.dto'
import { v4 as uuidv4 } from 'uuid'

const DEFAULT_LIMIT = 20

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name)

  constructor(
    private firebase: FirebaseService,
    private couples: CouplesService,
  ) {}

  async getAll(uid: string, { cursor, limit = DEFAULT_LIMIT }: PaginationQueryDto): Promise<PaginatedResult<any>> {
    try {
      let query = this.firebase.collection('diary_entries')
        .where('userId', '==', uid)
        .orderBy('date', 'desc')

      if (cursor) {
        query = query.startAfter(cursor)
      }

      const snap = await query.limit(limit + 1).get()
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      const hasMore = docs.length > limit
      const data = hasMore ? docs.slice(0, limit) : docs
      const lastItem = data[data.length - 1] as any
      const nextCursor = hasMore ? (lastItem?.date ?? null) : null

      // 배우자의 공유 설정된 일기도 함께 조회 (공유 허용된 항목만)
      const partnerUid = await this.couples.getPartnerUid(uid)
      let partnerEntries: any[] = []
      if (partnerUid && !cursor) { // 첫 페이지에만 배우자 기록 추가
        const partnerSnap = await this.firebase.collection('diary_entries')
          .where('userId', '==', partnerUid)
          .where('sharedWithPartner', '==', true)
          .orderBy('date', 'desc')
          .limit(20)
          .get()
        partnerEntries = partnerSnap.docs.map(d => ({ id: d.id, ...d.data(), isPartnerRecord: true }))
      }

      // 날짜 기준 합산 정렬
      const allData = [...data, ...partnerEntries].sort(
        (a: any, b: any) => b.date?.localeCompare(a.date ?? '') ?? 0
      )

      return { data: allData, nextCursor, hasMore }
    } catch (err) {
      this.logger.error('diary getAll 오류:', err)
      throw new InternalServerErrorException('일기 목록을 불러오는 중 오류가 발생했습니다')
    }
  }

  async save(uid: string, date: string, data: any) {
    try {
      const existing = await this.firebase.collection('diary_entries')
        .where('userId', '==', uid)
        .where('date', '==', date)
        .limit(1)
        .get()

      const id = existing.empty ? uuidv4() : existing.docs[0].id

      // coupleId 자동 주입
      const userDoc = await this.firebase.collection('users').doc(uid).get()
      const coupleId = (userDoc.data() as any)?.coupleId ?? null

      const record = {
        ...data, id, userId: uid, date, coupleId,
        sharedWithPartner: data.sharedWithPartner ?? false, // 기본 비공개
        author: uid,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await this.firebase.collection('diary_entries').doc(id).set(record, { merge: true })
      return record
    } catch (err) {
      this.logger.error('diary save 오류:', err)
      throw new InternalServerErrorException('일기를 저장하는 중 오류가 발생했습니다')
    }
  }

  async delete(uid: string, id: string) {
    try {
      const docRef = this.firebase.collection('diary_entries').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) throw new NotFoundException('일기를 찾을 수 없습니다')
      if (doc.data()?.userId !== uid) throw new ForbiddenException('삭제 권한이 없습니다')

      await docRef.delete()
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err
      this.logger.error('diary delete 오류:', err)
      throw new InternalServerErrorException('일기를 삭제하는 중 오류가 발생했습니다')
    }
  }
}
