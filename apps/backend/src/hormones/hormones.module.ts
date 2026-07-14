import { Module } from '@nestjs/common'
import { HormonesController } from './hormones.controller'
import { HormonesService } from './hormones.service'
import { CouplesModule } from '../couples/couples.module'

@Module({ imports: [CouplesModule], controllers: [HormonesController], providers: [HormonesService] })
export class HormonesModule {}
