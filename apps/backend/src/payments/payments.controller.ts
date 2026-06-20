import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import * as crypto from 'crypto'

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name)

  constructor(private payments: PaymentsService) {}

  /**
   * RevenueCat 웹훅 수신
   * RevenueCat 대시보드 → 프로젝트 → Webhooks → URL 설정:
   * https://your-api.com/api/payments/revenuecat
   * Authorization Header: REVENUECAT_WEBHOOK_SECRET 값
   */
  @Post('revenuecat')
  async revenuecatWebhook(
    @Headers('authorization') auth: string,
    @Body() body: any,
  ) {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET
    if (!secret || !auth) throw new UnauthorizedException('Invalid webhook secret')

    const a = Buffer.from(auth)
    const b = Buffer.from(secret)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid webhook secret')
    }

    this.logger.log(`RevenueCat 웹훅 수신: ${body?.event?.type}`)
    return this.payments.handleRevenueCatEvent(body)
  }
}
