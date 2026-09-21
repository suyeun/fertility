/**
 * 시술 회차 프로토콜 템플릿 — 기준일 하나로 회차 일정 초안을 만들 때 쓰는 "예시" 흐름.
 *
 * 원칙 (의료적 권고로 읽히지 않도록):
 * - 모든 템플릿은 disclaimer 를 갖고, 앱은 초안을 "예시 일정" 으로 표시한 뒤 사용자가 날짜·시간을
 *   전부 확인·수정한 후에만 저장한다.
 * - 약물 이름·용량은 템플릿에 넣지 않는다. 투약 시각 슬롯(medicationTimes)만 두고 이름·용량은 사용자가 채운다.
 * - 병원마다 요법(장기·단기·길항제 등)이 다르므로 일수(offsetDays)는 대표적인 범위의 중간값이다.
 *
 * Firestore config/treatmentTemplates 문서가 있으면 그 값을 우선 사용한다 (앱 배포 없이 갱신).
 */

export type ProtocolChip =
  | 'injection' | 'monitoring' | 'bloodtest' | 'retrieval' | 'transfer' | 'iui' | 'other'
export type ProtocolBackendType = 'IVF' | 'IUI' | 'FET' | 'monitoring' | 'other'

export interface ProtocolStep {
  key: string
  title: string
  chipValue: ProtocolChip
  backendType: ProtocolBackendType
  /** 기준일(또는 offsetFrom 단계)로부터의 일수 */
  offsetDays: number
  /** 다른 단계 key 를 기준으로 계산할 때 (예: 이식 = 채취 + 3~5일) */
  offsetFrom?: string
  hour: string // 'HH:mm'
  /** 이 단계부터 매일 투약이 시작되는 경우의 알림 시각. 이름·용량은 사용자 입력. */
  medicationTimes?: string[]
  /** 투약 일수 (medicationTimes 가 있을 때). 없으면 다음 병원 방문 단계까지. */
  medicationDays?: number
  note?: string
}

export interface ProtocolTemplate {
  id: string
  /** 앱 treatmentMode: 'ivf' | 'iui' | 'pregnant'(산전 검사) */
  mode: 'ivf' | 'iui' | 'pregnant'
  label: string
  anchorLabel: string
  description: string
  disclaimer: string
  steps: ProtocolStep[]
}

const COMMON_DISCLAIMER =
  '이 일정은 일반적인 흐름을 참고용으로 배치한 예시입니다. 실제 검사·투약·시술 날짜는 담당 의료진의 안내를 따르고, 저장 전 모든 날짜와 시간을 병원 일정표에 맞춰 수정해주세요.'

export const DEFAULT_PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  {
    id: 'ivf_fresh_standard',
    mode: 'ivf',
    label: '시험관 · 신선배아 이식',
    anchorLabel: '과배란 유도 주사 시작일',
    description: '주사 시작 → 난포 모니터링 2회 → 트리거 → 채취 → 이식 → 판정',
    disclaimer: COMMON_DISCLAIMER,
    steps: [
      { key: 'stim_start', title: '과배란 유도 주사 시작', chipValue: 'injection', backendType: 'other', offsetDays: 0, hour: '20:00', medicationTimes: ['20:00'], medicationDays: 10, note: '주사 이름·용량은 병원 처방대로 입력' },
      { key: 'mon1', title: '난포 모니터링 (초음파·채혈)', chipValue: 'monitoring', backendType: 'monitoring', offsetDays: 5, hour: '09:00' },
      { key: 'mon2', title: '난포 모니터링 (초음파·채혈)', chipValue: 'monitoring', backendType: 'monitoring', offsetDays: 8, hour: '09:00' },
      { key: 'trigger', title: '트리거 주사', chipValue: 'injection', backendType: 'other', offsetDays: 10, hour: '21:00', note: '보통 채취 34~36시간 전, 시각을 정확히 지켜야 해요' },
      { key: 'retrieval', title: '난자 채취', chipValue: 'retrieval', backendType: 'IVF', offsetDays: 12, hour: '08:00' },
      { key: 'transfer', title: '배아 이식', chipValue: 'transfer', backendType: 'FET', offsetDays: 3, offsetFrom: 'retrieval', hour: '10:00', medicationTimes: ['09:00', '21:00'], medicationDays: 14, note: '이식 후 황체 보강 약물은 병원 처방대로' },
      { key: 'beta', title: '임신 판정 (혈액검사)', chipValue: 'bloodtest', backendType: 'monitoring', offsetDays: 11, offsetFrom: 'transfer', hour: '09:00' },
    ],
  },
  {
    id: 'fet_hormone_standard',
    mode: 'ivf',
    label: '동결배아 이식 (호르몬 주기)',
    anchorLabel: '생리 시작일',
    description: '에스트로겐 시작 → 내막 확인 → 프로게스테론 시작 → 이식 → 판정',
    disclaimer: COMMON_DISCLAIMER,
    steps: [
      { key: 'baseline', title: '기저 초음파', chipValue: 'monitoring', backendType: 'monitoring', offsetDays: 2, hour: '09:00' },
      { key: 'estrogen', title: '에스트로겐 투약 시작', chipValue: 'injection', backendType: 'other', offsetDays: 2, hour: '09:00', medicationTimes: ['09:00', '21:00'], medicationDays: 12, note: '경구·패치 등 병원 처방대로 입력' },
      { key: 'lining', title: '내막 확인 (초음파·채혈)', chipValue: 'monitoring', backendType: 'monitoring', offsetDays: 12, hour: '09:00' },
      { key: 'progesterone', title: '프로게스테론 투약 시작', chipValue: 'injection', backendType: 'other', offsetDays: 14, hour: '21:00', medicationTimes: ['09:00', '21:00'], medicationDays: 16 },
      { key: 'transfer', title: '동결배아 이식', chipValue: 'transfer', backendType: 'FET', offsetDays: 5, offsetFrom: 'progesterone', hour: '10:00' },
      { key: 'beta', title: '임신 판정 (혈액검사)', chipValue: 'bloodtest', backendType: 'monitoring', offsetDays: 10, offsetFrom: 'transfer', hour: '09:00' },
    ],
  },
  {
    id: 'iui_standard',
    mode: 'iui',
    label: '인공수정 (배란 유도)',
    anchorLabel: '생리 시작일',
    description: '배란 유도 시작 → 난포 확인 → 트리거 → 인공수정 → 판정',
    disclaimer: COMMON_DISCLAIMER,
    steps: [
      { key: 'baseline', title: '기저 초음파 · 배란 유도 시작', chipValue: 'monitoring', backendType: 'monitoring', offsetDays: 2, hour: '09:00', medicationTimes: ['21:00'], medicationDays: 5, note: '경구약 또는 주사, 병원 처방대로 입력' },
      { key: 'mon1', title: '난포 확인 (초음파)', chipValue: 'monitoring', backendType: 'monitoring', offsetDays: 9, hour: '09:00' },
      { key: 'trigger', title: '트리거 주사', chipValue: 'injection', backendType: 'other', offsetDays: 11, hour: '21:00', note: '보통 시술 34~36시간 전' },
      { key: 'iui', title: '인공수정 시술', chipValue: 'iui', backendType: 'IUI', offsetDays: 13, hour: '10:00' },
      { key: 'beta', title: '임신 판정 (혈액검사)', chipValue: 'bloodtest', backendType: 'monitoring', offsetDays: 14, offsetFrom: 'iui', hour: '09:00' },
    ],
  },
  {
    id: 'prenatal_standard',
    mode: 'pregnant',
    label: '산전 검사 (임신 확인 후)',
    anchorLabel: '마지막 생리 시작일 (또는 이식일 환산 기준일)',
    description: '초기 초음파 → 1·2차 기형아 선별 → 정밀 초음파 → 임신성 당뇨 → 후기 진찰',
    disclaimer:
      '산전 검사 시기는 일반적인 권장 범위를 참고용으로 배치한 예시입니다. 병원·개인 상황에 따라 항목과 시기가 달라지므로, 저장 전 담당 의료진의 안내에 맞춰 모든 날짜를 확인·수정해주세요.',
    steps: [
      { key: 'us_early', title: '초기 초음파 (태낭·심박 확인)', chipValue: 'monitoring', backendType: 'monitoring', offsetDays: 7 * 7, hour: '10:00' },
      { key: 'screen1', title: '1차 기형아 선별 (NT 초음파·혈액)', chipValue: 'bloodtest', backendType: 'monitoring', offsetDays: 12 * 7, hour: '10:00', note: '보통 11~13주 사이, NIPT 여부는 의료진과 상담' },
      { key: 'screen2', title: '2차 기형아 선별 (혈액)', chipValue: 'bloodtest', backendType: 'monitoring', offsetDays: 16 * 7 + 3, hour: '10:00' },
      { key: 'us_detail', title: '정밀 초음파', chipValue: 'monitoring', backendType: 'monitoring', offsetDays: 21 * 7, hour: '10:00' },
      { key: 'gdm', title: '임신성 당뇨·빈혈 검사', chipValue: 'bloodtest', backendType: 'monitoring', offsetDays: 26 * 7, hour: '09:00', note: '공복 여부는 병원 안내 확인' },
      { key: 'visit28', title: '산전 진찰 (28주)', chipValue: 'other', backendType: 'other', offsetDays: 28 * 7, hour: '10:00', note: 'Rh 음성이면 면역글로불린 상담' },
      { key: 'us_growth', title: '초음파 · 태아 성장 확인', chipValue: 'monitoring', backendType: 'monitoring', offsetDays: 33 * 7, hour: '10:00' },
      { key: 'gbs', title: 'GBS 검사', chipValue: 'bloodtest', backendType: 'monitoring', offsetDays: 36 * 7, hour: '10:00' },
      { key: 'visit37', title: '산전 진찰 (37주, 이후 주 1회)', chipValue: 'other', backendType: 'other', offsetDays: 37 * 7, hour: '10:00' },
    ],
  },
]

/** Firestore 문서 값이 형식에 맞는지 최소 검증 — 깨진 문서면 기본값을 쓴다. */
export function isValidTemplateList(v: unknown): v is ProtocolTemplate[] {
  if (!Array.isArray(v) || v.length === 0) return false
  return v.every((t: any) =>
    t && typeof t.id === 'string' && ['ivf', 'iui', 'pregnant'].includes(t.mode) &&
    typeof t.label === 'string' && typeof t.disclaimer === 'string' &&
    Array.isArray(t.steps) && t.steps.length > 0 &&
    t.steps.every((s: any) => s && typeof s.key === 'string' && typeof s.title === 'string' &&
      typeof s.offsetDays === 'number' && typeof s.hour === 'string' &&
      ['IVF', 'IUI', 'FET', 'monitoring', 'other'].includes(s.backendType)),
  )
}
