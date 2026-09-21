/**
 * 임신·출산 지원 안내 데이터 — Firestore config/birthBenefits 문서가 있으면 그 값을,
 * 없거나 형식이 깨졌으면 아래 기본값을 쓴다 (지원금 규칙과 같은 패턴).
 *
 * 금액·요건은 정부·지자체 고시에 따라 바뀌므로 verifiedAt(확인일)을 반드시 갱신하고,
 * 앱은 확인일과 disclaimer 를 화면에 함께 표시한다.
 */

export interface BirthBenefit {
  id: string
  title: string
  amount: string
  when: string
  how: string
  note?: string
  url?: string
  order?: number
}

export interface BirthBenefitsDoc {
  version?: string
  verifiedAt: string // YYYY-MM-DD
  disclaimer: string
  items: BirthBenefit[]
}

export const DEFAULT_BIRTH_BENEFITS: BirthBenefitsDoc = {
  version: 'default-2025-01',
  verifiedAt: '2025-01-01',
  disclaimer:
    '금액과 요건은 정부·지자체 고시에 따라 달라질 수 있어요. 최종 기준은 정부24, 복지로 또는 관할 주민센터·보건소에서 확인하세요.',
  items: [
    {
      id: 'voucher',
      title: '임신·출산 진료비 바우처 (국민행복카드)',
      amount: '단태아 100만 원 · 다태아 태아당 100만 원',
      when: '임신 확인 직후 (분만 예정일 이후 2년까지 사용)',
      how: '카드사 앱·정부24에서 임신확인서로 신청',
      note: '산부인과 진료·약제비, 출산 후 영유아 진료에도 사용 가능',
      url: 'https://www.gov.kr',
      order: 1,
    },
    {
      id: 'first_meeting',
      title: '첫만남이용권',
      amount: '첫째 200만 원 · 둘째 이상 300만 원',
      when: '출생 신고 후 (출생 후 1년 이내 사용)',
      how: '행복출산 원스톱 서비스(정부24) 또는 주민센터',
      note: '산후조리원·육아용품 등 사용',
      url: 'https://www.gov.kr',
      order: 2,
    },
    {
      id: 'parent_pay',
      title: '부모급여',
      amount: '0세 월 100만 원 · 1세 월 50만 원',
      when: '출생 후 60일 이내 신청하면 출생월부터 지급',
      how: '복지로 또는 주민센터',
      note: '어린이집 이용 시 보육료로 전환',
      url: 'https://www.bokjiro.go.kr',
      order: 3,
    },
    {
      id: 'health_center',
      title: '보건소 엽산제·철분제',
      amount: '무료',
      when: '엽산 임신 초기까지 · 철분 16주부터',
      how: '관할 보건소 방문 (임신확인서·신분증)',
      order: 4,
    },
    {
      id: 'postpartum_care',
      title: '산모·신생아 건강관리 지원 (산후도우미)',
      amount: '소득 구간별 본인부담 차등',
      when: '출산 예정 40일 전 ~ 출산 후 30일',
      how: '관할 보건소 또는 복지로',
      order: 5,
    },
    {
      id: 'local',
      title: '지자체 출산장려금',
      amount: '지역별 상이',
      when: '출생 신고 시',
      how: '주민센터 (행복출산 원스톱에서 함께 신청)',
      note: '거주지에 따라 수십만~수백만 원까지 차이',
      order: 6,
    },
  ],
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Firestore 문서 최소 검증 — 깨진 문서면 기본값을 쓴다. */
export function isValidBirthBenefitsDoc(v: unknown): v is BirthBenefitsDoc {
  if (!v || typeof v !== 'object') return false
  const d = v as Record<string, unknown>
  if (typeof d.verifiedAt !== 'string' || !DATE_RE.test(d.verifiedAt)) return false
  if (typeof d.disclaimer !== 'string' || d.disclaimer.length < 10) return false
  if (!Array.isArray(d.items) || d.items.length === 0) return false
  const ids = new Set<string>()
  return d.items.every((it: any) => {
    if (!it || typeof it.id !== 'string' || !it.id || ids.has(it.id)) return false
    ids.add(it.id)
    return ['title', 'amount', 'when', 'how'].every((k) => typeof it[k] === 'string' && it[k].length > 0)
  })
}

/** order 기준 정렬(없으면 입력 순서). */
export function sortBenefits(doc: BirthBenefitsDoc): BirthBenefitsDoc {
  const items = doc.items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => (a.it.order ?? a.i + 1) - (b.it.order ?? b.i + 1))
    .map(({ it }) => it)
  return { ...doc, items }
}
