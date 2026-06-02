// apps/web/app/api/payments/route.ts
import { NextResponse } from 'next/server'
// 결제 웹훅은 백엔드(NestJS)로 이전 예정 — 현재는 시뮬레이션 유지

// 토스페이먼츠 결제 성공 웹훅 처리 핸들러 (모의/시뮬레이션 구현)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // 토스페이먼츠 웹훅 페이로드 규격 예시
    // {
    //   "eventType": "PAYMENT_STATUS_CHANGED",
    //   "data": {
    //     "paymentKey": "xxx",
    //     "orderId": "order_xxx_userId123", // 주문 번호 내에 userId를 융합해서 식별자로 사용 가능
    //     "status": "DONE",
    //     "amount": 9900
    //   }
    // }
    
    const { eventType, data } = body

    if (eventType === 'PAYMENT_STATUS_CHANGED' && data?.status === 'DONE') {
      const orderId: string = data.orderId || ''
      
      // orderId에서 userId 파싱 (예: order_123456789_mock_uid_1234)
      const parts = orderId.split('_')
      const userId = parts[parts.length - 1] // 마지막 파트가 유저 UID라고 가정

      if (userId) {
        console.log(`[Payment Webhook] 결제 완료 감지! 유저 구독 전환: ${userId}`)
        
        // TODO: 백엔드 NestJS API로 구독 상태 업데이트 요청
        // await fetch(`${process.env.API_URL}/api/users/subscription`, { method: 'PATCH', body: JSON.stringify({ userId, status: 'active' }) })
        console.log(`[Payment Webhook] 구독 업데이트 필요: ${userId}`)

        return NextResponse.json({ success: true, message: '구독 처리가 완료되었습니다.' }, { status: 200 })
      }
    }

    return NextResponse.json({ success: false, message: '유효하지 않은 이벤트 혹은 유저 정보입니다.' }, { status: 400 })
  } catch (error: any) {
    console.error('[Payment Webhook Error]:', error)
    return NextResponse.json({ error: error.message || '내부 서버 오류' }, { status: 500 })
  }
}
