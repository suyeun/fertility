import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const logger = new Logger('Bootstrap')

  const isProd = process.env.NODE_ENV === 'production'

  // 허용 Origin 목록
  // ALLOWED_ORIGINS 환경변수로 추가 도메인을 쉼표 구분해서 주입 가능
  // 예: https://bom-app.vercel.app,https://www.bom-app.com
  const extraOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    /^exp:\/\//,              // Expo Go
    /^https:\/\/.*\.vercel\.app$/,  // Vercel 프리뷰 도메인 전체 허용
    ...extraOrigins,
  ]

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.setGlobalPrefix('api')

  const port = process.env.PORT || 3001
  await app.listen(port, '0.0.0.0')  // 0.0.0.0 — Render 컨테이너 필수
  logger.log(`🚀 BOM 백엔드 실행 중 (${isProd ? 'production' : 'development'}): port ${port}`)
}

bootstrap()
