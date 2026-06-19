import { Module } from '@nestjs/common'
import { InfoController } from './info.controller'
import { InfoService } from './info.service'
import { FirebaseModule } from '../firebase/firebase.module'

@Module({
  imports: [FirebaseModule],
  controllers: [InfoController],
  providers: [InfoService],
})
export class InfoModule {}
