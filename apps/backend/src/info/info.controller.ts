import { Controller, Get } from '@nestjs/common'
import { InfoService } from './info.service'

@Controller('info')
export class InfoController {
  constructor(private readonly info: InfoService) {}

  // 인증 불필요 — 제품 목록은 공개 데이터
  @Get('products')
  getAffiliateProducts() {
    return this.info.getAffiliateProducts()
  }

  // 인증 불필요 — 임신·출산 지원 안내(금액·시점·신청처), config/birthBenefits 로 갱신
  @Get('birth-benefits')
  getBirthBenefits() {
    return this.info.getBirthBenefits()
  }
}
