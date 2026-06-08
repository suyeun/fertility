import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt, detectEmergency } from '@fertility/shared'
import type { UserMode } from '@fertility/shared'
import { Response } from 'express'

// 응급 상황 즉시 안내 메시지 (AI 호출 없이 바로 반환)
const EMERGENCY_RESPONSE = `🚨 **지금 즉시 병원 또는 응급실에 연락하세요.**

말씀하신 증상은 즉각적인 의료 확인이 필요할 수 있습니다.

**바로 연락할 곳:**
- 담당 난임 병원 응급 연락처
- 응급실 (119 또는 가까운 응급실)

저는 AI 정보 서비스이며 의료 판단을 대신할 수 없습니다.
증상이 심각하다면 지체하지 말고 전문 의료진의 도움을 받으세요.`

@Injectable()
export class AiService {
  private client: Anthropic

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: this.config.get('ANTHROPIC_API_KEY') })
  }

  async streamChat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    res: Response,
    userMode: UserMode = 'CLINIC',
  ) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')

    // ── 응급 키워드 감지: AI 호출 전 사전 차단 ──
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
    if (detectEmergency(lastUserMessage)) {
      res.write(EMERGENCY_RESPONSE)
      res.end()
      return
    }

    const stream = await this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: getSystemPrompt(userMode),
      messages,
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(chunk.delta.text)
      }
    }

    res.end()
  }

  async getHistory(uid: string, firebase: any) {
    const doc = await firebase.collection('ai_chats').doc(uid).get()
    return doc.exists ? doc.data().messages || [] : []
  }

  async saveHistory(uid: string, messages: any[], firebase: any) {
    await firebase.collection('ai_chats').doc(uid).set({
      messages,
      updatedAt: new Date().toISOString(),
    })
  }
}
