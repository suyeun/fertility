import { Module } from '@nestjs/common'
import { CouplesController } from './couples.controller'
import { CouplesService } from './couples.service'
import { FirebaseModule } from '../firebase/firebase.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [FirebaseModule, NotificationsModule],
  controllers: [CouplesController],
  providers: [CouplesService],
  exports: [CouplesService], // TreatmentService 등에서 주입 가능하도록
})
export class CouplesModule {}
