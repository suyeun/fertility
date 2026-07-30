import { Module } from '@nestjs/common'
import { SubsidyController } from './subsidy.controller'
import { SubsidyService } from './subsidy.service'
import { FirebaseModule } from '../firebase/firebase.module'

@Module({
  imports: [FirebaseModule],
  controllers: [SubsidyController],
  providers: [SubsidyService],
})
export class SubsidyModule {}
