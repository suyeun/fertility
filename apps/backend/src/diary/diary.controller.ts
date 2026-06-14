import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { DiaryService } from './diary.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { SaveDiaryDto } from './dto/save-diary.dto'
import { PaginationQueryDto } from '../common/pagination.dto'

@ApiTags('감정일기')
@ApiBearerAuth()
@Controller('diary')
@UseGuards(JwtAuthGuard)
export class DiaryController {
  constructor(private diary: DiaryService) {}

  @Get()
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
    return this.diary.getAll(user.sub, query)
  }

  @Post(':date')
  save(@CurrentUser() user: JwtPayload, @Param('date') date: string, @Body() body: SaveDiaryDto) {
    return this.diary.save(user.sub, date, body)
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.diary.delete(user.sub, id)
  }
}
