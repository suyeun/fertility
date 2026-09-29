import { Controller, Get, Patch, Delete, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { DeleteAccountDto } from './dto/delete-account.dto'
import { AccountDeletionService } from './account-deletion.service'

@ApiTags('사용자')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private users: UsersService,
    private deletion: AccountDeletionService,
  ) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.users.getProfile(user.sub)
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() body: UpdateProfileDto) {
    return this.users.updateProfile(user.sub, body)
  }

  // 계정 삭제 — 비밀번호 재확인 후 개인 기록 삭제·커뮤니티 글 익명화·사용자 문서 삭제 (되돌릴 수 없음)
  @Delete('me')
  deleteAccount(@CurrentUser() user: JwtPayload, @Body() body: DeleteAccountDto) {
    return this.deletion.deleteAccount(user.sub, body.password)
  }
}
