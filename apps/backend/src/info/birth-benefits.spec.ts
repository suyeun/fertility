import { DEFAULT_BIRTH_BENEFITS, isValidBirthBenefitsDoc, sortBenefits } from './birth-benefits'

describe('birth benefits config', () => {
  it('기본값은 검증을 통과하고 확인일·면책이 있다', () => {
    expect(isValidBirthBenefitsDoc(DEFAULT_BIRTH_BENEFITS)).toBe(true)
    expect(DEFAULT_BIRTH_BENEFITS.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(DEFAULT_BIRTH_BENEFITS.items.length).toBeGreaterThanOrEqual(5)
  })

  it.each([
    [null],
    [{}],
    [{ verifiedAt: '2025-1-1', disclaimer: '충분히 긴 면책 문구입니다', items: [{ id: 'a', title: 't', amount: 'a', when: 'w', how: 'h' }] }],
    [{ verifiedAt: '2025-01-01', disclaimer: '짧음', items: [{ id: 'a', title: 't', amount: 'a', when: 'w', how: 'h' }] }],
    [{ verifiedAt: '2025-01-01', disclaimer: '충분히 긴 면책 문구입니다', items: [] }],
    [{ verifiedAt: '2025-01-01', disclaimer: '충분히 긴 면책 문구입니다', items: [{ id: 'a', title: 't', amount: 'a', when: 'w' }] }],
    [{ verifiedAt: '2025-01-01', disclaimer: '충분히 긴 면책 문구입니다', items: [{ id: 'a', title: 't', amount: 'a', when: 'w', how: 'h' }, { id: 'a', title: 't', amount: 'a', when: 'w', how: 'h' }] }],
  ])('깨진 문서는 무효: %j', (doc) => {
    expect(isValidBirthBenefitsDoc(doc)).toBe(false)
  })

  it('order 로 정렬하고, order 가 없으면 입력 순서를 유지한다', () => {
    const doc = {
      verifiedAt: '2025-01-01',
      disclaimer: '충분히 긴 면책 문구입니다',
      items: [
        { id: 'b', title: 't', amount: 'a', when: 'w', how: 'h', order: 2 },
        { id: 'a', title: 't', amount: 'a', when: 'w', how: 'h', order: 1 },
        { id: 'c', title: 't', amount: 'a', when: 'w', how: 'h' },
      ],
    }
    expect(sortBenefits(doc).items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})
