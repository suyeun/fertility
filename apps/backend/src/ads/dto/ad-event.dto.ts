import { IsIn, IsString, Length, Matches } from 'class-validator'

/// 광고 노출/클릭 이벤트 — 사용자 식별자 없음. 서버는 일자·대상별 카운트만 증가시킨다.
export class AdEventDto {
  @IsIn(['impression', 'click'])
  type: 'impression' | 'click'

  @IsIn(['banner', 'hospital'])
  target: 'banner' | 'hospital'

  @IsString()
  @Length(1, 128)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'targetId 형식이 올바르지 않습니다' })
  targetId: string
}
