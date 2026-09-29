import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { TreatmentService } from './treatment.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { SaveTreatmentDto, UpdateTreatmentStatusDto } from './dto/save-treatment.dto'
import { ScanScheduleDto } from './dto/scan-schedule.dto'
import { ScheduleScanService } from './schedule-scan.service'

@ApiTags('시술일정')
@ApiBearerAuth()
@Controller('treatment')
@UseGuards(JwtAuthGuard)
export class TreatmentController {
  constructor(
    private treatment: TreatmentService,
    private scan: ScheduleScanService,
  ) {}

  @Get()
  getAll(@CurrentUser() user: JwtPayload) {
    return this.treatment.getAll(user.sub)
  }

  // 회차 프로토콜 템플릿 (예시 일정) — 기준일 하나로 회차 일정 초안을 만들 때 사용
  @Get('templates')
  getTemplates() {
    return this.treatment.getTemplates()
  }

  // 스캔 잔여 횟수 — 무료 평생 2회, 프리미엄 하루 20회
  @Get('scan-quota')
  scanQuota(@CurrentUser() user: JwtPayload) {
    return this.scan.getQuota(user.sub)
  }

  // 처방전·주사 일정표 사진 → 일정 초안 (저장하지 않음, 앱에서 확인·수정 후 저장). 이미지는 보관하지 않는다.
  @Post('scan-schedule')
  @Throttle({ default: { ttl: 60000, limit: 6 } })
  scanSchedule(@CurrentUser() user: JwtPayload, @Body() body: ScanScheduleDto) {
    const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return this.scan.scan({
      uid: user.sub,
      imageBase64: body.imageBase64,
      mediaType: body.mediaType,
      referenceDate: body.referenceDate || today,
    })
  }

  @Post()
  save(@CurrentUser() user: JwtPayload, @Body() body: SaveTreatmentDto) {
    return this.treatment.save(user.sub, body)
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: UpdateTreatmentStatusDto,
  ) {
    return this.treatment.updateStatus(user.sub, id, body.status)
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.treatment.delete(user.sub, id)
  }
}
