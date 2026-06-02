import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { DiaryService } from './diary.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'

@Controller('diary')
@UseGuards(JwtAuthGuard)
export class DiaryController {
  constructor(private diary: DiaryService) {}

  @Get()
  getAll(@CurrentUser() user: JwtPayload) {
    return this.diary.getAll(user.sub)
  }

  @Post(':date')
  save(@CurrentUser() user: JwtPayload, @Param('date') date: string, @Body() body: any) {
    return this.diary.save(user.sub, date, body)
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.diary.delete(user.sub, id)
  }
}
