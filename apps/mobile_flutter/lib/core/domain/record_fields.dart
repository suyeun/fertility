import '../models/enums.dart';

/// Port of packages/shared/lib/recordFields.ts.
class RecordTab {
  const RecordTab({required this.key, required this.label});
  final String key;
  final String label;
}

List<RecordTab> getRecordTabs(TreatmentMode mode) {
  if (mode == 'natural') {
    return const [RecordTab(key: 'daily', label: '일반 기록')];
  }
  return const [
    RecordTab(key: 'daily', label: '일반 기록'),
    RecordTab(key: 'hospital', label: '병원 수치'),
    RecordTab(key: 'procedure', label: '시술 지표'),
  ];
}

enum FieldType { number, select, multiselect, slider }

class FieldOption {
  const FieldOption({required this.value, required this.label});
  final String value;
  final String label;
}

class FieldConfig {
  const FieldConfig({
    required this.key,
    required this.label,
    required this.unit,
    this.placeholder,
    this.type = FieldType.number,
    this.options,
    this.warning,
  });

  final String key;
  final String label;
  final String unit;
  final String? placeholder;
  final FieldType type;
  final List<FieldOption>? options;

  /// Returns a warning message for the given value, or null.
  final String? Function(num value)? warning;
}

const Map<String, List<FieldConfig>> _iuiHospitalFields = {
  'stimulation': [
    FieldConfig(key: 'estradiol', label: 'E2 에스트라디올', unit: 'pg/mL'),
    FieldConfig(key: 'follicleSize', label: '난포 크기', unit: 'mm'),
    FieldConfig(key: 'follicleCount', label: '난포 개수', unit: '개'),
    FieldConfig(key: 'injectionDrug', label: '주사 종류', unit: ''),
    FieldConfig(key: 'injectionDose', label: '주사 용량', unit: 'IU'),
  ],
  'monitoring': [
    FieldConfig(key: 'lh', label: 'LH 황체형성호르몬', unit: 'mIU/mL'),
    FieldConfig(key: 'estradiol', label: 'E2 에스트라디올', unit: 'pg/mL'),
    FieldConfig(
      key: 'maxFollicle',
      label: '최대 난포 크기',
      unit: 'mm',
      warning: _trigger18,
    ),
    FieldConfig(
      key: 'opkResult',
      label: 'OPK 결과',
      unit: '',
      type: FieldType.select,
      options: [
        FieldOption(value: 'negative', label: '음성'),
        FieldOption(value: 'positive', label: '양성'),
        FieldOption(value: 'strong', label: '강양성'),
      ],
    ),
  ],
  'luteal': [
    FieldConfig(key: 'progesterone', label: 'P4 프로게스테론', unit: 'ng/mL'),
    FieldConfig(
      key: 'suppType',
      label: '황체 보강제 종류',
      unit: '',
      type: FieldType.select,
      options: [
        FieldOption(value: 'vaginal', label: '질정'),
        FieldOption(value: 'injection', label: '근육주사'),
        FieldOption(value: 'oral', label: '경구약'),
      ],
    ),
    FieldConfig(
      key: 'symptoms',
      label: '증상 (다중 선택)',
      unit: '',
      type: FieldType.multiselect,
      options: [
        FieldOption(value: 'implantation_bleeding', label: '착상혈'),
        FieldOption(value: 'cramp', label: '경련'),
        FieldOption(value: 'breast', label: '유방통증'),
        FieldOption(value: 'fatigue', label: '피로감'),
      ],
    ),
  ],
  'result': [
    FieldConfig(key: 'hcgLevel', label: 'β-hCG 수치', unit: 'mIU/mL'),
    FieldConfig(
      key: 'judgmentResult',
      label: '판정 결과',
      unit: '',
      type: FieldType.select,
      options: [
        FieldOption(value: 'positive', label: '임신확인'),
        FieldOption(value: 'negative', label: '음성'),
        FieldOption(value: 'recheck', label: '재검'),
      ],
    ),
  ],
};

const Map<String, List<FieldConfig>> _ivfHospitalFields = {
  'stimulation': [
    FieldConfig(key: 'estradiol', label: 'E2 에스트라디올', unit: 'pg/mL'),
    FieldConfig(key: 'follicleRight', label: '우측 난포 수', unit: '개'),
    FieldConfig(key: 'follicleLeft', label: '좌측 난포 수', unit: '개'),
    FieldConfig(
      key: 'endometrium',
      label: '자궁내막 두께',
      unit: 'mm',
      warning: _endometriumThin,
    ),
    FieldConfig(key: 'injectionDrug', label: '주사 종류', unit: ''),
    FieldConfig(key: 'injectionDose', label: '주사 용량', unit: 'IU'),
  ],
  'monitoring': [
    FieldConfig(key: 'estradiol', label: 'E2 에스트라디올', unit: 'pg/mL'),
    FieldConfig(key: 'lh', label: 'LH', unit: 'mIU/mL'),
    FieldConfig(key: 'maxFollicle', label: '최대 난포 크기', unit: 'mm'),
    FieldConfig(key: 'mature18Plus', label: '18mm 이상 난포 수', unit: '개'),
    FieldConfig(key: 'endometrium', label: '자궁내막 두께', unit: 'mm'),
  ],
  'retrieval': [
    FieldConfig(key: 'totalOocytes', label: '채취 총 난자 수', unit: '개'),
    FieldConfig(key: 'matureOocytes', label: '성숙 난자 수 (MII)', unit: '개'),
    FieldConfig(
      key: 'condition',
      label: '당일 컨디션',
      unit: '점',
      type: FieldType.slider,
    ),
  ],
  'culture': [
    FieldConfig(key: 'twoPN', label: '2PN 수 (정상 수정)', unit: '개'),
    FieldConfig(key: 'day3Embryo', label: 'Day3 배아 수', unit: '개'),
    FieldConfig(key: 'blastocyst', label: 'Day5~6 배반포 수', unit: '개'),
    FieldConfig(key: 'frozenEmbryo', label: '냉동 배아 수', unit: '개'),
  ],
  'transfer': [
    FieldConfig(key: 'transferredEmbryos', label: '이식 배아 수', unit: '개'),
    FieldConfig(
      key: 'embryoGrade',
      label: '배아 등급',
      unit: '',
      placeholder: '예: 4AA, 3BB',
    ),
    FieldConfig(key: 'endometrium', label: '자궁내막 두께', unit: 'mm'),
    FieldConfig(
      key: 'transferMethod',
      label: '이식 방법',
      unit: '',
      type: FieldType.select,
      options: [
        FieldOption(value: 'fresh', label: '신선'),
        FieldOption(value: 'frozen', label: '동결'),
      ],
    ),
  ],
  'luteal': [
    FieldConfig(key: 'progesterone', label: 'P4 프로게스테론', unit: 'ng/mL'),
    FieldConfig(key: 'estradiol', label: 'E2 에스트라디올', unit: 'pg/mL'),
    FieldConfig(
      key: 'suppType',
      label: '황체 보강제 종류',
      unit: '',
      type: FieldType.select,
      options: [
        FieldOption(value: 'vaginal', label: '질정'),
        FieldOption(value: 'injection', label: '근육주사'),
        FieldOption(value: 'oral', label: '경구약'),
      ],
    ),
    FieldConfig(
      key: 'symptoms',
      label: '증상 (다중 선택)',
      unit: '',
      type: FieldType.multiselect,
      options: [
        FieldOption(value: 'implantation_bleeding', label: '착상혈'),
        FieldOption(value: 'bloating', label: '복부팽만'),
        FieldOption(value: 'breast', label: '유방통증'),
        FieldOption(value: 'fatigue', label: '피로감'),
        FieldOption(value: 'ohss', label: 'OHSS 증상'),
      ],
    ),
  ],
  'result': [
    FieldConfig(key: 'hcgLevel', label: 'β-hCG 수치', unit: 'mIU/mL'),
    FieldConfig(
      key: 'judgmentResult',
      label: '판정 결과',
      unit: '',
      type: FieldType.select,
      options: [
        FieldOption(value: 'positive', label: '임신확인'),
        FieldOption(value: 'negative', label: '음성'),
        FieldOption(value: 'recheck', label: '재검'),
      ],
    ),
  ],
};

String? _trigger18(num v) => v >= 18 ? '트리거 주사 준비 시기예요 💉' : null;
String? _endometriumThin(num v) => v < 7 ? '내막 두께 확인이 필요해요' : null;

List<FieldConfig> getHospitalFields(TreatmentMode mode, CurrentStage stage) {
  if (stage == null) return const [];
  final map = mode == 'iui' ? _iuiHospitalFields : _ivfHospitalFields;
  return map[stage] ?? const [];
}

List<String> getDailyFields(TreatmentMode mode) {
  if (mode == 'natural') {
    return const ['bbt', 'opk', 'cervicalMucus', 'weight', 'sleep'];
  }
  return const ['bbt', 'opk', 'weight', 'sleep'];
}
