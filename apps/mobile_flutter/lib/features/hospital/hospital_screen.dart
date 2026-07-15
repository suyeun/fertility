import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/client.dart';
import '../../core/api/misc_api.dart' show AffiliateProduct;
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
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

const _costInfo = [
  (
    title: '인공수정 (IUI)',
    gov: '3회까지 지원',
    selfPay: '20~50만원/회',
    note: '건강보험 적용 시 본인부담 약 20~30%',
  ),
  (
    title: '체외수정 (IVF)',
    gov: '신선배아 9회, 동결배아 7회',
    selfPay: '300~500만원/회',
    note: '지원 후 본인부담 약 30~50%',
  ),
  (
    title: '동결이식 (FET)',
    gov: 'IVF 지원 횟수에 포함',
    selfPay: '70~150만원/회',
    note: '신선배아보다 비용 낮음',
  ),
];

const _processSteps = [
  (step: '1', label: '난임 진단서 발급', desc: '난임 전문의에게 진단서 발급'),
  (step: '2', label: '주민센터 방문 신청', desc: '또는 복지로 온라인 신청'),
  (step: '3', label: '지원 결정 통보', desc: '소득 확인 후 보통 2~3주 소요'),
  (step: '4', label: '시술 후 비용 청구', desc: '지정 의료기관에서 급여 적용'),
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
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingHospitals = false);
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
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    '📋 정보',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                    ),
                  ),
                  Text(
                    '난임 병원 · 비용 · 지원 · 유용한 정보',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
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
      else
        ..._hospitals.map(_hospitalCard),
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

  Widget _hospitalCard(Hospital h) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primaryLight),
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
                    Text(
                      h.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textDark,
                      ),
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
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '⭐ ${h.rating ?? 0.0}',
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
              GestureDetector(
                onTap: () => _launch('tel:${h.phone}'),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.primaryLight),
                  ),
                  child: const Text(
                    '📞 전화',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  List<Widget> _costTabContent() {
    return [
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
              '기준 중위소득 180% 이하 가구 대상',
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
      const SizedBox(height: 12),
      GestureDetector(
        onTap: () => context.push('/chat'),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFEDE9FE),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFC4B5FD)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                '🤖 지원 신청이 헷갈리세요?',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF5B21B6),
                ),
              ),
              SizedBox(height: 4),
              Text(
                'AI 봄이에게 내 상황에 맞는 지원 정보를 물어보세요',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6D28D9),
                  height: 1.4,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'AI 상담 시작하기 →',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF7C3AED),
                ),
              ),
            ],
          ),
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
        ..._articles.map(_articleCard),
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
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primaryLight),
        ),
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
                              border: Border.all(color: AppColors.primaryLight),
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
                                    borderRadius: BorderRadius.circular(8),
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
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
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
