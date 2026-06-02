// apps/web/app/api/ai/route.ts
// Claude API 프록시 — API 키를 클라이언트에 노출하지 않기 위해 서버에서 처리

import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@fertility/shared'
import type { AIChatMessage } from '@fertility/shared'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const { messages }: { messages: AIChatMessage[] } = await req.json()

    // 스트리밍 응답
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    // ReadableStream으로 변환해서 클라이언트에 스트리밍
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              new TextEncoder().encode(chunk.delta.text)
            )
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('AI API error:', error)
    return Response.json({ error: '일시적인 오류가 발생했어요.' }, { status: 500 })
  }
}
