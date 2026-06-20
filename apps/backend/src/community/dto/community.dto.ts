import { IsString, IsNotEmpty, MaxLength, IsIn } from 'class-validator'

const POST_TAGS = [
  '#감정토닥', '#남편_시댁', '#아무말',
  '#시험관_신선', '#시험관_동결', '#인공수정', '#병원추천',
  '#배테기_기초체온', '#영양제추천', '#운동_식단',
]

export class CreatePostDto {
  @IsIn(POST_TAGS)
  tag: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string
}
