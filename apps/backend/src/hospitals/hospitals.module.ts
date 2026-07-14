import { Module } from '@nestjs/common'
import { HospitalsController } from './hospitals.controller'
import { HospitalsService } from './hospitals.service'
import { FirebaseModule } from '../firebase/firebase.module'

@Module({
  imports: [FirebaseModule],
  controllers: [HospitalsController],
  providers: [HospitalsService],
})
export class HospitalsModule {}
