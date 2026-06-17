import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsInt } from 'class-validator'

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
  @IsEnum([
    'stimulation', 'monitoring', 'procedure',
    'retrieval', 'culture', 'transfer',
    'luteal', 'result',
  ])
  currentStage?: string | null

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
}
