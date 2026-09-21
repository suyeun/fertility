import { DEFAULT_PROTOCOL_TEMPLATES, isValidTemplateList } from './protocol-templates'

describe('DEFAULT_PROTOCOL_TEMPLATES', () => {
  it('기본 템플릿은 검증을 통과한다', () => {
    expect(isValidTemplateList(DEFAULT_PROTOCOL_TEMPLATES)).toBe(true)
  })

  it('모든 템플릿에 면책 문구가 있고, 약물 이름·용량은 넣지 않는다', () => {
    for (const t of DEFAULT_PROTOCOL_TEMPLATES) {
      expect(t.disclaimer.length).toBeGreaterThan(20)
      for (const s of t.steps) {
        expect(s).not.toHaveProperty('medicationName')
        expect(s).not.toHaveProperty('medicationDose')
      }
    }
  })

  it('offsetFrom 은 같은 템플릿 안의 앞선 단계만 가리킨다', () => {
    for (const t of DEFAULT_PROTOCOL_TEMPLATES) {
      const seen = new Set<string>()
      for (const s of t.steps) {
        if (s.offsetFrom) expect(seen.has(s.offsetFrom)).toBe(true)
        seen.add(s.key)
      }
    }
  })

  it('앱 treatmentMode(ivf/iui)별로 최소 1개씩 있다', () => {
    const modes = new Set(DEFAULT_PROTOCOL_TEMPLATES.map((t) => t.mode))
    expect(modes.has('ivf')).toBe(true)
    expect(modes.has('iui')).toBe(true)
  })
})

describe('isValidTemplateList (Firestore config 문서 검증)', () => {
  const valid = DEFAULT_PROTOCOL_TEMPLATES
  it('빈 배열·비배열은 무효', () => {
    expect(isValidTemplateList([])).toBe(false)
    expect(isValidTemplateList({})).toBe(false)
    expect(isValidTemplateList(null)).toBe(false)
  })
  it('backendType 이 허용 목록 밖이면 무효', () => {
    const broken = JSON.parse(JSON.stringify(valid))
    broken[0].steps[0].backendType = 'IUII'
    expect(isValidTemplateList(broken)).toBe(false)
  })
  it('mode 가 ivf/iui 가 아니면 무효', () => {
    const broken = JSON.parse(JSON.stringify(valid))
    broken[0].mode = 'natural'
    expect(isValidTemplateList(broken)).toBe(false)
  })
})
