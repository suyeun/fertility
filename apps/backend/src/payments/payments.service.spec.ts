import { PaymentsService, shouldIgnoreSandboxEvent } from './payments.service'

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

  it('CANCELLATION → cancelled 이지만 만료일은 유지', async () => {
    await service.handleRevenueCatEvent(event({ type: 'CANCELLATION', expiration_at_ms: Date.UTC(2027, 0, 1) }))
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: 'cancelled', subscriptionExpiresAt: '2027-01-01T00:00:00.000Z' }),
      { merge: true },
    )
  })

  it('EXPIRATION → cancelled, 만료일 필드는 쓰지 않음', async () => {
    await service.handleRevenueCatEvent(event({ type: 'EXPIRATION' }))
    const [data] = set.mock.calls[0]
    expect(data.subscriptionStatus).toBe('cancelled')
    expect(data).not.toHaveProperty('subscriptionExpiresAt')
  })

  it('알 수 없는 이벤트 타입은 로그만 남기고 문서를 건드리지 않음', async () => {
    const res = await service.handleRevenueCatEvent(event({ type: 'PRODUCT_CHANGE' }))
    expect(res).toEqual({ received: true })
    expect(set).not.toHaveBeenCalled()
  })
})
