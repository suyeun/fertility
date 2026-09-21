import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/client.dart';
import '../../core/api/misc_api.dart' show AffiliateProduct;
import '../../core/api/subsidy_api.dart';
import '../../core/models/models.dart';
import '../../core/models/subsidy.dart';
import '../../core/theme/app_theme.dart';
import '../../state/profile_controller.dart';
import '../../state/providers.dart';

const _regions = ['전체', '서울', '경기', '인천', '부산', '대구', '대전', '광주', '기타'];
const _specialties = ['전체', 'IVF', 'IUI', 'FET', 'PGT', '남성난임'];
const _infoCategories = ['전체', '시술 이해', '생활 습관', '검사·수치', '심리·감정', '식단'];

const _categoryMeta = {
  '시술 이해': (emoji: '🔬', bg: Color(0xFFEDE9FE), fg: Color(0xFF6D28D9)),
  '생활 습관': (emoji: '🌿', bg: Color(0xFFDCFCE7), fg: Color(0xFF15803D)),
  '검사·수치': (emoji: '📊', bg: Color(0xFFE0F2FE), fg: Color(0xFF0369A1)),
  '심리·감정': (emoji: '💙', bg: Color(0xFFFCE7F3), fg: Color(0xFFBE185D)),
  '식단': (emoji: '🥗', bg: Color(0xFFFEF3C7), fg: Color(0xFF92400E)),
};

// 보건복지부 난임부부 시술비 지원사업 2024-11-01 개정 기준 (만 44세 이하 상한).
// 출산당 총 25회(체외수정 신선·동결 합산 20회 + 인공수정 5회), 소득 기준 없음.
// 정확한 금액은 Firestore config 규칙(지원금 계산기)이 기준이며, 여기는 안내용 요약이다.
const _costInfo = [
  (
    title: '인공수정 (IUI)',
    gov: '출산당 5회 · 회당 최대 30만원',
    selfPay: '20~50만원/회',
    note: '건강보험 급여 후 본인부담분을 지원 · 만 45세 이상은 상한 20만원',
  ),
  (
    title: '체외수정 (IVF)',
    gov: '신선·동결 합산 20회 · 신선배아 회당 최대 110만원',
    selfPay: '300~500만원/회',
    note: '만 45세 이상은 상한 90만원 · 배아동결비 최대 30만원 별도',
  ),
  (
    title: '동결이식 (FET)',
    gov: 'IVF 20회에 포함 · 회당 최대 50만원',
    selfPay: '70~150만원/회',
    note: '만 45세 이상은 상한 40만원 · 신선배아보다 비용 낮음',
  ),
];

const _processSteps = [
  (step: '1', label: '난임 진단서 발급', desc: '정부지정 난임시술 의료기관에서 발급'),
  (
    step: '2',
    label: '지원결정통지서 신청',
    desc: '시술 시작 전 정부24 · e보건소 · 관할 보건소 (소급 불가)',
  ),
  (step: '3', label: '지원 결정 통보', desc: '소득 기준 없음 · 서류 확인 후 통지서 발급'),
  (step: '4', label: '시술 후 비용 청구', desc: '영수증 · 세부내역서로 관할 보건소에 청구'),
];

const _subsidyArticles = [
  (
    id: 'notice',
    title: '지원결정통지서, 시술 전에 꼭 받아야 하는 이유',
    body:
        '지원결정통지서는 시술을 시작하기 전에 발급받아야 해요. 이미 시작한 시술에는 소급 적용되지 않기 때문에, '
        '시술 일정이 잡히면 가장 먼저 정부24·e보건소·관할 보건소 중 편한 곳에서 신청하는 게 중요해요.',
  ),
  (
    id: 'medication',
    title: '약제비도 청구 가능한 항목 정리',
    body:
        '유산방지제, 착상보조제 등 일부 약제비는 시술비와 별도로 청구할 수 있어요. 영수증과 처방 내역을 '
        '잘 보관해두면 청구 시 도움이 돼요.',
  ),
  (
    id: 'defacto',
    title: '사실혼 부부 신청 방법',
    body:
        '법률혼이 아니어도 1년 이상 사실혼 관계라면 지원 대상이 될 수 있어요. 지자체별로 요구하는 증빙 서류가 '
        '다를 수 있으니 신청 전 관할 보건소에 필요한 서류를 미리 확인해보세요.',
  ),
];

/// Port of apps/mobile/app/(tabs)/hospital/index.tsx.
class HospitalScreen extends ConsumerStatefulWidget {
  const HospitalScreen({super.key});

  @override
  ConsumerState<HospitalScreen> createState() => _HospitalScreenState();
}

class _HospitalScreenState extends ConsumerState<HospitalScreen> {
  String _activeTab = 'hospitals';
  String _selectedRegion = '전체';
  String _selectedSpecialty = '전체';
  String _selectedCategory = '전체';
  final _searchCtrl = TextEditingController();
  String? _expandedArticleId;

  List<Hospital> _hospitals = [];
  List<MedicalArticle> _articles = [];
  bool _loadingHospitals = false;
  bool _loadingArticles = false;
  Map<String, List<AffiliateProduct>>? _remoteProducts;

  SubsidyRules? _subsidyRules;
  UserSubsidyProfile? _subsidyProfile;
  String? _expandedSubsidyArticleId;

  @override
  void initState() {
    super.initState();
    ref
        .read(infoApiProvider)
        .getProducts()
        .then((p) {
          if (mounted) setState(() => _remoteProducts = p);
        })
        .catchError((_) {});
    _fetchSubsidySummary();
    _fetchHospitals();
    _searchCtrl.addListener(() {
      if (_activeTab == 'hospitals') {
        _fetchHospitals();
      } else if (_activeTab == 'info') {
        _fetchArticles();
      }
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchHospitals() async {
    setState(() => _loadingHospitals = true);
    try {
      final data = await ref
          .read(hospitalsApiProvider)
          .getAll(
            region: _selectedRegion == '전체' ? null : _selectedRegion,
            specialty: _selectedSpecialty == '전체' ? null : _selectedSpecialty,
            search: _searchCtrl.text.isEmpty ? null : _searchCtrl.text,
          );
      if (mounted) setState(() => _hospitals = data);
      _recordSponsorImpressions(data);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingHospitals = false);
    }
  }

  /// 광고 병원 노출 집계 — 화면 생명주기 동안 병원당 1회, 비식별.
  final Set<String> _impressedHospitalIds = {};
  void _recordSponsorImpressions(List<Hospital> hospitals) {
    final ads = ref.read(adsApiProvider);
    for (final h in hospitals.where((h) => h.isSponsored)) {
      if (_impressedHospitalIds.add(h.id)) {
        ads.sendEvent(type: 'impression', target: 'hospital', targetId: h.id);
      }
    }
  }

  void _recordSponsorClick(Hospital h) {
    if (!h.isSponsored) return;
    ref
        .read(adsApiProvider)
        .sendEvent(type: 'click', target: 'hospital', targetId: h.id);
  }

  Future<void> _fetchSubsidySummary() async {
    try {
      final results = await Future.wait([
        ref.read(subsidyApiProvider).getRules(),
        ref.read(subsidyApiProvider).getProfile(),
      ]);
      if (!mounted) return;
      setState(() {
        _subsidyRules = results[0] as SubsidyRules;
        _subsidyProfile = results[1] as UserSubsidyProfile;
      });
    } catch (_) {
      // 요약 카드는 정보성 표시일 뿐이므로 실패해도 화면 진입을 막지 않음.
    }
  }

  Future<void> _fetchArticles() async {
    setState(() => _loadingArticles = true);
    try {
      final data = await ref
          .read(articlesApiProvider)
          .getAll(
            category: _selectedCategory == '전체' ? null : _selectedCategory,
            search: _searchCtrl.text.isEmpty ? null : _searchCtrl.text,
          );
      if (mounted) setState(() => _articles = data);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingArticles = false);
    }
  }

  List<AffiliateProduct> _productsFor(MedicalArticle a) {
    return _remoteProducts?[a.id] ??
        (a.products ?? const [])
            .map(
              (p) => AffiliateProduct(
                name: p.name,
                desc: p.desc,
                platform: p.platform,
                url: p.url,
              ),
            )
            .toList();
  }

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBFC),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: const Icon(
                      Icons.chevron_left,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.local_hospital_rounded,
                              size: 18,
                              color: AppColors.primary,
                            ),
                            SizedBox(width: 6),
                            Text(
                              '정보',
                              style: TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textDark,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 3),
                        Text(
                          '난임 병원 · 비용 · 지원 · 유용한 정보',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.primaryLight),
              ),
              child: Row(
                children: [
                  _tab('hospitals', '병원 찾기'),
                  _tab('cost', '비용·지원'),
                  _tab('info', '정보'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
                children: [
                  if (_activeTab == 'hospitals') ..._hospitalsTabContent(),
                  if (_activeTab == 'cost') ..._costTabContent(),
                  if (_activeTab == 'info') ..._infoTabContent(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tab(String key, String label) {
    final active = _activeTab == key;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() => _activeTab = key);
          if (key == 'hospitals' && _hospitals.isEmpty) _fetchHospitals();
          if (key == 'info' && _articles.isEmpty) _fetchArticles();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: active ? Colors.white : AppColors.textMuted,
            ),
          ),
        ),
      ),
    );
  }

  Widget _searchBox(String hint) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primaryLight),
      ),
      child: Row(
        children: [
          const Text('🔍', style: TextStyle(fontSize: 14)),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: const TextStyle(color: AppColors.textMuted),
                border: InputBorder.none,
                filled: false,
                isDense: true,
              ),
              style: const TextStyle(fontSize: 13, color: AppColors.textDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chipRow(
    List<String> options,
    String selected,
    void Function(String) onSelect, {
    bool purple = false,
  }) {
    return SizedBox(
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: options.map((o) {
          final active = selected == o;
          final activeColor = purple
              ? const Color(0xFFA855F7)
              : AppColors.primary;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => onSelect(o),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: active ? activeColor : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: active ? activeColor : AppColors.primaryLight,
                  ),
                ),
                child: Text(
                  o,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: active ? Colors.white : AppColors.textMuted,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  List<Widget> _hospitalsTabContent() {
    return [
      _searchBox('등록된 병원명, 지역으로 검색'),
      const SizedBox(height: 10),
      _chipRow(_regions, _selectedRegion, (r) {
        setState(() => _selectedRegion = r);
        _fetchHospitals();
      }),
      const SizedBox(height: 8),
      _chipRow(_specialties, _selectedSpecialty, (s) {
        setState(() => _selectedSpecialty = s);
        _fetchHospitals();
      }, purple: true),
      const SizedBox(height: 10),
      Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF8E1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Text(
          '💡 아래 정보는 단순 참고용입니다. 정확한 시술 및 비용 내용은 각 의료기관에 직접 문의하세요.',
          style: TextStyle(fontSize: 11, color: Color(0xFF92400E), height: 1.4),
        ),
      ),
      const SizedBox(height: 12),
      if (_loadingHospitals)
        const Center(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
        )
      else ...[
        if (_hospitals.any((h) => h.isSponsored)) ...[
          _sectionLabel('광고', hint: '계약 기간 동안 노출되는 병원이에요'),
          ..._hospitals.where((h) => h.isSponsored).map(_hospitalCard),
          if (_hospitals.any((h) => !h.isSponsored))
            _sectionLabel('전체 병원', hint: '이름순'),
        ],
        ..._hospitals.where((h) => !h.isSponsored).map(_hospitalCard),
      ],
      if (!_loadingHospitals && _hospitals.isEmpty)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 40),
          child: Center(
            child: Text(
              '가까운 지역에 등록된 병원이 없어요',
              style: TextStyle(fontSize: 14, color: AppColors.textMuted),
            ),
          ),
        ),
      const SizedBox(height: 8),
      GestureDetector(
        onTap: _openSuggestModal,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.primaryLight,
              width: 1.5,
              style: BorderStyle.solid,
            ),
          ),
          child: const Text(
            '🏥 다니는 병원이 없으신가요? 등록 요청하기',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.textMuted,
            ),
          ),
        ),
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Text(
          '⚠️ 본 서비스는 정보 제공 목적으로만 제공되며, 의료기관을 알선·추천하거나 의사의 전문적인 진단 및 상담을 대신하지 않습니다. 정확한 진료와 시술 계획은 반드시 전문의와 상담하시기 바랍니다.',
          style: TextStyle(fontSize: 10, color: Color(0xFF64748B), height: 1.5),
        ),
      ),
    ];
  }

  Widget _sectionLabel(String label, {String? hint}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Row(
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.textMuted,
            ),
          ),
          if (hint != null) ...[
            const SizedBox(width: 6),
            Text(
              hint,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textMutedLight,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _adBadge(String label) {
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.textMutedLight),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: AppColors.textMuted,
        ),
      ),
    );
  }

  Widget _hospitalCard(Hospital h) {
    // 광고 병원은 평점·리뷰 수를 표시하지 않는다 (의료광고 후기·평가 표현 규제).
    // 일반 병원도 데이터가 없으면 "0.0"을 노출하지 않는다.
    final showRating =
        !h.isSponsored && h.rating != null && h.rating! > 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: h.isSponsored ? AppColors.textMutedLight : AppColors.primaryLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (h.isSponsored) _adBadge(h.sponsorBadgeLabel),
                        Expanded(
                          child: Text(
                            h.name,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textDark,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${h.region} · ${h.address}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              if (showRating)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '⭐ ${h.rating}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textDark,
                      ),
                    ),
                    Text(
                      '리뷰 ${h.reviewCount ?? 0}개',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          if (h.note != null) ...[
            const SizedBox(height: 6),
            Text(
              h.note!,
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ],
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              ...h.specialties.map(
                (s) => Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEDE9FE),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    s,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6D28D9),
                    ),
                  ),
                ),
              ),
              ...(h.tags ?? const []).map(
                (t) => Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.primaryLight),
                  ),
                  child: Text(
                    t,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '💰 ${h.avgCost ?? '평균 비용 정보 없음'}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textDark,
                ),
              ),
              // 연락은 사용자가 기기에서 직접 한다 — 앱은 전화/브라우저를 열기만 하고
              // 사용자 정보를 병원에 전달하지 않는다.
              Row(
                children: [
                  if ((h.website ?? '').isNotEmpty) ...[
                    _contactButton('🌐 홈페이지', () {
                      _recordSponsorClick(h);
                      _launch(h.website!);
                    }),
                    const SizedBox(width: 6),
                  ],
                  if (h.phone.isNotEmpty)
                    _contactButton('📞 전화', () {
                      _recordSponsorClick(h);
                      _launch('tel:${h.phone}');
                    }),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _contactButton(String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.primary,
          ),
        ),
      ),
    );
  }

  Widget _birthBenefitsEntryCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.accentGreen),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🤍 임신·출산 지원',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '임신 확인 후 챙길 진료비 바우처, 첫만남이용권, 부모급여, 보건소 지원을 시점별로 정리했어요.',
            style: TextStyle(fontSize: 12, color: AppColors.textDark, height: 1.4),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.push('/birth-benefits'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accentGreen,
              ),
              child: const Text('임신·출산 지원 안내 열기'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _subsidyRegionSummaryCard() {
    final region = _subsidyRules?.local.findByCode(_subsidyProfile?.regionCode);
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.accentGreenLight,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '💰 내 지역 지원 제도',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            region != null
                ? '${region.regionName} — 국가 지원 + 지자체 추가 지원 ${region.additionalBenefits.isNotEmpty ? '있음' : '없음'}'
                : '거주지를 설정하면 내 지역 지원 제도를 요약해드려요.',
            style: const TextStyle(fontSize: 12, color: AppColors.textDark),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.push('/subsidy-calculator'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accentGreen,
              ),
              child: const Text('지원금 계산기 열기'),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => context.push('/subsidy-progress'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.accentGreen,
                side: const BorderSide(color: AppColors.accentGreen),
              ),
              icon: const Icon(Icons.checklist_rounded, size: 16),
              label: const Text('신청 진행 관리 (통지서 · 시술 · 청구)'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _subsidyArticleCard(({String id, String title, String body}) a) {
    final expanded = _expandedSubsidyArticleId == a.id;
    return GestureDetector(
      onTap: () =>
          setState(() => _expandedSubsidyArticleId = expanded ? null : a.id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              a.title,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            if (expanded) ...[
              const SizedBox(height: 8),
              Text(
                a.body,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF475569),
                  height: 1.5,
                ),
              ),
            ],
            const SizedBox(height: 4),
            Text(
              expanded ? '접기 ▲' : '더보기 ▼',
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _costTabContent() {
    final isPregnant =
        ref.read(profileControllerProvider)?.treatmentStage == 'pregnant';
    return [
      if (isPregnant) _birthBenefitsEntryCard(),
      _subsidyRegionSummaryCard(),
      ..._subsidyArticles.map(_subsidyArticleCard),
      const SizedBox(height: 4),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Text(
          '지원 기준은 지자체별로 다르며 변경될 수 있습니다. 최종 확인은 관할 보건소에 문의하세요.',
          style: TextStyle(fontSize: 10, color: Color(0xFF64748B), height: 1.5),
        ),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '🇰🇷 정부 난임 시술비 지원',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const Text(
              '소득 기준 없음 · 출산당 총 25회 · 2024년 11월 개정 기준',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            ..._costInfo.map(
              (c) => Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.only(top: 12),
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(color: AppColors.primaryLight),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      c.title,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '지원 횟수',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textMuted,
                          ),
                        ),
                        Text(
                          c.gov,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textDark,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '비지원 시 자비',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textMuted,
                          ),
                        ),
                        Text(
                          c.selfPay,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textDark,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      c.note,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _launch('https://www.bokjiro.go.kr'),
                child: const Text('복지로에서 신청하기 →'),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '📋 지원 신청 절차',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 14),
            ..._processSteps.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        p.step,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.label,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textDark,
                          ),
                        ),
                        Text(
                          p.desc,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ];
  }

  List<Widget> _infoTabContent() {
    return [
      _searchBox('아티클 제목 또는 태그로 검색'),
      const SizedBox(height: 10),
      _chipRow(_infoCategories, _selectedCategory, (c) {
        setState(() => _selectedCategory = c);
        _fetchArticles();
      }),
      const SizedBox(height: 12),
      if (_loadingArticles)
        const Center(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
        )
      else
        LayoutBuilder(
          builder: (context, constraints) {
            const gap = 10.0;
            final halfWidth = (constraints.maxWidth - gap) / 2;
            return Wrap(
              spacing: gap,
              runSpacing: gap,
              children: _articles.map((a) {
                final expanded = _expandedArticleId == a.id;
                return SizedBox(
                  width: expanded ? constraints.maxWidth : halfWidth,
                  child: _articleCard(a),
                );
              }).toList(),
            );
          },
        ),
      if (!_loadingArticles && _articles.isEmpty)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 40),
          child: Center(
            child: Text(
              '검색된 정보 아티클이 없어요',
              style: TextStyle(fontSize: 14, color: AppColors.textMuted),
            ),
          ),
        ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: const Text(
          '⚠️ 본 아티클은 의학적 지침을 제공하기 위함이 아니며 참고용 정보입니다. 건강 상의 이상 혹은 시술 과정에서의 상담은 전적으로 의학 전문가와의 직접 진료를 통해서 결정되어야 합니다.',
          style: TextStyle(fontSize: 10, color: Color(0xFF64748B), height: 1.5),
        ),
      ),
    ];
  }

  Widget _articleCard(MedicalArticle a) {
    final meta = _categoryMeta[a.category] ?? _categoryMeta['시술 이해']!;
    final products = _productsFor(a);
    final expanded = _expandedArticleId == a.id;

    return GestureDetector(
      onTap: () => setState(() => _expandedArticleId = expanded ? null : a.id),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!expanded)
              Container(
                height: 74,
                width: double.infinity,
                color: meta.bg,
                alignment: Alignment.center,
                child: Text(meta.emoji, style: const TextStyle(fontSize: 24)),
              ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: meta.bg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          a.category,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: meta.fg,
                          ),
                        ),
                      ),
                      if (a.authorName != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Text(
                            '🩺 자문: ${a.authorName}${a.authorAffiliation != null ? ' (${a.authorAffiliation})' : ''}',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ),
                      if (products.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.primaryLight),
                          ),
                          child: const Text(
                            '🛍️ 추천 제품',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    a.title,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                      height: 1.3,
                    ),
                  ),
                  if (expanded) ...[
                    const SizedBox(height: 10),
                    Text(
                      a.summary,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xCC5A3042),
                        height: 1.5,
                      ),
                    ),
                    if (a.content != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        a.content!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF475569),
                          height: 1.5,
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: a.tags
                          .map(
                            (t) => Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: meta.fg),
                              ),
                              child: Text(
                                '#$t',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: meta.fg,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    if (products.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.only(top: 10),
                        decoration: const BoxDecoration(
                          border: Border(
                            top: BorderSide(color: AppColors.primaryLight),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '🛍️ 아티클 관련 추천 제품',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textMuted,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ...products.map(
                              (p) => GestureDetector(
                                onTap: () => _launch(p.url),
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: AppColors.primaryLight,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      const Text(
                                        '🛍️',
                                        style: TextStyle(fontSize: 18),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              p.name,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.textDark,
                                              ),
                                            ),
                                            Text(
                                              p.desc,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.surface,
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
                                        ),
                                        child: Text(
                                          p.platform,
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                  const SizedBox(height: 6),
                  Text(
                    expanded ? '접기 ▲' : '더보기 ▼',
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openSuggestModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _SuggestHospitalModal(),
    );
  }
}

class _SuggestHospitalModal extends ConsumerStatefulWidget {
  const _SuggestHospitalModal();

  @override
  ConsumerState<_SuggestHospitalModal> createState() =>
      _SuggestHospitalModalState();
}

class _SuggestHospitalModalState extends ConsumerState<_SuggestHospitalModal> {
  final _nameCtrl = TextEditingController();
  String _region = '서울';
  final _addressCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final Set<String> _specialties = {};
  final _noteCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _addressCtrl.dispose();
    _phoneCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('병원 이름을 입력해주세요.')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref
          .read(hospitalsApiProvider)
          .suggest(
            HospitalSuggestPayload(
              name: _nameCtrl.text.trim(),
              region: _region,
              address: _addressCtrl.text,
              phone: _phoneCtrl.text,
              specialties: _specialties.toList(),
              note: _noteCtrl.text,
            ),
          );
      if (mounted) {
        Navigator.of(context).pop();
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('등록 완료 💕'),
            content: const Text('소중한 의견 감사드립니다. 검토 후 등록에 반영하겠습니다.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('확인'),
              ),
            ],
          ),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('요청 처리 중 오류가 발생했습니다.')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      maxChildSize: 0.9,
      minChildSize: 0.5,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const Text(
                '🏥 다니시는 병원 등록 요청',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textDark,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'BOM에 등록되어 있지 않은 병원이 있다면 알려주세요. 확인 후 정성껏 업데이트하겠습니다.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  color: AppColors.textMuted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 14),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    _formLabel('병원명 *'),
                    _formField(_nameCtrl, '예: 강남마리아여성의원'),
                    const SizedBox(height: 12),
                    _formLabel('지역 *'),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _regions
                          .skip(1)
                          .map(
                            (r) => _selectChip(
                              r,
                              _region == r,
                              () => setState(() => _region = r),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 12),
                    _formLabel('병원 주소 (선택)'),
                    _formField(_addressCtrl, '예: 서울시 강남구 도산대로 418'),
                    const SizedBox(height: 12),
                    _formLabel('전화번호 (선택)'),
                    _formField(
                      _phoneCtrl,
                      '예: 02-1234-5678',
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 12),
                    _formLabel('주요 시술 분야 (중복 선택)'),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: ['IVF', 'IUI', 'FET', 'PGT', '남성난임']
                          .map(
                            (s) => _selectChip(
                              s,
                              _specialties.contains(s),
                              () => setState(() {
                                if (_specialties.contains(s)) {
                                  _specialties.remove(s);
                                } else {
                                  _specialties.add(s);
                                }
                              }),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 12),
                    _formLabel('남기실 말씀 (선택)'),
                    TextField(
                      controller: _noteCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: '추가하고 싶은 의료진 이름이나 정보를 자유롭게 적어주세요.',
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _submitting
                                ? null
                                : () => Navigator.of(context).pop(),
                            child: const Text('취소'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _submitting ? null : _submit,
                            child: _submitting
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('제출하기'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _formLabel(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: AppColors.textDark,
      ),
    ),
  );

  Widget _formField(
    TextEditingController ctrl,
    String hint, {
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textMuted),
      ),
      style: const TextStyle(fontSize: 12, color: AppColors.textDark),
    );
  }

  Widget _selectChip(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: active ? AppColors.primary : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: active ? FontWeight.w700 : FontWeight.w400,
            color: active ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
