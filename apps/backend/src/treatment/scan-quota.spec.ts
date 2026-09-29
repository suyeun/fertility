import { consumeScan, evaluateScanQuota, readUsage, todayKst } from './scan-quota'

describe('scan quota', () => {
  const today = '2026-09-29'
  const empty = { freeUsed: 0, dailyUsed: 0, dailyDate: null }

  it('무료: 평생 2회, 3회째 차단', () => {
    let q = evaluateScanQuota(false, empty, today)
    expect(q.allowed).toBe(true)
    expect(q.remaining).toBe(2)
    let u = consumeScan(false, empty, today)
    u = consumeScan(false, u, today)
    q = evaluateScanQuota(false, u, today)
    expect(q.remaining).toBe(0)
    expect(q.allowed).toBe(false)
    expect(q.label).toContain('프리미엄')
  })

  it('프리미엄: 하루 20회, 날짜가 바뀌면 초기화', () => {
    let u = { freeUsed: 2, dailyUsed: 20, dailyDate: '2026-09-28' }
    let q = evaluateScanQuota(true, u, today)
    expect(q.dailyUsed).toBe(0) // 어제 사용분은 오늘 카운트 안 함
    expect(q.remaining).toBe(20)
    u = { ...u, dailyDate: today }
    q = evaluateScanQuota(true, u, today)
    expect(q.allowed).toBe(false)
    expect(q.label).toContain('내일')
  })

  it('프리미엄 사용은 무료 평생 카운트를 올리지 않는다', () => {
    const u = consumeScan(true, { freeUsed: 1, dailyUsed: 3, dailyDate: today }, today)
    expect(u).toEqual({ freeUsed: 1, dailyUsed: 4, dailyDate: today })
  })

  it('무료 체험을 다 쓴 뒤 구독하면 바로 하루 20회가 열린다', () => {
    const q = evaluateScanQuota(true, { freeUsed: 2, dailyUsed: 0, dailyDate: null }, today)
    expect(q.allowed).toBe(true)
    expect(q.remaining).toBe(20)
  })

  it('Firestore 필드가 없거나 깨져도 0으로 읽는다', () => {
    expect(readUsage(undefined)).toEqual(empty)
    expect(readUsage({ scanFreeUsed: 'x', scanDailyUsed: null, scanDailyDate: 3 })).toEqual(empty)
  })

  it('todayKst 는 YYYY-MM-DD', () => {
    expect(todayKst(new Date('2026-09-29T16:30:00Z'))).toBe('2026-09-30') // UTC 16:30 = KST 01:30 다음날
  })
})
