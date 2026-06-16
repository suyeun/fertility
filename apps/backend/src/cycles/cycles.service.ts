import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { PaginatedResult, PaginationQueryDto } from '../common/pagination.dto'
import { v4 as uuidv4 } from 'uuid'

const DEFAULT_LIMIT = 20

@Injectable()
export class CyclesService {
  private readonly logger = new Logger(CyclesService.name)

  constructor(private firebase: FirebaseService) {}

  /**
   * [PERF-002] 커서 기반 페이지네이션
   * cursor = 이전 페이지 마지막 항목의 startDate
   */
  async getAll(uid: string, { cursor, limit = DEFAULT_LIMIT }: PaginationQueryDto): Promise<PaginatedResult<any>> {
    try {
      let query = this.firebase.collection('menstrual_cycles')
        .where('userId', '==', uid)
        .orderBy('startDate', 'desc')

      if (cursor) {
        query = query.startAfter(cursor)
      }

      // limit+1개 가져와 "다음 페이지 존재 여부" 판단
      const snap = await query.limit(limit + 1).get()
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      const hasMore = docs.length > limit
      const data = hasMore ? docs.slice(0, limit) : docs
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
      const id = data.id || uuidv4()
      const record = { ...data, id, userId: uid, createdAt: data.createdAt || new Date().toISOString() }
      await this.firebase.collection('menstrual_cycles').doc(id).set(record, { merge: true })
      return record
    } catch (err) {
      this.logger.error('cycles save 오류:', err)
      throw new InternalServerErrorException('생리 주기를 저장하는 중 오류가 발생했습니다')
    }
  }
}
