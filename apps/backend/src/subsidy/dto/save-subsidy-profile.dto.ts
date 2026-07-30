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
