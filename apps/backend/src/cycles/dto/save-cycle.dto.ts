import {
  IsString, IsOptional, IsNumber, IsDateString,
  IsInt, Min, Max, IsISO8601,
} from 'class-validator'

export class SaveCycleDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsISO8601()
  startDate: string

  @IsOptional()
  @IsISO8601()
  endDate?: string

  @IsInt()
  @Min(15)
  @Max(60)
  cycleLength: number

  @IsInt()
  @Min(1)
  @Max(14)
  periodLength: number

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  createdAt?: string
}
