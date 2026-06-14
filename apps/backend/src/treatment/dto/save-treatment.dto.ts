import {
  IsString, IsOptional, IsEnum, IsISO8601, IsArray, ValidateNested, IsIn,
} from 'class-validator'
import { Type } from 'class-transformer'

export class MedicationDto {
  @IsString()
  name: string

  @IsString()
  dose: string

  @IsArray()
  @IsString({ each: true })
  times: string[]

  @IsISO8601()
  startDate: string

  @IsOptional()
  @IsISO8601()
  endDate?: string
}

export class SaveTreatmentDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsEnum(['IVF', 'IUI', 'FET', 'monitoring', 'other'])
  type: string

  @IsString()
  title: string

  @IsISO8601()
  scheduledAt: string

  @IsEnum(['scheduled', 'completed', 'cancelled'])
  status: string

  @IsOptional()
  @IsString()
  hospitalName?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications?: MedicationDto[]
}

export class UpdateTreatmentStatusDto {
  @IsIn(['scheduled', 'completed', 'cancelled'])
  status: string
}
