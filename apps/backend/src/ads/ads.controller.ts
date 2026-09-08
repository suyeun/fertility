import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthGuard } from '@nestjs/passport'
import { AdsService } from './ads.service'
import { AdEventDto } from './dto/ad-event.dto'

@Controller('ads')
export class AdsController {
  constructor(private ads: AdsService) {}

  /// 노출/클릭 이벤트 — 인증 불필요(익명 집계), 분당 120회로 제한.
  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  async record(@Body() body: AdEventDto): Promise<void> {
    await this.ads.record(body)
  }

  /// 기간 합계 — 로그인 사용자용(관리자 리포트). 개인 데이터가 없어 별도 역할 검증은 두지 않는다.
  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  summarize(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('target') target?: string,
    @Query('targetId') targetId?: string,
  ) {
    const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const monthAgo = new Date(Date.now() + 9 * 60 * 60 * 1000 - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return this.ads.summarize({ target, targetId, from: from || monthAgo, to: to || today })
  }
}
