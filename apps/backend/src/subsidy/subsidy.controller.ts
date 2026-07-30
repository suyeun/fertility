import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { SubsidyService } from './subsidy.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { SaveSubsidyProfileDto, AddSubsidyCalculationDto } from './dto/save-subsidy-profile.dto'

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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('profile/calculations')
  addCalculation(@CurrentUser() user: JwtPayload, @Body() body: AddSubsidyCalculationDto) {
    return this.subsidy.addCalculation(user.sub, body)
  }
}
