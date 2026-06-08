import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { CommunityService } from './community.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { UsersService } from '../users/users.service'
import { makeAnonName } from '@fertility/shared'
import type { PostCategory, PostTag } from '@fertility/shared'

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(
    private community: CommunityService,
    private users: UsersService,
  ) {}

  // ============================
  // 게시글
  // ============================

  @Get('posts')
  getPosts(
    @Query('category') category?: PostCategory,
    @Query('tag') tag?: PostTag,
    @Query('userMode') userMode?: string,
  ) {
    return this.community.getPosts({ category, tag, userMode })
  }

  @Post('posts')
  async createPost(@CurrentUser() user: JwtPayload, @Body() body: any) {
    const profile = await this.users.getProfile(user.sub)
    const realName = profile?.name || '봄 유저'
    const anonymousName = makeAnonName(user.sub, 'community')
    return this.community.createPost(user.sub, realName, anonymousName, {
      tag: body.tag,
      content: body.content,
    })
  }

  @Post('posts/:id/react')
  reactPost(
    @CurrentUser() user: JwtPayload,
    @Param('id') postId: string,
    @Body('reaction') reaction: 'cheer' | 'empathy' | 'pray',
  ) {
    return this.community.reactPost(user.sub, postId, reaction)
  }

  @Delete('posts/:id')
  deletePost(@CurrentUser() user: JwtPayload, @Param('id') postId: string) {
    return this.community.deletePost(user.sub, postId)
  }

  // ============================
  // 댓글
  // ============================

  @Get('posts/:id/comments')
  getComments(@Param('id') postId: string) {
    return this.community.getComments(postId)
  }

  @Post('posts/:id/comments')
  async addComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') postId: string,
    @Body() body: any,
  ) {
    const profile = await this.users.getProfile(user.sub)
    const realName = profile?.name || '봄 유저'
    const anonymousName = makeAnonName(user.sub, postId)
    return this.community.addComment(user.sub, realName, anonymousName, postId, body.content)
  }
}
