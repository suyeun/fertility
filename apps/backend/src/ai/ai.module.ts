import { Module } from '@nestjs/common'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'
import { FirebaseModule } from '../firebase/firebase.module'

// [BIZ-001] FirebaseService를 AiService에 주입하기 위해 FirebaseModule import
// FirebaseModule은 @Global()이지만 명시적으로 import해 의존성을 명확히 합니다
@Module({
  imports: [FirebaseModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
