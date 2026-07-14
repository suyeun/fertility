import { Module } from '@nestjs/common'
import { CyclesController } from './cycles.controller'
import { CyclesService } from './cycles.service'
import { CouplesModule } from '../couples/couples.module'

@Module({
  imports: [CouplesModule],
  controllers: [CyclesController],
  providers: [CyclesService],
})
export class CyclesModule {}
