import { Module } from '@nestjs/common'
import { TreatmentController } from './treatment.controller'
import { TreatmentService } from './treatment.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [TreatmentController],
  providers: [TreatmentService],
})
export class TreatmentModule {}
