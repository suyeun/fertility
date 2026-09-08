import { Controller, Get, Patch, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { SubsidyService } from './subsidy.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { SaveSubsidyProfileDto, AddSubsidyCalculationDto, UpdateSubsidyApplicationDto } from './dto/save-subsidy-profile.dto'

@ApiTags('지원금')
@Controller('subsidy')
export class SubsidyController {
  constructor(private subsidy: SubsidyService) {}

  // 인증 불필요 — 지원금 규칙(국가/지자체 기준)은 공개 데이터
  @Get('rules')
  getRules() {
    return this.subsidy.getRules()
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.subsidy.getProfile(user.sub)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  saveProfile(@CurrentUser() user: JwtPayload, @Body() body: SaveSubsidyProfileDto) {
    return this.subsidy.saveProfile(user.sub, body)
  }

  // 회차(시술 일정)별 신청 진행 상태: 통지서 발급 → 시술 완료 → 청구 완료 + 서류 체크
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('applications/:scheduleId')
  updateApplication(
    @CurrentUser() user: JwtPayload,
    @Param('scheduleId') scheduleId: string,
    @Body() body: UpdateSubsidyApplicationDto,
  ) {
    return this.subsidy.updateApplication(user.sub, scheduleId, body)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('profile/calculations')
  addCalculation(@CurrentUser() user: JwtPayload, @Body() body: AddSubsidyCalculationDto) {
    return this.subsidy.addCalculation(user.sub, body)
  }
}
