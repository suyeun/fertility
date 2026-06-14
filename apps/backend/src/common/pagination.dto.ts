import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * [PERF-002] 커서 기반 페이지네이션 공통 쿼리 DTO
 * - cursor: 마지막으로 받은 문서의 정렬 기준 값 (startDate, date, scheduledAt 등)
 * - limit: 한 번에 가져올 최대 개수 (기본 20, 최대 50)
 */
export class PaginationQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string  // 이전 페이지 마지막 항목의 정렬 키 값

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number   // 기본값은 서비스에서 처리
}

/** 페이지네이션 응답 래퍼 */
export interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null  // null이면 마지막 페이지
  hasMore: boolean
}
