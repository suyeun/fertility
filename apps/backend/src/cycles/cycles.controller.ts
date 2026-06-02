import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { CyclesService } from './cycles.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'

@Controller('cycles')
@UseGuards(JwtAuthGuard)
export class CyclesController {
  constructor(private cycles: CyclesService) {}

  @Get()
  getAll(@CurrentUser() user: JwtPayload) {
    return this.cycles.getAll(user.sub)
  }

  @Post()
  save(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.cycles.save(user.sub, body)
  }
}
