import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { CyclesService } from './cycles.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { SaveCycleDto } from './dto/save-cycle.dto'
import { PaginationQueryDto } from '../common/pagination.dto'

@ApiTags('생리주기')
@ApiBearerAuth()
@Controller('cycles')
@UseGuards(JwtAuthGuard)
export class CyclesController {
  constructor(private cycles: CyclesService) {}

  @Get()
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
    return this.cycles.getAll(user.sub, query)
  }

  @Post()
  save(@CurrentUser() user: JwtPayload, @Body() body: SaveCycleDto) {
    return this.cycles.save(user.sub, body)
  }
}
