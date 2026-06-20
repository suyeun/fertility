import { Controller, Post, Get, Body, Res, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { AiService } from './ai.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { ChatDto, SaveHistoryDto } from './dto/ai.dto'

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private ai: AiService) {}  // [BIZ-001] FirebaseService 직접 주입 제거

  // [SEC-007] AI 채팅 — 20회/분 제한 (API 비용 남용 방지)
  @Post('chat')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async chat(
    @CurrentUser() user: JwtPayload,
    @Body() body: ChatDto,
    @Res() res: Response,
  ) {
    await this.ai.streamChat(body.messages, res, body.mode ?? 'CLINIC')
  }

  @Get('history')
  getHistory(@CurrentUser() user: JwtPayload) {
    return this.ai.getHistory(user.sub)  // [BIZ-001] firebase 파라미터 제거
  }

  @Post('history')
  saveHistory(@CurrentUser() user: JwtPayload, @Body() body: SaveHistoryDto) {
    return this.ai.saveHistory(user.sub, body.messages)  // [BIZ-001] firebase 파라미터 제거
  }
}
