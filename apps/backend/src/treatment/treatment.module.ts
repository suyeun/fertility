import { Module } from '@nestjs/common'
import { TreatmentController } from './treatment.controller'
import { TreatmentService } from './treatment.service'
import { ScheduleScanService } from './schedule-scan.service'
import { FirebaseModule } from '../firebase/firebase.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { CouplesModule } from '../couples/couples.module'

@Module({
  imports: [FirebaseModule, NotificationsModule, CouplesModule],
  controllers: [TreatmentController],
  providers: [TreatmentService, ScheduleScanService],
})
export class TreatmentModule {}
