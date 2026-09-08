import { Module } from '@nestjs/common'
import { BannersController } from './banners.controller'
import { BannersService } from './banners.service'
import { FirebaseModule } from '../firebase/firebase.module'

@Module({
  imports: [FirebaseModule],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
