import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'

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
  constructor(private readonly firebase: FirebaseService) {}

  async getAffiliateProducts(): Promise<AffiliateProductsMap> {
    const doc = await this.firebase.db.collection('config').doc('affiliateProducts').get()
    if (!doc.exists) return {}
    return doc.data() as AffiliateProductsMap
  }
}
