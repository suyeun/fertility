import { BadRequestException, ForbiddenException, Injectable, Logger, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { FirebaseService } from '../firebase/firebase.service'
import { isPremiumUserData } from '../common/premium'
import { SCAN_RESULT_JSON_SCHEMA, ScanResult, normalizeScanResult } from './schedule-scan.parser'
import { ScanQuota, consumeScan, evaluateScanQuota, readUsage, todayKst } from './scan-quota'

/// 처방전·주사 일정표 사진 → 구조화된 일정 초안.
///
/// 개인정보 원칙: 이미지는 메모리에서 모델 API 로만 전달되고 서버·로그에 저장하지 않는다.
/// 응답은 "초안"이며 앱이 사용자 확인·수정 후에만 일정으로 저장한다(자동 등록 없음).
@Injectable()
export class ScheduleScanService {
  private readonly logger = new Logger(ScheduleScanService.name)
  private readonly client: Anthropic | null

  static readonly MAX_IMAGE_BYTES = 6 * 1024 * 1024 // base64 디코드 기준

  constructor(config: ConfigService, private firebase: FirebaseService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY')
    this.client = apiKey ? new Anthropic({ apiKey }) : null
  }

  /// 현재 사용자의 스캔 잔여 횟수 — 앱이 시트를 열 때 표시한다.
  async getQuota(uid: string): Promise<ScanQuota> {
    const doc = await this.firebase.collection('users').doc(uid).get()
    const data = doc.exists ? doc.data() : undefined
    return evaluateScanQuota(isPremiumUserData(data), readUsage(data), todayKst())
  }

  /// 성공한 스캔을 사용량에 반영한다 (실패·거부는 세지 않는다).
  private async consume(uid: string): Promise<ScanQuota> {
    const ref = this.firebase.collection('users').doc(uid)
    const today = todayKst()
    return this.firebase.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref)
      const data = doc.exists ? doc.data() : undefined
      const premium = isPremiumUserData(data)
      const next = consumeScan(premium, readUsage(data), today)
      tx.set(ref, { scanFreeUsed: next.freeUsed, scanDailyUsed: next.dailyUsed, scanDailyDate: next.dailyDate }, { merge: true })
      return evaluateScanQuota(premium, next, today)
    })
  }

  async scan(params: { uid: string; imageBase64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; referenceDate: string }): Promise<ScanResult & { quota: ScanQuota }> {
    if (!this.client) throw new ServiceUnavailableException('이미지 분석 기능이 아직 설정되지 않았어요')

    // 횟수 정책 — 무료 평생 2회, 프리미엄 하루 20회. 초과 시 403 + 코드로 앱이 페이월/안내를 띄운다.
    const quota = await this.getQuota(params.uid)
    if (!quota.allowed) {
      throw new ForbiddenException({
        statusCode: 403,
        code: quota.isPremium ? 'SCAN_DAILY_LIMIT' : 'SCAN_FREE_LIMIT',
        message: quota.label,
        quota,
      })
    }

    const bytes = Math.floor((params.imageBase64.length * 3) / 4)
    if (bytes > ScheduleScanService.MAX_IMAGE_BYTES) {
      throw new BadRequestException('사진이 너무 커요. 6MB 이하로 줄여서 다시 시도해 주세요.')
    }

    const started = Date.now()
    let response: Anthropic.Message
    try {
      response = await this.client.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 8000,
        // Claude Opus 5.5: thinking 은 항상 켜져 있고 effort 로 깊이를 조절한다 (기본 medium).
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: SCAN_RESULT_JSON_SCHEMA as unknown as Record<string, unknown> },
        },
        system: this.systemPrompt(params.referenceDate),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: params.mediaType, data: params.imageBase64 } },
              { type: 'text', text: '이 사진에서 투약·주사·병원 방문·검사 일정을 모두 추출해 JSON 으로 답해 주세요.' },
            ],
          },
        ],
      } as Anthropic.MessageCreateParamsNonStreaming)
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) throw new ServiceUnavailableException('잠시 요청이 많아요. 1분 뒤 다시 시도해 주세요.')
      if (err instanceof Anthropic.BadRequestError) throw new BadRequestException('이미지를 읽을 수 없어요. 밝은 곳에서 표가 잘 보이게 다시 찍어 주세요.')
      this.logger.error(`scan 호출 실패: ${err instanceof Error ? err.message : err}`)
      throw new ServiceUnavailableException('이미지 분석 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.')
    }

    if (response.stop_reason === 'refusal') {
      throw new UnprocessableEntityException('이 사진은 분석할 수 없어요. 처방전이나 일정표 부분만 다시 찍어 주세요.')
    }

    const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('')
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      this.logger.warn('scan 응답 JSON 파싱 실패')
      throw new UnprocessableEntityException('표를 해석하지 못했어요. 글자가 선명하게 보이도록 다시 찍어 주세요.')
    }

    const result = normalizeScanResult(parsed, params.referenceDate)
    const nextQuota = await this.consume(params.uid).catch((e) => {
      this.logger.warn(`scan 사용량 기록 실패: ${e}`)
      return quota
    })
    // 이미지 내용·약 이름은 로그에 남기지 않는다 — 건 수와 소요 시간만.
    this.logger.log(`scan 완료: items=${result.items.length} warnings=${result.warnings.length} ${Date.now() - started}ms in=${response.usage.input_tokens} out=${response.usage.output_tokens} premium=${quota.isPremium}`)
    return { ...result, quota: nextQuota }
  }

  private systemPrompt(referenceDate: string): string {
    return [
      '당신은 난임 시술 병원의 처방전·주사 일정표 사진을 읽어 구조화된 일정으로 옮기는 보조 도구입니다.',
      '사진에 적힌 내용만 그대로 옮기고, 의학적 판단·추천·용량 변경을 하지 않습니다. 없는 정보는 만들지 말고 null 또는 빈 문자열로 둡니다.',
      '',
      `기준일(오늘 또는 시술 시작일): ${referenceDate}. 표에 연도가 없으면 이 기준일의 연도를 쓰고, "D1, D3" 같은 상대 표기는 기준일을 D1 로 보고 날짜로 환산합니다. 확실하지 않으면 date 를 null 로 두고 warnings 에 적습니다.`,
      '',
      '항목 규칙:',
      '- 투약 1건 = 하나의 약 이름 + 날짜 + 시각. 같은 약을 여러 날·여러 시각 맞으면 날짜·시각별로 각각 항목을 만듭니다.',
      '- kind: 주사=injection, 경구약=oral, 질정=vaginal, 패치=patch, 초음파·진료 방문=visit, 채혈·검사=test, 그 외=other.',
      '- name 은 원문 표기(상품명·약어)를 유지하고, dose 는 단위 포함(예: "150IU", "1정", "200mg").',
      '- time 은 24시간 HH:mm. "오후 8시" → "20:00". 시각이 없으면 null.',
      '- confidence: 글자가 선명하고 표 구조가 명확하면 high, 손글씨·흐림·겹침이 있으면 medium 또는 low.',
      '- 트리거 주사, 채취·이식 당일 금식, 시각 엄수 같은 메모는 notes 에 그대로 옮깁니다.',
      '- warnings 에는 판독이 어려운 부분, 두 가지로 읽힐 수 있는 숫자, 사진에서 잘린 부분을 사용자에게 한국어로 알려 줍니다.',
      '',
      '출력은 주어진 JSON 스키마만 따르고 다른 텍스트를 덧붙이지 않습니다.',
    ].join('\n')
  }
}
