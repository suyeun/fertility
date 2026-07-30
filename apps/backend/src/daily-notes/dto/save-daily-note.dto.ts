import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator'

export class SaveDailyNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  memo?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  condition?: number
}
