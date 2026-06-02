import { Module } from '@nestjs/common'
import { CommunityController } from './community.controller'
import { CommunityService } from './community.service'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [UsersModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
