import '../models/enums.dart';

/// Port of packages/shared/lib/modeHelpers.ts.
bool isTreatmentMode(TreatmentMode mode) => mode == 'iui' || mode == 'ivf';
bool isPregnantMode(TreatmentMode mode) => mode == 'pregnant';

const Map<String, String> _stageLabels = {
  'stimulation': '과배란 유도 중',
  'procedure': '인공수정 시술일',
  'retrieval': '난자 채취일',
  'culture': '수정 · 배양 중',
  'transfer': '배아 이식일',
  'luteal': '황체기 · 착상 대기 중',
  'result': '판정일',
};

String getStageLabelKo(TreatmentMode mode, CurrentStage stage) {
  if (stage == null) return '단계 미설정';
  if (stage == 'monitoring') {
    return mode == 'ivf' ? '난포 모니터링 중' : '배란 모니터링 중';
  }
  return _stageLabels[stage] ?? stage;
}

const List<String> _iuiOrder = [
  'stimulation',
  'monitoring',
  'procedure',
  'luteal',
  'result',
];
const List<String> _ivfOrder = [
  'stimulation',
  'monitoring',
  'retrieval',
  'culture',
  'transfer',
  'luteal',
  'result',
];

CurrentStage getNextStage(TreatmentMode mode, CurrentStage current) {
  if (mode == 'natural') return null;
  final order = mode == 'iui' ? _iuiOrder : _ivfOrder;
  if (current == null) return order[0];
  final idx = order.indexOf(current);
  return (idx >= 0 && idx < order.length - 1) ? order[idx + 1] : null;
}
