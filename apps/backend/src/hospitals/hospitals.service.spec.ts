import { isSponsorshipActive } from './hospitals.service'

describe('isSponsorshipActive (병원 정액 광고 계약)', () => {
  const today = '2026-09-21'
  it('계약 정보가 없거나 비활성이면 false', () => {
    expect(isSponsorshipActive(undefined, today)).toBe(false)
    expect(isSponsorshipActive({ isActive: false, startAt: '2026-01-01', endAt: '2026-12-31' }, today)).toBe(false)
  })
  it('활성 + 기간 안이면 true (종료일 포함)', () => {
    expect(isSponsorshipActive({ isActive: true, startAt: '2026-09-01', endAt: '2026-09-21' }, today)).toBe(true)
  })
  it('활성이라도 기간 밖이면 false', () => {
    expect(isSponsorshipActive({ isActive: true, startAt: '2026-10-01' }, today)).toBe(false)
    expect(isSponsorshipActive({ isActive: true, endAt: '2026-09-20' }, today)).toBe(false)
  })
  it('활성 + 기간 미지정이면 true', () => {
    expect(isSponsorshipActive({ isActive: true }, today)).toBe(true)
  })
})
