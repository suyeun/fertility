import { Controller, Get, Query } from '@nestjs/common'
import { AppVersionService } from './app-version.service'

@Controller('app')
export class AppVersionController {
  constructor(private readonly appVersionService: AppVersionService) {}

  @Get('version-check')
  async checkVersion(
    @Query('version') version: string,
    @Query('platform') platform: 'ios' | 'android',
  ) {
    return this.appVersionService.checkVersion(version, platform)
  }
}
