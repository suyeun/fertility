import type { TreatmentMode, CurrentStage, IUIStage, IVFStage } from '../types'

export const isTreatmentMode = (mode: TreatmentMode): boolean =>
  mode === 'iui' || mode === 'ivf'

const STAGE_LABELS: Record<string, string> = {
  stimulation: '과배란 유도 중',
  procedure:   '인공수정 시술일',
  retrieval:   '난자 채취일',
  culture:     '수정 · 배양 중',
  transfer:    '배아 이식일',
  luteal:      '황체기 · 착상 대기 중',
  result:      '판정일',
}

export const getStageLabelKo = (mode: TreatmentMode, stage: CurrentStage): string => {
  if (!stage) return '단계 미설정'
  if (stage === 'monitoring') {
    return mode === 'ivf' ? '난포 모니터링 중' : '배란 모니터링 중'
  }
  return STAGE_LABELS[stage] ?? stage
}

const IUI_ORDER: IUIStage[] = ['stimulation', 'monitoring', 'procedure', 'luteal', 'result']
const IVF_ORDER: IVFStage[] = ['stimulation', 'monitoring', 'retrieval', 'culture', 'transfer', 'luteal', 'result']

export const getNextStage = (mode: TreatmentMode, current: CurrentStage): CurrentStage => {
  if (mode === 'natural') return null
  const order = mode === 'iui' ? IUI_ORDER : IVF_ORDER
  if (!current) return order[0]
  const idx = order.indexOf(current as any)
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null
}
