import {
  IsString, IsOptional, IsEnum, IsISO8601,
} from 'class-validator'

export type Mood = 'great' | 'good' | 'neutral' | 'sad' | 'anxious' | 'hopeful'

export class SaveDiaryDto {
  @IsEnum(['great', 'good', 'neutral', 'sad', 'anxious', 'hopeful'])
  mood: Mood

  @IsString()
  content: string

  @IsOptional()
  @IsString()
  aiAnalysis?: string

  @IsOptional()
  @IsString()
  createdAt?: string
}
