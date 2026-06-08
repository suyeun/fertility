import { Module } from '@nestjs/common'
import { AppVersionController } from './app-version.controller'
import { AppVersionService } from './app-version.service'
import { FirebaseModule } from '../firebase/firebase.module'

@Module({
  imports: [FirebaseModule],
  controllers: [AppVersionController],
  providers: [AppVersionService],
})
export class AppVersionModule {}
