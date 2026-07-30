import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { CouplesService } from '../couples/couples.service'
import { PaginatedResult, PaginationQueryDto } from '../common/pagination.dto'
import { randomUUID } from 'node:crypto'

const DEFAULT_LIMIT = 20

@Injectable()
export class CyclesService {
  private readonly logger = new Logger(CyclesService.name)

  constructor(
    private firebase: FirebaseService,
    private couples: CouplesService,
  ) {}

  /**
   * [PERF-002] 커서 기반 페이지네이션
   * cursor = 이전 페이지 마지막 항목의 startDate
   */
  async getAll(uid: string, { cursor, limit = DEFAULT_LIMIT }: PaginationQueryDto): Promise<PaginatedResult<any>> {
    try {
      // 1. 자신의 생리 주기 조회
      let query = this.firebase.collection('menstrual_cycles')
        .where('userId', '==', uid)
        .orderBy('startDate', 'desc')

      if (cursor) {
        query = query.startAfter(cursor)
      }

      const snap = await query.limit(limit + 1).get()
      const myDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      // 2. 배우자 연결 확인 후 배우자 생리 주기 조회
      const partnerUid = await this.couples.getPartnerUid(uid)
      let partnerDocs: any[] = []
      if (partnerUid) {
        let partnerQuery = this.firebase.collection('menstrual_cycles')
          .where('userId', '==', partnerUid)
          .orderBy('startDate', 'desc')

        if (cursor) {
          partnerQuery = partnerQuery.startAfter(cursor)
        }
        const partnerSnap = await partnerQuery.limit(limit + 1).get()
        partnerDocs = partnerSnap.docs.map(d => ({ id: d.id, ...d.data(), isPartnerRecord: true }))
      }

      // 두 목록을 병합 후 내림차순 정렬
      const merged = [...myDocs, ...partnerDocs].sort(
        (a: any, b: any) => b.startDate?.localeCompare(a.startDate ?? '') ?? 0
      )

      const hasMore = merged.length > limit
      const data = hasMore ? merged.slice(0, limit) : merged
      const lastItem = data[data.length - 1] as any
      const nextCursor = hasMore ? (lastItem?.startDate ?? null) : null

      return { data, nextCursor, hasMore }
    } catch (err) {
      this.logger.error('cycles getAll 오류:', err)
      throw new InternalServerErrorException('생리 주기 목록을 불러오는 중 오류가 발생했습니다')
    }
  }

  async save(uid: string, data: any) {
    try {
      const id = data.id || randomUUID()
      
      // coupleId 조회
      const userDoc = await this.firebase.collection('users').doc(uid).get()
      const coupleId = (userDoc.data() as any)?.coupleId ?? null

      const record = {
        ...data,
        id,
        userId: uid,
        coupleId,
        author: uid,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await this.firebase.collection('menstrual_cycles').doc(id).set(record, { merge: true })
      return record
    } catch (err) {
      this.logger.error('cycles save 오류:', err)
      throw new InternalServerErrorException('생리 주기를 저장하는 중 오류가 발생했습니다')
    }
  }
}
