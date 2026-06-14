import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

interface ErrorResponse {
  statusCode: number
  message: string | string[]
  error: string
  path: string
  timestamp: string
}

/**
 * [ARCH-002] 글로벌 HTTP 예외 필터
 * 모든 예외를 일관된 JSON 형식으로 변환합니다.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = '서버 내부 오류가 발생했습니다'
    let error = 'Internal Server Error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()
      if (typeof res === 'string') {
        message = res
        error = exception.message
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>
        message = resObj.message ?? message
        error = resObj.error ?? error
      }
    } else if (exception instanceof Error) {
      // 예상치 못한 오류는 내부 로그만 남기고 클라이언트에는 일반 메시지
      this.logger.error(
        `[${request.method}] ${request.url} — ${exception.message}`,
        exception.stack,
      )
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    } else {
      this.logger.warn(`[${request.method}] ${request.url} → ${status}: ${JSON.stringify(message)}`)
    }

    const body: ErrorResponse = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    }

    response.status(status).json(body)
  }
}
