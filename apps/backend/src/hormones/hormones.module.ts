import { Module } from '@nestjs/common'
import { HormonesController } from './hormones.controller'
import { HormonesService } from './hormones.service'

@Module({ controllers: [HormonesController], providers: [HormonesService] })
export class HormonesModule {}
