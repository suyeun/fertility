/**
 * 처방전·주사 일정표 인식 결과의 정규화 — 모델 출력(JSON)을 검증하고 앱이 쓰는 형태로 다듬는다.
 * 순수 함수라 Jest 로 검증한다. 모델 호출은 schedule-scan.service.ts.
 */

export type ScanItemKind = 'injection' | 'oral' | 'vaginal' | 'patch' | 'visit' | 'test' | 'other'
export type ScanConfidence = 'high' | 'medium' | 'low'

export interface ScanItem {
  date: string | null      // YYYY-MM-DD — 표에 날짜가 없으면 null (앱이 기준일로 채움)
  time: string | null      // HH:mm
  kind: ScanItemKind
  name: string             // 약 이름 또는 일정 제목 (원문 표기 유지)
  dose: string             // 용량·단위 (없으면 '')
  notes: string            // 표의 비고·주의 (없으면 '')
  confidence: ScanConfidence
}

export interface ScanResult {
  items: ScanItem[]
  warnings: string[]       // 판독 불확실·겹침 등 사용자에게 보여줄 경고
  detectedReferenceDate: string | null // 표에서 읽은 시작일(있으면)
}

export const SCAN_RESULT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'warnings', 'detectedReferenceDate'],
  properties: {
    detectedReferenceDate: { type: ['string', 'null'], description: 'YYYY-MM-DD 또는 null' },
    warnings: { type: 'array', items: { type: 'string' } },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'time', 'kind', 'name', 'dose', 'notes', 'confidence'],
        properties: {
          date: { type: ['string', 'null'] },
          time: { type: ['string', 'null'] },
          kind: { type: 'string', enum: ['injection', 'oral', 'vaginal', 'patch', 'visit', 'test', 'other'] },
          name: { type: 'string' },
          dose: { type: 'string' },
          notes: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
} as const

const KINDS: ScanItemKind[] = ['injection', 'oral', 'vaginal', 'patch', 'visit', 'test', 'other']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** '20:15', '8:15 PM', '오후 8시 15분', '20시' 등을 HH:mm 로. 실패하면 null. */
export function normalizeTime(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null
  let m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (m) return clampTime(+m[1], +m[2])
  m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/)
  if (m) return clampTime(to24(+m[1], m[3]), +m[2])
  m = s.match(/^(오전|오후)\s*(\d{1,2})(?::(\d{2})|시\s*(\d{1,2})?분?)?/)
  if (m) {
    const h = +m[2] + (m[1] === '오후' && +m[2] < 12 ? 12 : 0)
    const min = m[3] ? +m[3] : m[4] ? +m[4] : 0
    return clampTime(h, min)
  }
  m = s.match(/^(\d{1,2})시\s*(\d{1,2})?분?$/)
  if (m) return clampTime(+m[1], m[2] ? +m[2] : 0)
  return null
}

function to24(h: number, ampm: string): number {
  const pm = ampm.toLowerCase() === 'pm'
  if (pm && h < 12) return h + 12
  if (!pm && h === 12) return 0
  return h
}

function clampTime(h: number, m: number): string | null {
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 'YYYY-MM-DD' 만 통과. 'YYYY.MM.DD', 'YYYY/MM/DD', 'M/D'(기준 연도 사용) 도 변환. */
export function normalizeDate(raw: unknown, referenceYear: number): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (DATE_RE.test(s)) return isValidDate(s) ? s : null
  let m = s.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/)
  if (m) return isValidDate(`${m[1]}-${pad(m[2])}-${pad(m[3])}`) ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : null
  m = s.match(/^(\d{1,2})[./](\d{1,2})$/)
  if (m) {
    const d = `${referenceYear}-${pad(m[1])}-${pad(m[2])}`
    return isValidDate(d) ? d : null
  }
  return null
}

const pad = (v: string) => v.padStart(2, '0')
function isValidDate(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso
}

/**
 * 모델 출력을 검증·정규화한다. 이름이 비어 있는 항목은 버리고, 시각·날짜는 표준 형식으로,
 * 알 수 없는 종류는 other 로. 항목 수는 60개로 제한한다(사진 한 장 기준 충분).
 */
export function normalizeScanResult(raw: unknown, referenceDate: string): ScanResult {
  const referenceYear = Number(referenceDate.slice(0, 4)) || new Date().getFullYear()
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const warnings = Array.isArray(obj.warnings)
    ? (obj.warnings as unknown[]).filter((w): w is string => typeof w === 'string' && w.trim().length > 0).map((w) => w.trim()).slice(0, 10)
    : []

  const items: ScanItem[] = []
  let dropped = 0
  for (const it of Array.isArray(obj.items) ? (obj.items as unknown[]) : []) {
    if (!it || typeof it !== 'object') { dropped++; continue }
    const r = it as Record<string, unknown>
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 80) : ''
    if (!name) { dropped++; continue }
    const kind = KINDS.includes(r.kind as ScanItemKind) ? (r.kind as ScanItemKind) : 'other'
    const confidence: ScanConfidence = r.confidence === 'high' || r.confidence === 'low' ? r.confidence : 'medium'
    items.push({
      date: normalizeDate(r.date, referenceYear),
      time: normalizeTime(r.time),
      kind,
      name,
      dose: typeof r.dose === 'string' ? r.dose.trim().slice(0, 60) : '',
      notes: typeof r.notes === 'string' ? r.notes.trim().slice(0, 200) : '',
      confidence,
    })
    if (items.length >= 60) break
  }
  if (dropped > 0) warnings.push(`읽지 못한 항목 ${dropped}개는 제외했어요. 원본과 비교해 주세요.`)
  if (items.some((i) => i.confidence === 'low')) warnings.push('확신이 낮은 항목이 있어요. 시각과 용량을 꼭 확인해 주세요.')

  return {
    items,
    warnings: Array.from(new Set(warnings)),
    detectedReferenceDate: normalizeDate(obj.detectedReferenceDate, referenceYear),
  }
}
