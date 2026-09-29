import { normalizeDate, normalizeScanResult, normalizeTime } from './schedule-scan.parser'

describe('normalizeTime', () => {
  it.each([
    ['20:15', '20:15'], ['8:05', '08:05'], ['8:15 PM', '20:15'], ['12:30 am', '00:30'],
    ['오후 8시 15분', '20:15'], ['오후 8시', '20:00'], ['오전 9시', '09:00'], ['오후 12시', '12:00'],
    ['21시', '21:00'], ['21시 30분', '21:30'], ['', null], ['내일', null], ['25:00', null], [null, null],
  ])('%s → %s', (input, expected) => {
    expect(normalizeTime(input)).toBe(expected)
  })
})

describe('normalizeDate', () => {
  it.each([
    ['2026-03-05', '2026-03-05'], ['2026.3.5', '2026-03-05'], ['2026/03/05', '2026-03-05'],
    ['3/5', '2026-03-05'], ['3.5', '2026-03-05'], ['2026-02-30', null], ['D3', null], [null, null],
  ])('%s → %s', (input, expected) => {
    expect(normalizeDate(input, 2026)).toBe(expected)
  })
})

describe('normalizeScanResult', () => {
  const ref = '2026-03-01'

  it('정상 항목을 표준화하고 종류·확신도를 보정한다', () => {
    const r = normalizeScanResult({
      detectedReferenceDate: '2026.3.1',
      warnings: ['  손글씨 흐림 '],
      items: [
        { date: '3/2', time: '오후 8시', kind: 'injection', name: ' 고날에프 ', dose: '150IU', notes: '', confidence: 'high' },
        { date: null, time: '21:00', kind: 'unknown-kind', name: '크리논', dose: '', notes: '', confidence: 'weird' },
      ],
    }, ref)
    expect(r.detectedReferenceDate).toBe('2026-03-01')
    expect(r.items).toHaveLength(2)
    expect(r.items[0]).toMatchObject({ date: '2026-03-02', time: '20:00', kind: 'injection', name: '고날에프', dose: '150IU', confidence: 'high' })
    expect(r.items[1]).toMatchObject({ date: null, time: '21:00', kind: 'other', confidence: 'medium' })
    expect(r.warnings).toContain('손글씨 흐림')
  })

  it('이름 없는 항목은 버리고 경고를 추가한다', () => {
    const r = normalizeScanResult({ items: [{ name: '', kind: 'oral' }, { name: '두파스톤', kind: 'oral', confidence: 'low' }], warnings: [] }, ref)
    expect(r.items).toHaveLength(1)
    expect(r.warnings.some((w) => w.includes('제외'))).toBe(true)
    expect(r.warnings.some((w) => w.includes('확신이 낮은'))).toBe(true)
  })

  it('깨진 입력은 빈 결과', () => {
    expect(normalizeScanResult(null, ref).items).toEqual([])
    expect(normalizeScanResult('x', ref).items).toEqual([])
  })

  it('항목은 60개로 제한한다', () => {
    const items = Array.from({ length: 80 }, (_, i) => ({ name: `약${i}`, kind: 'oral', confidence: 'high' }))
    expect(normalizeScanResult({ items, warnings: [] }, ref).items).toHaveLength(60)
  })
})
