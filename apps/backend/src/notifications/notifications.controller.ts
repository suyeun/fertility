import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'

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

  // Cloud Scheduler에서 매일 아침 호출 (내부 엔드포인트)
  @Post('daily')
  sendDailyReminders(@Body('secret') secret: string) {
    if (secret !== process.env.SCHEDULER_SECRET) return { skip: true }
    return this.notifications.sendAllDailyReminders()
  }
}
