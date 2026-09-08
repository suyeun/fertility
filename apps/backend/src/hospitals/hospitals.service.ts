import {
  Injectable, NotFoundException, InternalServerErrorException, Logger,
} from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { randomUUID } from 'node:crypto'
import type { Hospital, HospitalSponsorship, HospitalSuggestPayload } from '@fertility/shared'

/// 광고 계약이 오늘 기준 유효한지. 날짜는 YYYY-MM-DD 문자열 비교(KST 기준 일 단위).
export function isSponsorshipActive(s: HospitalSponsorship | undefined, today: string): boolean {
  if (!s?.isActive) return false
  if (s.startAt && today < s.startAt) return false
  if (s.endAt && today > s.endAt) return false
  return true
}

function todayKst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/// 앱에 내려줄 형태로 정리 — 계약 메모는 제거하고 isSponsored 를 계산해 붙인다.
function toPublicHospital(raw: any, today: string): Hospital {
  const { sponsorship, ...rest } = raw
  const active = isSponsorshipActive(sponsorship, today)
  return {
    ...rest,
    isSponsored: active,
    sponsorship: active
      ? { isActive: true, badgeLabel: sponsorship?.badgeLabel || '광고' }
      : undefined,
  }
}

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
      const today = todayKst()
      let hospitals: Hospital[] = snap.docs.map((d: any) =>
        toPublicHospital({ id: d.id, ...d.data() }, today),
      )

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

      // 광고 병원을 앞에, 나머지는 이름순(중립 정렬). 순위·추천 개념은 두지 않는다.
      return hospitals.sort((a, b) => {
        if (!!a.isSponsored !== !!b.isSponsored) return a.isSponsored ? -1 : 1
        return (a.name || '').localeCompare(b.name || '', 'ko')
      })
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
      return toPublicHospital({ id: doc.id, ...doc.data() }, todayKst())
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
