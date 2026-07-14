import { Module } from '@nestjs/common'
import { DiaryController } from './diary.controller'
import { DiaryService } from './diary.service'
import { CouplesModule } from '../couples/couples.module'

@Module({ imports: [CouplesModule], controllers: [DiaryController], providers: [DiaryService] })
export class DiaryModule {}
