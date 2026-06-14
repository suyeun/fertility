import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { UpdateProfileDto } from './dto/update-profile.dto'

@ApiTags('사용자')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.users.getProfile(user.sub)
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() body: UpdateProfileDto) {
    return this.users.updateProfile(user.sub, body)
  }
}
