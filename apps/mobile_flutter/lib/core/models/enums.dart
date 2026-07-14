/// Enum + config mirrors of packages/shared/types/index.ts.
/// Values are kept as raw strings (matching backend JSON) rather than Dart
/// enums where the RN side treats them as open string unions, to avoid
/// throwing on values not yet known to this client.
library;

typedef TreatmentMode = String; // 'natural' | 'iui' | 'ivf'
typedef IUIStage =
    String; // stimulation | monitoring | procedure | luteal | result
typedef IVFStage =
    String; // stimulation | monitoring | retrieval | culture | transfer | luteal | result
typedef CurrentStage = String?; // IUIStage | IVFStage | null
typedef CyclePhase = String; // menstrual | follicular | ovulation | luteal
typedef CalendarEventType = String;
typedef Mood = String;
typedef UserMode = String; // 'NATURAL' | 'CLINIC'
typedef TreatmentType = String; // IVF | IUI | FET | monitoring | other
typedef TreatmentStatus = String; // scheduled | completed | cancelled
typedef PostCategory = String; // DAILY | CLINIC | INFO
typedef PostTargetMode = String; // ALL | NATURAL | CLINIC
typedef PostTag = String;
typedef CoupleRole = String; // OWNER | PARTNER
typedef CoupleStatus = String; // PENDING | LINKED | UNLINKED
typedef HospitalSpecialty = String; // IVF | IUI | FET | PGT | 남성난임 | 기타
typedef ReactionType = String; // cheer | empathy | pray
typedef SubscriptionStatus = String; // trial | active | cancelled

class TagMeta {
  const TagMeta({required this.category, required this.targetMode});
  final PostCategory category;
  final PostTargetMode targetMode;
}

const Map<PostTag, TagMeta> tagMeta = {
  '#감정토닥': TagMeta(category: 'DAILY', targetMode: 'ALL'),
  '#남편_시댁': TagMeta(category: 'DAILY', targetMode: 'ALL'),
  '#아무말': TagMeta(category: 'DAILY', targetMode: 'ALL'),
  '#시험관_신선': TagMeta(category: 'CLINIC', targetMode: 'CLINIC'),
  '#시험관_동결': TagMeta(category: 'CLINIC', targetMode: 'CLINIC'),
  '#인공수정': TagMeta(category: 'CLINIC', targetMode: 'CLINIC'),
  '#병원추천': TagMeta(category: 'CLINIC', targetMode: 'CLINIC'),
  '#배테기_기초체온': TagMeta(category: 'INFO', targetMode: 'NATURAL'),
  '#영양제추천': TagMeta(category: 'INFO', targetMode: 'ALL'),
  '#운동_식단': TagMeta(category: 'INFO', targetMode: 'ALL'),
};

const Map<UserMode, List<PostCategory>> categoryOrder = {
  'NATURAL': ['DAILY', 'INFO', 'CLINIC'],
  'CLINIC': ['CLINIC', 'DAILY', 'INFO'],
};

class CategoryLabel {
  const CategoryLabel({required this.label, required this.emoji});
  final String label;
  final String emoji;
}

const Map<PostCategory, CategoryLabel> categoryLabel = {
  'DAILY': CategoryLabel(label: '자유수다/일상', emoji: '💬'),
  'CLINIC': CategoryLabel(label: '시험관/시술', emoji: '🧬'),
  'INFO': CategoryLabel(label: '꿀팁/정보공유', emoji: '💡'),
};

const Map<PostCategory, bool> categoryAnonymous = {
  'DAILY': true,
  'CLINIC': true,
  'INFO': true,
};

class PdfReport {
  PdfReport._();

  static const titleNatural = '개인 건강 기록지 (PHR) — 자연 임신 준비 데이터';
  static const titleClinic = '개인 건강 기록지 (PHR) — 시술 경과 자가 기록';
  static const subtitle = '자가 기록 데이터 요약본 | BOM 앱 기록 기반';
  static const filenameNatural = 'BOM_PHR_자연임신준비';
  static const filenameClinic = 'BOM_PHR_시술기록';
  static const disclaimer =
      '본 문서는 사용자가 BOM 앱에 직접 입력한 자가 기록 데이터의 정돈된 요약본입니다. '
      '의료 소견서·진단서·처방전이 아니며, 의료적 판단의 근거로 사용될 수 없습니다. '
      '정확한 진단과 치료는 반드시 담당 전문의와 상담하시기 바랍니다.';
  static const hospitalNote =
      '※ 이 기록지는 환자 본인이 직접 작성·관리한 개인 건강 기록(PHR)입니다. '
      '진료 참고 자료로 활용하실 수 있습니다.';
}
