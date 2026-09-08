import { Controller, Get, Query } from '@nestjs/common'
import { BannersService } from './banners.service'

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async getBanners(@Query('position') position?: string) {
    return this.bannersService.getActive(position || 'home')
  }
}
