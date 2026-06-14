import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt, detectEmergency } from '@fertility/shared'
import type { UserMode } from '@fertility/shared'
import { Response } from 'express'
import { FirebaseService } from '../firebase/firebase.service'

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
  private readonly logger = new Logger(AiService.name)
  private client: Anthropic

  constructor(
    private config: ConfigService,
    private firebase: FirebaseService,  // [BIZ-001] 생성자 주입으로 변경
  ) {
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

    // [ERR-001] 스트리밍 에러 핸들링 — try/finally로 res.end() 항상 보장
    try {
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
    } catch (err) {
      this.logger.error('AI 스트리밍 오류:', err)
      res.write('\n\n[일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요.]')
    } finally {
      res.end()  // 에러 발생 여부와 관계없이 항상 응답 종료
    }
  }

  // [PERF-003] 서브컬렉션 구조 — ai_chats/{uid}/messages/{msgId}
  // 기존: 단일 문서에 messages 배열 → Firestore 1MB 제한 초과 위험
  // 변경: 메시지마다 별도 문서 → 무제한 저장 가능
  async getHistory(uid: string) {
    try {
      const snap = await this.firebase.collection('ai_chats')
        .doc(uid)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .limit(100) // 최신 100개 메시지만 로드
        .get()
      return snap.docs.map(d => d.data())
    } catch (err) {
      this.logger.error('AI 히스토리 조회 오류:', err)
      return []
    }
  }

  async saveHistory(uid: string, messages: any[]) {
    try {
      const chatRef = this.firebase.collection('ai_chats').doc(uid)
      const messagesRef = chatRef.collection('messages')

      // Firestore batch로 원자적 일괄 저장
      const batch = this.firebase.db.batch()

      // 기존 메시지 전체 삭제 후 재저장 (히스토리 동기화)
      const existing = await messagesRef.get()
      existing.docs.forEach(doc => batch.delete(doc.ref))

      messages.forEach((msg, index) => {
        const docRef = messagesRef.doc(`msg_${String(index).padStart(6, '0')}`)
        batch.set(docRef, {
          ...msg,
          timestamp: msg.timestamp || new Date().toISOString(),
        })
      })

      // 루트 문서에 메타데이터 업데이트
      batch.set(chatRef, { updatedAt: new Date().toISOString(), messageCount: messages.length }, { merge: true })

      await batch.commit()
    } catch (err) {
      this.logger.error('AI 히스토리 저장 오류:', err)
      // 히스토리 저장 실패는 클라이언트에 노출하지 않음 (부가 기능)
    }
  }
}
