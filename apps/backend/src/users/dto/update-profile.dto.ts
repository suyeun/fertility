import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsInt, ValidateIf } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  partnerName?: string

  @IsOptional()
  @IsEnum(['NATURAL', 'CLINIC'])
  currentMode?: 'NATURAL' | 'CLINIC'

  @IsOptional()
  @IsEnum(['natural', 'iui', 'ivf', 'fet', 'pregnant'])
  treatmentStage?: string

  @IsOptional()
  @ValidateIf((o) => o.currentStage !== null)
  @IsEnum([
    'stimulation', 'monitoring', 'procedure',
    'retrieval', 'culture', 'transfer',
    'luteal', 'result',
  ])
  currentStage?: string | null

  @IsOptional()
  @IsString()
  stageStartedAt?: string | null

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(60)
  averageCycleLength?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  averagePeriodLength?: number

  // 임신 확인 모드 — null 이면 해제
  @IsOptional()
  @ValidateIf((o) => o.pregnancyLmpDate !== null)
  @IsString()
  pregnancyLmpDate?: string | null

  @IsOptional()
  @ValidateIf((o) => o.pregnancyConfirmedAt !== null)
  @IsString()
  pregnancyConfirmedAt?: string | null
}
