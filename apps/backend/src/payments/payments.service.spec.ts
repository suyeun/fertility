import { PaymentsService, describeCancelReason, shouldIgnoreSandboxEvent } from './payments.service'

describe('shouldIgnoreSandboxEvent', () => {
  it.each([
    ['SANDBOX', 'production', undefined, true],
    ['SANDBOX', 'production', 'false', true],
    ['SANDBOX', 'production', 'true', false],
    ['SANDBOX', 'development', undefined, false],
    ['PRODUCTION', 'production', undefined, false],
    [undefined, 'production', undefined, false],
  ])('environment=%s nodeEnv=%s allow=%s → %s', (env, node, allow, expected) => {
    expect(shouldIgnoreSandboxEvent(env, node, allow)).toBe(expected)
  })
})

describe('describeCancelReason', () => {
  it('고객 지원 환불만 isRefund=true', () => {
    expect(describeCancelReason('CUSTOMER_SUPPORT')).toEqual({ label: '고객 지원 환불', isRefund: true })
    expect(describeCancelReason('UNSUBSCRIBE').isRefund).toBe(false)
    expect(describeCancelReason('BILLING_ERROR').isRefund).toBe(false)
    expect(describeCancelReason(undefined).label).toBe('사유 미상')
    expect(describeCancelReason('SOMETHING_NEW').label).toBe('SOMETHING_NEW')
  })
})

describe('PaymentsService.handleRevenueCatEvent', () => {
  const set = jest.fn().mockResolvedValue(undefined)
  const firebase = {
    collection: jest.fn(() => ({ doc: jest.fn(() => ({ set })) })),
  }
  const service = new PaymentsService(firebase as any)
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  const event = (overrides: Record<string, unknown>) => ({
    event: { app_user_id: 'uid-1', product_id: 'bom_monthly', environment: 'PRODUCTION', ...overrides },
  })

  it('event 가 없으면 received:false', async () => {
    await expect(service.handleRevenueCatEvent({})).resolves.toEqual({ received: false })
    expect(set).not.toHaveBeenCalled()
  })

  it('TEST 이벤트는 문서를 건드리지 않고 ignored:test', async () => {
    const res = await service.handleRevenueCatEvent(event({ type: 'TEST' }))
    expect(res).toEqual({ received: true, ignored: 'test' })
    expect(set).not.toHaveBeenCalled()
  })

  it('운영에서 SANDBOX 이벤트는 무시한다', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.REVENUECAT_ALLOW_SANDBOX
    const res = await service.handleRevenueCatEvent(event({ type: 'INITIAL_PURCHASE', environment: 'SANDBOX' }))
    expect(res).toEqual({ received: true, ignored: 'sandbox' })
    expect(set).not.toHaveBeenCalled()
  })

  it('app_user_id 가 없으면 ignored:no_user', async () => {
    const res = await service.handleRevenueCatEvent(event({ type: 'INITIAL_PURCHASE', app_user_id: undefined }))
    expect(res).toEqual({ received: true, ignored: 'no_user' })
    expect(set).not.toHaveBeenCalled()
  })

  it('INITIAL_PURCHASE → active + 만료일 기록', async () => {
    const res = await service.handleRevenueCatEvent(
      event({ type: 'INITIAL_PURCHASE', expiration_at_ms: Date.UTC(2027, 0, 1) }),
    )
    expect(res).toEqual({ received: true })
    expect(firebase.collection).toHaveBeenCalledWith('users')
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: 'active',
        subscriptionExpiresAt: '2027-01-01T00:00:00.000Z',
        subscriptionProductId: 'bom_monthly',
      }),
      { merge: true },
    )
  })

  it('CANCELLATION(사용자 해지) → cancelled, 만료일 유지, 환불 아님', async () => {
    await service.handleRevenueCatEvent(
      event({ type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE', expiration_at_ms: Date.UTC(2027, 0, 1) }),
    )
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: 'cancelled',
        subscriptionExpiresAt: '2027-01-01T00:00:00.000Z',
        subscriptionCancelReason: 'UNSUBSCRIBE',
        subscriptionRefunded: false,
      }),
      { merge: true },
    )
  })

  it('CANCELLATION(고객 지원 환불) → 환불 플래그 기록', async () => {
    await service.handleRevenueCatEvent(
      event({ type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT', expiration_at_ms: Date.UTC(2026, 8, 21) }),
    )
    const [data] = set.mock.calls[0]
    expect(data.subscriptionRefunded).toBe(true)
    expect(data.subscriptionCancelReason).toBe('CUSTOMER_SUPPORT')
    expect(data.subscriptionCancelledAt).toBeDefined()
  })

  it('재구매(INITIAL_PURCHASE) 시 이전 취소 사유를 지운다', async () => {
    await service.handleRevenueCatEvent(event({ type: 'INITIAL_PURCHASE', expiration_at_ms: Date.UTC(2027, 0, 1) }))
    const [data] = set.mock.calls[0]
    expect(data.subscriptionCancelReason).toBeNull()
    expect(data.subscriptionRefunded).toBe(false)
  })

  it('EXPIRATION → cancelled, 만료일 필드는 쓰지 않음, 만료 사유 기록', async () => {
    await service.handleRevenueCatEvent(event({ type: 'EXPIRATION', expiration_reason: 'UNSUBSCRIBE' }))
    const [data] = set.mock.calls[0]
    expect(data.subscriptionStatus).toBe('cancelled')
    expect(data).not.toHaveProperty('subscriptionExpiresAt')
    expect(data.subscriptionCancelReason).toBe('UNSUBSCRIBE')
  })

  it('BILLING_ISSUE → 결제 실패 사유 기록', async () => {
    await service.handleRevenueCatEvent(event({ type: 'BILLING_ISSUE' }))
    const [data] = set.mock.calls[0]
    expect(data.subscriptionCancelReason).toBe('BILLING_ERROR')
    expect(data.subscriptionRefunded).toBe(false)
  })

  it('알 수 없는 이벤트 타입은 로그만 남기고 문서를 건드리지 않음', async () => {
    const res = await service.handleRevenueCatEvent(event({ type: 'PRODUCT_CHANGE' }))
    expect(res).toEqual({ received: true })
    expect(set).not.toHaveBeenCalled()
  })
})
