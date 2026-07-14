import { Module } from '@nestjs/common'
import { TreatmentController } from './treatment.controller'
import { TreatmentService } from './treatment.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { CouplesModule } from '../couples/couples.module'

@Module({
  imports: [NotificationsModule, CouplesModule],
  controllers: [TreatmentController],
  providers: [TreatmentService],
})
export class TreatmentModule {}
