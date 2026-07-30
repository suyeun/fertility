import {
  Injectable, NotFoundException, InternalServerErrorException, Logger,
} from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { randomUUID } from 'node:crypto'
import type { Hospital, HospitalSuggestPayload } from '@fertility/shared'

@Injectable()
export class HospitalsService {
  private readonly logger = new Logger(HospitalsService.name)

  constructor(private firebase: FirebaseService) {}

  // ──────────────────────────────────────────
  // 병원 목록 조회 (지역/전문분야/검색어 필터)
  // ──────────────────────────────────────────
  async getAll(params: { region?: string; specialty?: string; search?: string }): Promise<Hospital[]> {
    try {
      let query: any = this.firebase.collection('hospitals').where('isVerified', '==', true)

      if (params.region && params.region !== '전체') {
        query = query.where('region', '==', params.region)
      }

      const snap = await query.orderBy('name').limit(200).get()
      let hospitals: Hospital[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))

      // specialty 필터 (배열 필드 — Firestore array-contains 사용)
      if (params.specialty) {
        hospitals = hospitals.filter((h: any) =>
          h.specialties?.includes(params.specialty)
        )
      }

      // 검색어 필터 (클라이언트 사이드)
      if (params.search) {
        const kw = params.search.toLowerCase()
        hospitals = hospitals.filter((h: any) =>
          h.name?.toLowerCase().includes(kw) || h.address?.toLowerCase().includes(kw)
        )
      }

      return hospitals
    } catch (err) {
      this.logger.error('hospitals getAll 오류:', err)
      throw new InternalServerErrorException('병원 목록을 불러오는 중 오류가 발생했습니다')
    }
  }

  // ──────────────────────────────────────────
  // 병원 상세 조회
  // ──────────────────────────────────────────
  async getById(id: string): Promise<Hospital> {
    try {
      const doc = await this.firebase.collection('hospitals').doc(id).get()
      if (!doc.exists) throw new NotFoundException('병원을 찾을 수 없습니다')
      return { id: doc.id, ...doc.data() } as Hospital
    } catch (err) {
      if (err instanceof NotFoundException) throw err
      this.logger.error('hospitals getById 오류:', err)
      throw new InternalServerErrorException('병원 정보를 불러오는 중 오류가 발생했습니다')
    }
  }

  // ──────────────────────────────────────────
  // 사용자 병원 등록 요청
  // ──────────────────────────────────────────
  async suggest(uid: string, data: HospitalSuggestPayload): Promise<void> {
    try {
      await this.firebase.collection('hospital_suggestions').doc(randomUUID()).set({
        ...data,
        requestedBy: uid,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      this.logger.error('hospitals suggest 오류:', err)
      throw new InternalServerErrorException('병원 등록 요청 중 오류가 발생했습니다')
    }
  }

  // ──────────────────────────────────────────
  // 전문의 자문 아티클 목록
  // ──────────────────────────────────────────
  async getArticles(params: { category?: string; search?: string }) {
    try {
      let query: any = this.firebase.collection('medical_articles').where('isVerified', '==', true)

      if (params.category && params.category !== '전체') {
        query = query.where('category', '==', params.category)
      }

      const snap = await query.orderBy('publishedAt', 'desc').limit(100).get()
      let articles = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))

      if (params.search) {
        const kw = params.search.toLowerCase()
        articles = articles.filter((a: any) =>
          a.title?.toLowerCase().includes(kw) ||
          a.tags?.some((t: string) => t.toLowerCase().includes(kw))
        )
      }

      return articles
    } catch (err) {
      this.logger.error('articles getAll 오류:', err)
      throw new InternalServerErrorException('아티클 목록을 불러오는 중 오류가 발생했습니다')
    }
  }

  // ──────────────────────────────────────────
  // 전문의 자문 아티클 상세
  // ──────────────────────────────────────────
  async getArticleById(id: string) {
    try {
      const doc = await this.firebase.collection('medical_articles').doc(id).get()
      if (!doc.exists) throw new NotFoundException('아티클을 찾을 수 없습니다')
      return { id: doc.id, ...doc.data() }
    } catch (err) {
      if (err instanceof NotFoundException) throw err
      this.logger.error('articles getById 오류:', err)
      throw new InternalServerErrorException('아티클을 불러오는 중 오류가 발생했습니다')
    }
  }
}
