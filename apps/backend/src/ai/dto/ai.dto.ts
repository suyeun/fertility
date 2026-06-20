import { IsString, IsNotEmpty, MaxLength, IsIn, ValidateNested, ArrayMaxSize, IsArray, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant'

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string
}

export class ChatDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[]

  @IsOptional()
  @IsIn(['NATURAL', 'CLINIC'])
  mode?: 'NATURAL' | 'CLINIC'
}

export class SaveHistoryDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[]
}
