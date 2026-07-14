import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { HospitalsService } from './hospitals.service'
import { CurrentUser, JwtPayload } from '../common/current-user.decorator'
import type { HospitalSuggestPayload } from '@fertility/shared'

@UseGuards(AuthGuard('jwt'))
@Controller()
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  // ── 병원 목록 GET /hospitals ──────────────────────────────
  @Get('hospitals')
  getHospitals(
    @Query('region') region?: string,
    @Query('specialty') specialty?: string,
    @Query('search') search?: string,
  ) {
    return this.hospitalsService.getAll({ region, specialty, search })
  }

  // ── 병원 상세 GET /hospitals/:id ─────────────────────────
  @Get('hospitals/:id')
  getHospital(@Param('id') id: string) {
    return this.hospitalsService.getById(id)
  }

  // ── 병원 등록 요청 POST /hospitals/suggest ───────────────
  @Post('hospitals/suggest')
  @HttpCode(HttpStatus.CREATED)
  suggestHospital(
    @CurrentUser() user: JwtPayload,
    @Body() data: HospitalSuggestPayload,
  ) {
    return this.hospitalsService.suggest(user.sub, data)
  }

  // ── 아티클 목록 GET /articles ─────────────────────────────
  @Get('articles')
  getArticles(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.hospitalsService.getArticles({ category, search })
  }

  // ── 아티클 상세 GET /articles/:id ───────────────────────
  @Get('articles/:id')
  getArticle(@Param('id') id: string) {
    return this.hospitalsService.getArticleById(id)
  }
}
