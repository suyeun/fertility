import { isWithinPeriod } from './banners.service'

describe('isWithinPeriod (배너 게재 기간)', () => {
  const today = '2026-09-21'
  it('기간이 비어 있으면 상시 노출', () => {
    expect(isWithinPeriod(undefined, undefined, today)).toBe(true)
  })
  it('시작일 전이면 미노출', () => {
    expect(isWithinPeriod('2026-09-22', undefined, today)).toBe(false)
  })
  it('종료일은 포함', () => {
    expect(isWithinPeriod('2026-09-01', '2026-09-21', today)).toBe(true)
    expect(isWithinPeriod('2026-09-01', '2026-09-20', today)).toBe(false)
  })
})
