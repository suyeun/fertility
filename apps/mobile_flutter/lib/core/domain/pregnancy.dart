/// 임신 확인 모드 — 주수·예정일·분기 계산과 안내 데이터 (순수 로직, 위젯·IO 없음).
///
/// 모든 값은 참고용이다. 화면은 "예정일과 검사 시기는 의료진 확인 기준으로 달라질 수 있음"을
/// 함께 표시해야 한다.
library;

class GestationalAge {
  const GestationalAge({required this.weeks, required this.days});
  final int weeks;
  final int days;

  int get totalDays => weeks * 7 + days;

  /// 1·2·3분기. 14주 미만 1, 28주 미만 2, 이후 3.
  int get trimester => weeks < 14 ? 1 : (weeks < 28 ? 2 : 3);

  String get label => '임신 $weeks주 $days일';
}

DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

/// 이식일 기준 LMP 환산: 이식일 − (14 + 배아 배양 일수).
DateTime lmpFromTransfer(DateTime transferDate, int embryoDay) {
  return _dateOnly(transferDate).subtract(Duration(days: 14 + embryoDay));
}

/// LMP 기준 주수. 음수(미래 LMP)면 0주 0일.
GestationalAge gestationalAge(DateTime lmp, {DateTime? today}) {
  final t = _dateOnly(today ?? DateTime.now());
  final days = t.difference(_dateOnly(lmp)).inDays;
  if (days <= 0) return const GestationalAge(weeks: 0, days: 0);
  return GestationalAge(weeks: days ~/ 7, days: days % 7);
}

/// 출산 예정일 = LMP + 280일 (네겔레 법칙).
DateTime dueDate(DateTime lmp) => _dateOnly(lmp).add(const Duration(days: 280));

int daysUntilDueDate(DateTime lmp, {DateTime? today}) {
  final t = _dateOnly(today ?? DateTime.now());
  return dueDate(lmp).difference(t).inDays;
}

String formatDate(DateTime d) => '${d.year}년 ${d.month}월 ${d.day}일';

String toDateStr(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// 주수 구간별 짧은 안내. 의학적 지시가 아닌 생활 안내 수준으로 유지한다.
String weeklyTip(int weeks) {
  if (weeks < 6) return '착상 초기예요. 엽산을 챙기고, 출혈·심한 통증이 있으면 병원에 연락하세요.';
  if (weeks < 9) return '입덧이 시작될 수 있어요. 소량씩 자주 먹고 수분을 충분히 드세요.';
  if (weeks < 13) return '1차 기형아 선별 검사 시기예요. 병원 일정을 확인해두세요.';
  if (weeks < 17) return '입덧이 잦아드는 시기예요. 철분제 시작 시점을 의료진과 상의해보세요.';
  if (weeks < 21) return '2차 선별 검사와 정밀 초음파 시기예요. 태동을 느끼기 시작할 수 있어요.';
  if (weeks < 25) return '정밀 초음파 시기예요. 체중 변화를 주기적으로 기록해보세요.';
  if (weeks < 29) return '임신성 당뇨 검사 시기예요. 공복 여부는 병원 안내를 확인하세요.';
  if (weeks < 33) return '3분기 시작이에요. 태동 횟수와 부종·두통 같은 변화를 기록해두세요.';
  if (weeks < 37) return 'GBS 검사와 출산 준비 시기예요. 병원 가방과 신청 서류를 챙겨보세요.';
  if (weeks < 41) return '만삭이에요. 규칙적인 진통·파수·출혈이 있으면 바로 병원에 연락하세요.';
  return '예정일이 지났어요. 병원과 분만 계획을 상의하세요.';
}

/// 산전 검사 권장 시기 (주 단위 범위). 캘린더 템플릿(백엔드)과 같은 기준.
class PrenatalCheck {
  const PrenatalCheck({
    required this.key,
    required this.label,
    required this.fromWeek,
    required this.toWeek,
    this.note,
  });
  final String key;
  final String label;
  final int fromWeek;
  final int toWeek;
  final String? note;
}

const prenatalChecks = <PrenatalCheck>[
  PrenatalCheck(key: 'us_early', label: '초기 초음파 (태낭·심박)', fromWeek: 6, toWeek: 8),
  PrenatalCheck(key: 'screen1', label: '1차 기형아 선별 (NT·혈액)', fromWeek: 11, toWeek: 13, note: 'NIPT 여부는 의료진과 상담'),
  PrenatalCheck(key: 'screen2', label: '2차 기형아 선별 (혈액)', fromWeek: 15, toWeek: 18),
  PrenatalCheck(key: 'us_detail', label: '정밀 초음파', fromWeek: 20, toWeek: 24),
  PrenatalCheck(key: 'gdm', label: '임신성 당뇨·빈혈 검사', fromWeek: 24, toWeek: 28),
  PrenatalCheck(key: 'visit28', label: '28주 산전 진찰', fromWeek: 28, toWeek: 28, note: 'Rh 음성이면 면역글로불린 상담'),
  PrenatalCheck(key: 'us_growth', label: '초음파 · 태아 성장 확인', fromWeek: 32, toWeek: 34),
  PrenatalCheck(key: 'gbs', label: 'GBS 검사', fromWeek: 35, toWeek: 37),
  PrenatalCheck(key: 'weekly', label: '주 1회 산전 진찰', fromWeek: 36, toWeek: 41),
];

/// 현재 주수에서 진행 중이거나 다음에 올 검사. 모두 지났으면 null.
PrenatalCheck? nextPrenatalCheck(int weeks) {
  for (final c in prenatalChecks) {
    if (weeks <= c.toWeek) return c;
  }
  return null;
}

/// 임신·출산 지원 안내 항목. 기준 데이터는 백엔드(GET /info/birth-benefits →
/// Firestore config/birthBenefits)에서 받고, 실패 시 아래 [defaultBirthBenefits] 를 쓴다.
class BirthBenefit {
  const BirthBenefit({
    required this.id,
    required this.title,
    required this.amount,
    required this.when,
    required this.how,
    this.note,
    this.url,
  });
  final String id;
  final String title;
  final String amount;
  final String when;
  final String how;
  final String? note;
  final String? url;

  factory BirthBenefit.fromJson(Map<String, dynamic> j) => BirthBenefit(
    id: j['id'] as String? ?? '',
    title: j['title'] as String? ?? '',
    amount: j['amount'] as String? ?? '',
    when: j['when'] as String? ?? '',
    how: j['how'] as String? ?? '',
    note: j['note'] as String?,
    url: j['url'] as String?,
  );
}

/// 확인일·면책·항목을 묶은 안내 데이터. [source] 는 'config' | 'default' | 'offline'.
class BirthBenefitsData {
  const BirthBenefitsData({
    required this.verifiedAt,
    required this.disclaimer,
    required this.items,
    this.source = 'offline',
  });
  final String verifiedAt;
  final String disclaimer;
  final List<BirthBenefit> items;
  final String source;

  factory BirthBenefitsData.fromJson(Map<String, dynamic> j) => BirthBenefitsData(
    verifiedAt: j['verifiedAt'] as String? ?? birthBenefitsVerifiedAt,
    disclaimer: j['disclaimer'] as String? ?? birthBenefitsDisclaimer,
    items: (j['items'] as List? ?? const [])
        .map((e) => BirthBenefit.fromJson(e as Map<String, dynamic>))
        .where((b) => b.id.isNotEmpty && b.title.isNotEmpty)
        .toList(),
    source: j['source'] as String? ?? 'config',
  );

  /// 서버 응답이 비어 있으면 폴백을 쓴다.
  BirthBenefitsData orFallback() =>
      items.isEmpty ? defaultBirthBenefitsData : this;
}

const birthBenefitsVerifiedAt = '2025-01-01';
const birthBenefitsDisclaimer =
    '금액과 요건은 정부·지자체 고시에 따라 달라질 수 있어요. 최종 기준은 정부24, 복지로 또는 관할 주민센터·보건소에서 확인하세요.';

const defaultBirthBenefitsData = BirthBenefitsData(
  verifiedAt: birthBenefitsVerifiedAt,
  disclaimer: birthBenefitsDisclaimer,
  items: defaultBirthBenefits,
  source: 'offline',
);

/// 오프라인·API 실패 시 폴백. 기준 데이터는 백엔드 birth-benefits.ts 와 같게 유지한다.
const defaultBirthBenefits = <BirthBenefit>[
  BirthBenefit(
    id: 'voucher',
    title: '임신·출산 진료비 바우처 (국민행복카드)',
    amount: '단태아 100만 원 · 다태아 태아당 100만 원',
    when: '임신 확인 직후 (분만 예정일 이후 2년까지 사용)',
    how: '카드사 앱·정부24에서 임신확인서로 신청',
    note: '산부인과 진료·약제비, 출산 후 영유아 진료에도 사용 가능',
    url: 'https://www.gov.kr',
  ),
  BirthBenefit(
    id: 'first_meeting',
    title: '첫만남이용권',
    amount: '첫째 200만 원 · 둘째 이상 300만 원',
    when: '출생 신고 후 (출생 후 1년 이내 사용)',
    how: '행복출산 원스톱 서비스(정부24) 또는 주민센터',
    note: '산후조리원·육아용품 등 사용',
    url: 'https://www.gov.kr',
  ),
  BirthBenefit(
    id: 'parent_pay',
    title: '부모급여',
    amount: '0세 월 100만 원 · 1세 월 50만 원',
    when: '출생 후 60일 이내 신청하면 출생월부터 지급',
    how: '복지로 또는 주민센터',
    note: '어린이집 이용 시 보육료로 전환',
    url: 'https://www.bokjiro.go.kr',
  ),
  BirthBenefit(
    id: 'health_center',
    title: '보건소 엽산제·철분제',
    amount: '무료',
    when: '엽산 임신 초기까지 · 철분 16주부터',
    how: '관할 보건소 방문 (임신확인서·신분증)',
  ),
  BirthBenefit(
    id: 'postpartum_care',
    title: '산모·신생아 건강관리 지원 (산후도우미)',
    amount: '소득 구간별 본인부담 차등',
    when: '출산 예정 40일 전 ~ 출산 후 30일',
    how: '관할 보건소 또는 복지로',
  ),
  BirthBenefit(
    id: 'local',
    title: '지자체 출산장려금',
    amount: '지역별 상이',
    when: '출생 신고 시',
    how: '주민센터 (행복출산 원스톱에서 함께 신청)',
    note: '거주지에 따라 수십만~수백만 원까지 차이',
  ),
];
