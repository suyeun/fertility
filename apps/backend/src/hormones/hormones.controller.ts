import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { HormonesService } from './hormones.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'

@Controller('hormones')
@UseGuards(JwtAuthGuard)
export class HormonesController {
  constructor(private hormones: HormonesService) {}

  @Get()
  getAll(@CurrentUser() user: JwtPayload) {
    return this.hormones.getAll(user.sub)
  }

  @Post()
  save(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.hormones.save(user.sub, body)
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.hormones.delete(user.sub, id)
  }
}
