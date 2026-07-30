import { Module } from '@nestjs/common'
import { DailyNotesController } from './daily-notes.controller'
import { DailyNotesService } from './daily-notes.service'
import { FirebaseModule } from '../firebase/firebase.module'

@Module({
  imports: [FirebaseModule],
  controllers: [DailyNotesController],
  providers: [DailyNotesService],
})
export class DailyNotesModule {}
