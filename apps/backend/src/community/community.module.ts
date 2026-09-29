import { Module, forwardRef } from '@nestjs/common'
import { CommunityController } from './community.controller'
import { CommunityService } from './community.service'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService], // 계정 삭제 시 작성 글 익명화에 사용
})
export class CommunityModule {}
