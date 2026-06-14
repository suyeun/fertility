import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { JwtPayload } from '../common/current-user.decorator'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET')
    if (!secret) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다')
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException()
    return payload
  }
}
