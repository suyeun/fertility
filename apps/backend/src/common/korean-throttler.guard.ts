import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

/**
 * [I18N-001] 기본 ThrottlerGuard의 429 메시지는
 * "ThrottlerException: Too Many Requests" (영어) 그대로 클라이언트에 노출된다.
 * 한글 안내문으로 대체한다.
 */
@Injectable()
export class KoreanThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = '요청이 너무 많아요. 잠시 후 다시 시도해주세요'
}
