import { IsString, IsOptional, IsIn, IsNumber, IsArray, ValidateNested, IsObject } from 'class-validator'
import { Type } from 'class-transformer'

export class UsedCountsDto {
  @IsOptional()
  @IsNumber()
  ivf?: number

  @IsOptional()
  @IsNumber()
  iui?: number
}

export class SaveSubsidyProfileDto {
  @IsOptional()
  @IsString()
  regionCode?: string

  @IsOptional()
  @IsIn(['legal', 'defacto'])
  marriageType?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => UsedCountsDto)
  usedCounts?: UsedCountsDto

  @IsOptional()
  @IsNumber()
  birthsSinceStart?: number

  @IsOptional()
  @IsObject()
  checklistState?: Record<string, boolean>
}

// 회차(시술 일정)별 지원금 신청 진행 상태 — 각 시각은 ISO 문자열, null 이면 "미완료로 되돌리기".
export class UpdateSubsidyApplicationDto {
  @IsOptional()
  @IsString()
  noticeIssuedAt?: string | null      // 지원결정통지서 발급

  @IsOptional()
  @IsString()
  procedureDoneAt?: string | null     // 시술 완료

  @IsOptional()
  @IsString()
  claimSubmittedAt?: string | null    // 시술비 청구 완료

  @IsOptional()
  @IsObject()
  docsChecked?: Record<string, boolean>  // 서류 체크리스트 (docId → 준비됨)
}

export class AddSubsidyCalculationDto {
  @IsString()
  procedure: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extras?: string[]

  @IsNumber()
  estimatedTotal: number

  @IsOptional()
  @IsString()
  linkedScheduleId?: string
}
