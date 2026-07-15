import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/global-exception.filter'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const logger = new Logger('Bootstrap')

  const isProd = process.env.NODE_ENV === 'production'

  // [SEC-008] Helmet 보안 헤더
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const helmet = require('helmet')
  app.use(helmet())

  // [SEC-006] CORS 도메인 범위 축소 — *.vercel.app 전체 허용 제거
  // ALLOWED_ORIGINS 환경변수로 추가 도메인을 쉼표 구분해서 주입 가능
  // 예: https://lunera.vercel.app,https://www.lunera.app
  const extraOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    /^exp:\/\//,                                        // Expo Go
    /^https:\/\/fertility-[a-z0-9-]+\.vercel\.app$/,   // 프로젝트 전용 Vercel 도메인만 허용
    ...extraOrigins,
  ]

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  app.useGlobalFilters(new GlobalExceptionFilter())  // [ARCH-002] 일관된 에러 응답 포맷
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // [I18N-001] class-validator 기본 메시지는 영어 — 커스텀 한글 메시지(예: JoinCoupleDto)는
      // 그대로 살리고, 나머지 필드는 일반 한글 안내문으로 대체해 클라이언트에 영어 원문이 노출되지 않게 한다.
      exceptionFactory: (errors) => {
        const messages = errors
          .flatMap((e) => Object.values(e.constraints ?? {}))
          .filter((msg) => /[가-힣]/.test(msg))
        return new BadRequestException(messages.length > 0 ? messages.join(', ') : '입력값을 확인해주세요')
      },
    }),
  )
  app.setGlobalPrefix('api')

  const port = process.env.PORT || 3001

  // [ARCH-003] Swagger — 개발 환경에서만 활성화 (/api/docs)
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Lunera (BOM) API')
      .setDescription('임신준비 앱 뷸네라 백엔드 API 문서')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    })
    logger.log('📖 Swagger UI: http://localhost:' + port + '/api/docs')
  }

  await app.listen(port, '0.0.0.0')  // 0.0.0.0 — Render 컨테이너 필수
  logger.log(`🚀 BOM 백엔드 실행 중 (${isProd ? 'production' : 'development'}): port ${port}`)
}

bootstrap()
