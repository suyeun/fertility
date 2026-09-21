import { Injectable, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { BirthBenefitsDoc, DEFAULT_BIRTH_BENEFITS, isValidBirthBenefitsDoc, sortBenefits } from './birth-benefits'

export interface AffiliateProduct {
  name: string
  desc: string
  platform: string
  url: string
}

// articleId → 제품 목록
export type AffiliateProductsMap = Record<string, AffiliateProduct[]>

@Injectable()
export class InfoService {
  private readonly logger = new Logger(InfoService.name)

  constructor(private readonly firebase: FirebaseService) {}

  /// 임신·출산 지원 안내 — config/birthBenefits 가 유효하면 그 값을, 아니면 기본값.
  /// 인증 불필요(공개 데이터). 앱 배포 없이 금액·확인일을 갱신할 수 있다.
  async getBirthBenefits(): Promise<BirthBenefitsDoc & { source: 'config' | 'default' }> {
    try {
      const doc = await this.firebase.db.collection('config').doc('birthBenefits').get()
      if (doc.exists) {
        const data = doc.data()
        if (isValidBirthBenefitsDoc(data)) return { ...sortBenefits(data), source: 'config' }
        this.logger.warn('config/birthBenefits 형식 오류 — 기본값 사용')
      }
    } catch (err) {
      this.logger.warn(`birthBenefits 조회 실패 — 기본값 사용: ${err}`)
    }
    return { ...sortBenefits(DEFAULT_BIRTH_BENEFITS), source: 'default' }
  }

  async getAffiliateProducts(): Promise<AffiliateProductsMap> {
    const doc = await this.firebase.db.collection('config').doc('affiliateProducts').get()
    if (!doc.exists) return {}
    return doc.data() as AffiliateProductsMap
  }
}
