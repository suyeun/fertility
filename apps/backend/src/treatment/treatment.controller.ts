import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { TreatmentService } from './treatment.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { SaveTreatmentDto, UpdateTreatmentStatusDto } from './dto/save-treatment.dto'

@ApiTags('시술일정')
@ApiBearerAuth()
@Controller('treatment')
@UseGuards(JwtAuthGuard)
export class TreatmentController {
  constructor(private treatment: TreatmentService) {}

  @Get()
  getAll(@CurrentUser() user: JwtPayload) {
    return this.treatment.getAll(user.sub)
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
