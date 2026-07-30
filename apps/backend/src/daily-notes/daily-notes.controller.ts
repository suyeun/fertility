import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DailyNotesService } from './daily-notes.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { SaveDailyNoteDto } from './dto/save-daily-note.dto'

@ApiTags('일별 메모')
@ApiBearerAuth()
@Controller('daily-notes')
@UseGuards(JwtAuthGuard)
export class DailyNotesController {
  constructor(private dailyNotes: DailyNotesService) {}

  @Get()
  getAll(@CurrentUser() user: JwtPayload) {
    return this.dailyNotes.getAll(user.sub)
  }

  @Get(':date')
  getByDate(@CurrentUser() user: JwtPayload, @Param('date') date: string) {
    return this.dailyNotes.getByDate(user.sub, date)
  }

  @Post(':date')
  save(@CurrentUser() user: JwtPayload, @Param('date') date: string, @Body() body: SaveDailyNoteDto) {
    return this.dailyNotes.save(user.sub, date, body)
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.dailyNotes.delete(user.sub, id)
  }
}
