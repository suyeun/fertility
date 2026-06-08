import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { CommunityService } from './community.service'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import { UsersService } from '../users/users.service'

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(
    private community: CommunityService,
    private users: UsersService,
  ) {}

  // 일반 게시판
  @Get('posts')
  getPosts(@Query('stage') stage?: string) {
    return this.community.getPosts(stage)
  }

  @Post('posts')
  async createPost(@CurrentUser() user: JwtPayload, @Body() body: any) {
    const profile = await this.users.getProfile(user.sub)
    return this.community.createPost(user.sub, profile?.name || '익명', profile?.treatmentStage || 'natural', body)
  }

  @Post('posts/:id/like')
  likePost(@CurrentUser() user: JwtPayload, @Param('id') postId: string) {
    return this.community.likePost(user.sub, postId)
  }

  @Get('posts/:id/comments')
  getComments(@Param('id') postId: string) {
    return this.community.getComments(postId)
  }

  @Post('posts/:id/comments')
  async addComment(@CurrentUser() user: JwtPayload, @Param('id') postId: string, @Body('content') content: string) {
    const profile = await this.users.getProfile(user.sub)
    return this.community.addComment(user.sub, profile?.name || '익명', postId, content)
  }

  // 비밀 대화방
  @Get('secret')
  getSecretPosts(@Query('tag') tag?: string) {
    return this.community.getSecretPosts(tag)
  }

  @Post('secret')
  async createSecretPost(@CurrentUser() user: JwtPayload, @Body() body: any) {
    const profile = await this.users.getProfile(user.sub)
    const anonymousName = body.anonymousName || profile?.name || '익명의꽃'
    return this.community.createSecretPost(user.sub, anonymousName, body)
  }

  @Post('secret/:id/like')
  likeSecretPost(@CurrentUser() user: JwtPayload, @Param('id') postId: string) {
    return this.community.likeSecretPost(user.sub, postId)
  }

  @Post('secret/:id/react')
  reactSecretPost(
    @CurrentUser() user: JwtPayload,
    @Param('id') postId: string,
    @Body('reaction') reaction: 'cheer' | 'empathy' | 'pray',
  ) {
    return this.community.reactSecretPost(user.sub, postId, reaction)
  }

  @Get('secret/:id/comments')
  getSecretComments(@Param('id') postId: string) {
    return this.community.getSecretComments(postId)
  }

  @Post('secret/:id/comments')
  async addSecretComment(@CurrentUser() user: JwtPayload, @Param('id') postId: string, @Body() body: any) {
    const profile = await this.users.getProfile(user.sub)
    const anonymousName = body.anonymousName || profile?.name || '익명의꽃'
    return this.community.addSecretComment(user.sub, anonymousName, postId, body.content)
  }
}
