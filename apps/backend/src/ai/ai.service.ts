import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@fertility/shared'
import { Response } from 'express'

@Injectable()
export class AiService {
  private client: Anthropic

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: this.config.get('ANTHROPIC_API_KEY') })
  }

  async streamChat(messages: { role: 'user' | 'assistant'; content: string }[], res: Response) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')

    const stream = await this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
