import { Controller, Post, Body, UseGuards, UnauthorizedException } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import * as crypto from 'crypto'

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  // FCM 토큰 등록 (앱 시작 시 호출)
  @Post('token')
  @UseGuards(JwtAuthGuard)
  registerToken(
    @CurrentUser() user: JwtPayload,
    @Body() body: { token: string; platform: 'ios' | 'android' },
  ) {
    return this.notifications.registerToken(user.sub, body.token, body.platform)
  }

  // Cloud Scheduler에서 5분마다 호출 — 예약 알림 처리
  @Post('process')
  processScheduled(@Body('secret') secret: string) {
    const expected = process.env.SCHEDULER_SECRET
    if (!expected || !secret) throw new UnauthorizedException()
    const a = Buffer.from(secret)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException()
    }
    return this.notifications.processScheduledNotifications()
  }

  // Cloud Scheduler에서 매일 아침 호출 (내부 엔드포인트)
  @Post('daily')
  sendDailyReminders(@Body('secret') secret: string) {
    const expected = process.env.SCHEDULER_SECRET
    if (!expected || !secret) throw new UnauthorizedException()

    const a = Buffer.from(secret)
    const b = Buffer.from(expected)
    // 길이가 다르면 timingSafeEqual이 throw하므로 길이를 먼저 상수 시간 비교
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException()
    }

    return this.notifications.sendAllDailyReminders()
  }
}
