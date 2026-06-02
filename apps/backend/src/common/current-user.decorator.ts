import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface JwtPayload {
  sub: string   // uid (Firestore document id)
  email: string
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest()
    return req.user
  },
)
