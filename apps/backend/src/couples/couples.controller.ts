import {
  Controller, Get, Post, Delete, Param,
  Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CouplesService } from './couples.service'
import { JoinCoupleDto } from './dto/join-couple.dto'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { Throttle } from '@nestjs/throttler'

@UseGuards(AuthGuard('jwt'))
@Controller('couples')
export class CouplesController {
  constructor(private readonly couplesService: CouplesService) {}

  /** GET /couples/me — 현재 연결 상태 조회 */
  @Get('me')
  getMyStatus(@CurrentUser() user: JwtPayload) {
    return this.couplesService.getMyStatus(user.sub)
  }

  /** POST /couples/invite — 초대코드 생성 */
  @Post('invite')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 1분에 5회 제한
  createInvite(@CurrentUser() user: JwtPayload) {
    return this.couplesService.createInvite(user.sub)
  }

  /** POST /couples/join — 초대코드로 연결 */
  @Post('join')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  joinCouple(@CurrentUser() user: JwtPayload, @Body() dto: JoinCoupleDto) {
    return this.couplesService.joinCouple(user.sub, dto.code)
  }

  /** DELETE /couples/:coupleId — 연결 해제 */
  @Delete(':coupleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlink(@CurrentUser() user: JwtPayload, @Param('coupleId') coupleId: string) {
    return this.couplesService.unlink(user.sub, coupleId)
  }
}
