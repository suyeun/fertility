import { Controller, Post, Get, Body, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { AiService } from './ai.service'
import { FirebaseService } from '../firebase/firebase.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private ai: AiService,
    private firebase: FirebaseService,
  ) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: JwtPayload,
    @Body() body: { messages: any[]; mode?: 'NATURAL' | 'CLINIC' },
    @Res() res: Response,
  ) {
    await this.ai.streamChat(body.messages, res, body.mode ?? 'CLINIC')
  }

  @Get('history')
  getHistory(@CurrentUser() user: JwtPayload) {
    return this.ai.getHistory(user.sub, this.firebase)
  }

  @Post('history')
  saveHistory(@CurrentUser() user: JwtPayload, @Body() body: { messages: any[] }) {
    return this.ai.saveHistory(user.sub, body.messages, this.firebase)
  }
}
