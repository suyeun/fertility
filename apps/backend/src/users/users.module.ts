import { Module, forwardRef } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { AccountDeletionService } from './account-deletion.service'
import { CommunityModule } from '../community/community.module'

@Module({
  imports: [forwardRef(() => CommunityModule)], // CommunityModule 도 UsersModule 을 가져오므로 순환 참조 처리
  controllers: [UsersController],
  providers: [UsersService, AccountDeletionService],
  exports: [UsersService],
})
export class UsersModule {}
