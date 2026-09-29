import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class ScanScheduleDto {
  /// base64 (data: 접두어 없이). 앱이 긴 변 1600px·JPEG 80% 로 줄여 보낸다.
  @IsString()
  @MaxLength(9_000_000)
  imageBase64: string

  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'

  /// 상대 날짜(D1 등) 환산 기준 — 없으면 오늘(KST)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  referenceDate?: string
}
