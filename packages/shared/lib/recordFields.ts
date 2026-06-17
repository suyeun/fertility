import type { TreatmentMode, CurrentStage } from '../types'

// ── 탭 구성 ────────────────────────────────────────────────
export interface RecordTab {
  key: string
  label: string
}

export function getRecordTabs(mode: TreatmentMode): RecordTab[] {
  if (mode === 'natural') {
    return [
      { key: 'daily',  label: '일반 기록' },
      { key: 'diary',  label: '감정·증상' },
    ]
  }
  return [
    { key: 'daily',     label: '일반 기록' },
    { key: 'hospital',  label: '병원 수치' },
    { key: 'procedure', label: '시술 지표' },
    { key: 'diary',     label: '감정·증상' },
  ]
}

// ── 병원 수치 탭 — 단계별 활성 필드 ───────────────────────
export interface FieldConfig {
  key: string
  label: string
  unit: string
  placeholder?: string
  type?: 'number' | 'select' | 'multiselect' | 'slider'
  options?: { value: string; label: string }[]
  warning?: (value: string | number) => string | null
}

const IUI_HOSPITAL_FIELDS: Record<string, FieldConfig[]> = {
  stimulation: [
    { key: 'estradiol',    label: 'E2 에스트라디올',   unit: 'pg/mL' },
    { key: 'follicleSize', label: '난포 크기',          unit: 'mm' },
    { key: 'follicleCount',label: '난포 개수',          unit: '개' },
    { key: 'injectionDrug',label: '주사 종류',          unit: '' },
    { key: 'injectionDose',label: '주사 용량',          unit: 'IU' },
  ],
  monitoring: [
    { key: 'lh',           label: 'LH 황체형성호르몬', unit: 'mIU/mL' },
    { key: 'estradiol',    label: 'E2 에스트라디올',   unit: 'pg/mL' },
    { key: 'maxFollicle',  label: '최대 난포 크기',    unit: 'mm',
      warning: (v) => Number(v) >= 18 ? '트리거 주사 준비 시기예요 💉' : null },
    { key: 'opkResult',    label: 'OPK 결과',          unit: '',
      type: 'select', options: [
        { value: 'negative', label: '음성' },
        { value: 'positive', label: '양성' },
        { value: 'strong',   label: '강양성' },
      ] },
  ],
  luteal: [
    { key: 'progesterone', label: 'P4 프로게스테론',   unit: 'ng/mL' },
    { key: 'suppType',     label: '황체 보강제 종류',  unit: '',
      type: 'select', options: [
        { value: 'vaginal',  label: '질정' },
        { value: 'injection',label: '근육주사' },
        { value: 'oral',     label: '경구약' },
      ] },
    { key: 'symptoms',     label: '증상 (다중 선택)',  unit: '',
      type: 'multiselect', options: [
        { value: 'implantation_bleeding', label: '착상혈' },
        { value: 'cramp',   label: '경련' },
        { value: 'breast',  label: '유방통증' },
        { value: 'fatigue', label: '피로감' },
      ] },
  ],
  result: [
    { key: 'hcgLevel',     label: 'β-hCG 수치',       unit: 'mIU/mL' },
    { key: 'judgmentResult',label: '판정 결과',         unit: '',
      type: 'select', options: [
        { value: 'positive', label: '임신확인' },
        { value: 'negative', label: '음성' },
        { value: 'recheck',  label: '재검' },
      ] },
  ],
}

const IVF_HOSPITAL_FIELDS: Record<string, FieldConfig[]> = {
  stimulation: [
    { key: 'estradiol',      label: 'E2 에스트라디올',   unit: 'pg/mL' },
    { key: 'follicleRight',  label: '우측 난포 수',      unit: '개' },
    { key: 'follicleLeft',   label: '좌측 난포 수',      unit: '개' },
    { key: 'endometrium',    label: '자궁내막 두께',     unit: 'mm',
      warning: (v) => Number(v) < 7 ? '내막 두께 확인이 필요해요' : null },
    { key: 'injectionDrug',  label: '주사 종류',         unit: '' },
    { key: 'injectionDose',  label: '주사 용량',         unit: 'IU' },
  ],
  monitoring: [
    { key: 'estradiol',    label: 'E2 에스트라디올',   unit: 'pg/mL' },
    { key: 'lh',           label: 'LH',               unit: 'mIU/mL' },
    { key: 'maxFollicle',  label: '최대 난포 크기',    unit: 'mm' },
    { key: 'mature18Plus', label: '18mm 이상 난포 수', unit: '개' },
    { key: 'endometrium',  label: '자궁내막 두께',     unit: 'mm' },
  ],
  retrieval: [
    { key: 'totalOocytes',  label: '채취 총 난자 수',  unit: '개' },
    { key: 'matureOocytes', label: '성숙 난자 수 (MII)',unit: '개' },
    { key: 'condition',     label: '당일 컨디션',      unit: '점', type: 'slider' },
  ],
  culture: [
    { key: 'twoPN',         label: '2PN 수 (정상 수정)', unit: '개' },
    { key: 'day3Embryo',    label: 'Day3 배아 수',       unit: '개' },
    { key: 'blastocyst',    label: 'Day5~6 배반포 수',   unit: '개' },
    { key: 'frozenEmbryo',  label: '냉동 배아 수',       unit: '개' },
  ],
  transfer: [
    { key: 'transferredEmbryos', label: '이식 배아 수',    unit: '개' },
    { key: 'embryoGrade',        label: '배아 등급',        unit: '', placeholder: '예: 4AA, 3BB' },
    { key: 'endometrium',        label: '자궁내막 두께',   unit: 'mm' },
    { key: 'transferMethod',     label: '이식 방법',        unit: '',
      type: 'select', options: [
        { value: 'fresh',  label: '신선' },
        { value: 'frozen', label: '동결' },
      ] },
  ],
  luteal: [
    { key: 'progesterone', label: 'P4 프로게스테론',   unit: 'ng/mL' },
    { key: 'estradiol',    label: 'E2 에스트라디올',   unit: 'pg/mL' },
    { key: 'suppType',     label: '황체 보강제 종류',  unit: '',
      type: 'select', options: [
        { value: 'vaginal',  label: '질정' },
        { value: 'injection',label: '근육주사' },
        { value: 'oral',     label: '경구약' },
      ] },
    { key: 'symptoms',     label: '증상 (다중 선택)',  unit: '',
      type: 'multiselect', options: [
        { value: 'implantation_bleeding', label: '착상혈' },
        { value: 'bloating',label: '복부팽만' },
        { value: 'breast',  label: '유방통증' },
        { value: 'fatigue', label: '피로감' },
        { value: 'ohss',    label: 'OHSS 증상',
          // OHSS 경고는 컴포넌트에서 선택 여부로 트리거
        },
      ] },
  ],
  result: [
    { key: 'hcgLevel',      label: 'β-hCG 수치',      unit: 'mIU/mL' },
    { key: 'judgmentResult', label: '판정 결과',        unit: '',
      type: 'select', options: [
        { value: 'positive', label: '임신확인' },
        { value: 'negative', label: '음성' },
        { value: 'recheck',  label: '재검' },
      ] },
  ],
}

export function getHospitalFields(mode: TreatmentMode, stage: CurrentStage): FieldConfig[] {
  if (!stage) return []
  const map = mode === 'iui' ? IUI_HOSPITAL_FIELDS : IVF_HOSPITAL_FIELDS
  return map[stage] ?? []
}

// ── 일반 기록 탭 — 모드별 필드 ─────────────────────────────
export function getDailyFields(mode: TreatmentMode): string[] {
  if (mode === 'natural') {
    return ['bbt', 'opk', 'cervicalMucus', 'weight', 'sleep']
  }
  // 시술 모드: 자궁경부점액 제외
  return ['bbt', 'opk', 'weight', 'sleep']
}
