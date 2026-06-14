import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { SignupDto, LoginDto } from './dto/auth.dto'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @ApiOperation({ summary: '회원가입' })
  @Post('signup')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto)
  }

  @ApiOperation({ summary: '로그인' })
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @ApiOperation({ summary: '내 정보 조회' })
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.getMe(user.sub)
  }
}
