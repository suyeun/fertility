import { Module } from '@nestjs/common'
import { FirebaseModule } from '../firebase/firebase.module'
import { AdsController } from './ads.controller'
import { AdsService } from './ads.service'

@Module({
  imports: [FirebaseModule],
  controllers: [AdsController],
  providers: [AdsService],
})
export class AdsModule {}
