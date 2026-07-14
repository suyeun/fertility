import { IsString, Length } from 'class-validator'

export class JoinCoupleDto {
  @IsString()
  @Length(6, 6, { message: '초대코드는 6자리여야 합니다' })
  code: string
}
