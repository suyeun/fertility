import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import * as Joi from 'joi'
import { FirebaseModule } from './firebase/firebase.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { CyclesModule } from './cycles/cycles.module'
import { HormonesModule } from './hormones/hormones.module'
import { TreatmentModule } from './treatment/treatment.module'
import { DiaryModule } from './diary/diary.module'
import { AiModule } from './ai/ai.module'
import { CommunityModule } from './community/community.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PaymentsModule } from './payments/payments.module'
import { AppVersionModule } from './app-version/app-version.module'
import { InfoModule } from './info/info.module'

// [ARCH-004] 필수 환경변수 검증 — 누락 시 서버 시작 즉시 오류 발생
const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // 인증
  JWT_SECRET:     Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // AI
  ANTHROPIC_API_KEY: Joi.string().required(),

  // 결제
  REVENUECAT_WEBHOOK_SECRET: Joi.string().required(),

  // Firebase (JSON 방식 또는 개별 변수 중 하나는 있어야 하므로 optional 처리)
  FIREBASE_SERVICE_ACCOUNT_JSON: Joi.string().optional(),
  FIREBASE_PROJECT_ID:           Joi.string().optional(),
  FIREBASE_CLIENT_EMAIL:         Joi.string().optional(),
  FIREBASE_PRIVATE_KEY:          Joi.string().optional(),

  // 서버
  PORT: Joi.number().default(3001),
  ALLOWED_ORIGINS: Joi.string().optional(),
})

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    // [SEC-007] Rate Limiting — 기본: 60회/분, 세부 제한은 @Throttle() 데코레이터로 오버라이드
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 60 },
    ]),
    FirebaseModule,
    AuthModule,
    UsersModule,
    CyclesModule,
    HormonesModule,
    TreatmentModule,
    DiaryModule,
    AiModule,
    CommunityModule,
    NotificationsModule,
    PaymentsModule,
    AppVersionModule,
    InfoModule,
  ],
  providers: [
    // [SEC-007] ThrottlerGuard를 글로벌로 적용 — 모든 엔드포인트 기본 60회/분 제한
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
