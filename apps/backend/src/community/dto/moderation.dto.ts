import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator'

export const REPORT_REASONS = [
  'spam',          // 광고·홍보·도배
  'harassment',    // 욕설·비하·괴롭힘
  'medical_misinfo', // 위험한 의학 정보·시술 권유
  'privacy',       // 개인정보 노출
  'sexual',        // 성적 콘텐츠
  'other',
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export class ReportDto {
  @IsIn(REPORT_REASONS)
  reason: ReportReason

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string
}

/// 차단은 글 또는 댓글 ID 로 요청한다 — 작성자 토큰을 클라이언트에 노출하지 않기 위함.
export class BlockDto {
  @ValidateIf((o) => !o.commentId)
  @IsString()
  postId?: string

  @ValidateIf((o) => !o.postId)
  @IsString()
  commentId?: string
}
