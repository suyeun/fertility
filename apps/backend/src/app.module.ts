import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
