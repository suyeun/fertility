import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/subsidy_api.dart';
import '../../core/domain/clinic_gate.dart';
import '../../core/domain/subsidy_calculator.dart';
import '../../core/models/subsidy.dart';
import '../../core/theme/app_theme.dart';
import '../../state/profile_controller.dart';
import '../../state/providers.dart';
import '../../widgets/paywall_modal.dart';

const _procedureOrder = ['ivf_fresh', 'ivf_frozen', 'iui'];

const _requiredDocs = [
  '난임진단서 (정부지정 난임시술 의료기관 발급)',
  '지원결정통지서 (시술 시작 전 필수 발급)',
  '건강보험 자격확인서',
  '시술비 영수증 · 세부내역서',
];

const _processTimeline = [
  (step: '1', label: '지원결정통지서 발급', desc: '시술 시작 전 정부24/e보건소/관할 보건소에서 신청'),
  (step: '2', label: '시술 진행', desc: '지정 의료기관에서 시술'),
  (step: '3', label: '시술비 청구', desc: '시술 후 영수증 등 서류로 지자체에 청구'),
];

const _medicationClaimGuide = [
  '유산방지제(프로게스테론 제제)',
  '착상보조제',
  '배아동결 관리비',
  '냉동난자 해동비',
];

/// 신규 화면: 난임 시술 지원금 계산기.
/// Port of the user-provided pseudocode in SubsidyCalculator — this screen is
/// the UI wrapper: 3단계 입력 → 결과(무료 총액/유료 상세).
class SubsidyCalculatorScreen extends ConsumerStatefulWidget {
  const SubsidyCalculatorScreen({super.key, this.initialProcedureKey});

  /// 캘린더 배너에서 넘어올 때의 추정값 — 사용자가 Step 2에서 직접 확정한다.
  final String? initialProcedureKey;

  @override
  ConsumerState<SubsidyCalculatorScreen> createState() =>
      _SubsidyCalculatorScreenState();
}

class _SubsidyCalculatorScreenState
    extends ConsumerState<SubsidyCalculatorScreen> {
  int _step = 0; // 0,1,2 = 입력 단계, 3 = 결과
  bool _loading = true;

  NationalRule? _national;
  LocalRule? _local;
  UserSubsidyProfile? _profile;

  String? _regionCode;
  String? _procedureKey;
  final _currentCountCtrl = TextEditingController(text: '0');
  final Set<String> _extraKeys = {};

  SubsidyCalculationResult? _result;

  @override
  void initState() {
    super.initState();
    _procedureKey = widget.initialProcedureKey;
    _load();
  }

  @override
  void dispose() {
    _currentCountCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ref.read(subsidyApiProvider).getRules(),
        ref.read(subsidyApiProvider).getProfile(),
      ]);
      final rules = results[0] as SubsidyRules;
      final profile = results[1] as UserSubsidyProfile;
      if (!mounted) return;
      setState(() {
        _national = rules.national;
        _local = rules.local;
        _profile = profile;
        _regionCode = profile.regionCode;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  SubsidyRegion? get _selectedRegion => _local?.findByCode(_regionCode);

  UsedCounts get _usedCounts {
    final baseline = _profile?.usedCounts ?? const UsedCounts();
    final entered = int.tryParse(_currentCountCtrl.text) ?? 0;
    final proc = _national?.procedures[_procedureKey];
    if (proc == null) return baseline;
    if (proc.countGroup == 'iui') {
      return UsedCounts(ivf: baseline.ivf, iui: entered);
    }
    return UsedCounts(ivf: entered, iui: baseline.iui);
  }

  void _calculate() {
    final national = _national;
    final procedureKey = _procedureKey;
    if (national == null || procedureKey == null) return;

    final result = SubsidyCalculator.calculate(
      national: national,
      local: _selectedRegion,
      procedureKey: procedureKey,
      extraKeys: _extraKeys.toList(),
      used: _usedCounts,
      hasBirthSinceStart: (_profile?.birthsSinceStart ?? 0) > 0,
    );

    setState(() {
      _result = result;
      _step = 3;
    });

    if (result.eligible) {
      _persistCalculation(procedureKey, result);
    }
  }

  Future<void> _persistCalculation(
    String procedureKey,
    SubsidyCalculationResult result,
  ) async {
    try {
      await ref.read(subsidyApiProvider).saveCalculation({
        'procedure': procedureKey,
        'extras': _extraKeys.toList(),
        'estimatedTotal': result.totalMax,
      });
      await ref.read(subsidyApiProvider).saveProfile({
        if (_regionCode != null) 'regionCode': _regionCode,
        'usedCounts': _usedCounts.toJson(),
      });
    } catch (_) {
      // 계산 결과 저장 실패는 사용자에게 노출하지 않음 — 화면 표시는 이미 완료됨.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBFC),
      appBar: AppBar(
        title: const Text('지원금 계산기'),
        leading: IconButton(
          onPressed: () => _step > 0 && _step < 3
              ? setState(() => _step -= 1)
              : context.pop(),
          icon: const Icon(Icons.chevron_left, color: AppColors.textMuted),
        ),
      ),
      body: SafeArea(
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.accentGreen),
              )
            : Column(
                children: [
                  if (_step < 3) _ProgressBar(step: _step),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: _buildStepBody(),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildStepBody() {
    switch (_step) {
      case 0:
        return _buildRegionStep();
      case 1:
        return _buildProcedureStep();
      case 2:
        return _buildExtrasStep();
      default:
        return _buildResultStep();
    }
  }

  Widget _buildRegionStep() {
    final regions = _local?.regions ?? const [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepTitle('거주지가 어디세요?'),
        const SizedBox(height: 4),
        const Text(
          '부부 중 신청자(여성) 기준 주소를 선택해주세요.',
          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ...regions.map(
              (r) => _selectChip(
                r.regionName,
                _regionCode == r.regionCode,
                () => setState(() => _regionCode = r.regionCode),
              ),
            ),
            _selectChip(
              '기타 지역',
              _regionCode == null,
              () => setState(() => _regionCode = null),
            ),
          ],
        ),
        if (_regionCode == null) ...[
          const SizedBox(height: 10),
          _noticeBox('지역 데이터가 아직 없어요. 국가 기준으로만 계산되며, 정확한 금액은 관할 보건소에서 확인해주세요.'),
        ],
        const SizedBox(height: 24),
        _nextButton('다음', () => setState(() => _step = 1)),
      ],
    );
  }

  Widget _buildProcedureStep() {
    final procedures = _national?.procedures ?? const {};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepTitle('어떤 시술을 진행하세요?'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _procedureOrder
              .where((k) => procedures.containsKey(k))
              .map(
                (k) => _selectChip(
                  procedures[k]!.label,
                  _procedureKey == k,
                  () => setState(() => _procedureKey = k),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 20),
        const Text(
          '현재까지 사용한 지원 횟수 (누적 차수)',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _currentCountCtrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: '예: 2'),
        ),
        const SizedBox(height: 24),
        _nextButton(
          '다음',
          _procedureKey == null ? null : () => setState(() => _step = 2),
        ),
      ],
    );
  }

  Widget _buildExtrasStep() {
    final extras = _national?.extras ?? const {};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _StepTitle('해당하는 항목이 있나요?'),
        const SizedBox(height: 4),
        const Text(
          '해당하는 항목을 모두 선택해주세요.',
          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        const SizedBox(height: 16),
        ...extras.entries.map(
          (e) => CheckboxListTile(
            value: _extraKeys.contains(e.key),
            onChanged: (v) => setState(() {
              if (v ?? false) {
                _extraKeys.add(e.key);
              } else {
                _extraKeys.remove(e.key);
              }
            }),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
            activeColor: AppColors.accentGreen,
            title: Text(
              e.value.label,
              style: const TextStyle(fontSize: 13, color: AppColors.textDark),
            ),
          ),
        ),
        const SizedBox(height: 20),
        _nextButton('계산하기', _calculate),
      ],
    );
  }

  Widget _buildResultStep() {
    final result = _result;
    if (result == null) return const SizedBox.shrink();

    if (!result.eligible) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _StepTitle('아쉽지만 이번엔 어려울 것 같아요'),
          const SizedBox(height: 10),
          Text(
            result.reason ?? '',
            style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
          ),
          const SizedBox(height: 20),
          _disclaimerBox(),
        ],
      );
    }

    final profile = ref.watch(profileControllerProvider);
    final isPremium = profile != null && isPremiumProfile(profile);
    final hasLocalBenefit = result.localBenefits.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (result.isStale) _staleBadge(),
        const SizedBox(height: 8),
        const Text(
          '예상 지원금',
          style: TextStyle(fontSize: 13, color: AppColors.textMuted),
        ),
        const SizedBox(height: 4),
        Text(
          formatMaxAmount(result.totalMax),
          style: const TextStyle(
            fontSize: 36,
            fontWeight: FontWeight.w800,
            color: AppColors.accentGreen,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.accentGreenLight,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _summaryRow('국가 지원', '적용됨'),
              _summaryRow('지자체 추가 지원', hasLocalBenefit ? '있음' : '없음'),
              _summaryRow('남은 지원 횟수', '${result.remainingCount}회'),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          '항목별 상세 내역',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
        const SizedBox(height: 10),
        Stack(
          children: [
            Opacity(
              opacity: isPremium ? 1 : 0.4,
              child: IgnorePointer(
                ignoring: !isPremium,
                child: Column(
                  children: [
                    ...result.lineItems.map(
                      (item) => _lineItemRow(item.label, item.amount, isPremium),
                    ),
                    const SizedBox(height: 16),
                    _checklistSection(),
                    const SizedBox(height: 16),
                    _timelineSection(),
                    const SizedBox(height: 16),
                    _medicationGuideSection(),
                  ],
                ),
              ),
            ),
            if (!isPremium)
              Positioned.fill(
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.primaryLight),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.lock_rounded,
                          color: AppColors.textDark,
                          size: 20,
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          '항목별 상세 · 서류 체크리스트 ·\n신청 절차 · 약제비 가이드',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 10),
                        ElevatedButton(
                          onPressed: () => showPaywallModal(
                            context,
                            source: PaywallSource.subsidyCalculator,
                          ),
                          child: const Text('구독하고 전체 보기'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 20),
        _disclaimerBox(),
      ],
    );
  }

  Widget _lineItemRow(String label, int amount, bool isPremium) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 13, color: AppColors.textDark),
          ),
          Text(
            isPremium ? formatMaxAmount(amount) : '₩•••,•••',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _checklistSection() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '신청 서류 체크리스트',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          ..._requiredDocs.map(
            (d) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_box_outline_blank_rounded,
                    size: 16,
                    color: AppColors.textMuted,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      d,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textDark,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _timelineSection() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '신청 절차',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          ..._processTimeline.map(
            (p) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(
                '${p.step}. ${p.label} — ${p.desc}',
                style: const TextStyle(fontSize: 12, color: AppColors.textDark),
              ),
            ),
          ),
          const SizedBox(height: 4),
          TextButton.icon(
            onPressed: () => context.push('/subsidy-progress'),
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              foregroundColor: AppColors.accentGreen,
            ),
            icon: const Icon(Icons.checklist_rounded, size: 16),
            label: const Text(
              '회차별 신청 진행 체크하기',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _medicationGuideSection() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '약제비 청구 가이드',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _medicationClaimGuide.join(' · '),
            style: const TextStyle(fontSize: 12, color: AppColors.textDark),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppColors.accentGreen,
          ),
        ),
      ],
    ),
  );

  Widget _staleBadge() => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF8E1),
      borderRadius: BorderRadius.circular(20),
    ),
    child: const Text(
      '정보 확인 중',
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: Color(0xFF92400E),
      ),
    ),
  );

  Widget _noticeBox(String text) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF8E1),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      text,
      style: const TextStyle(fontSize: 11, color: Color(0xFF92400E), height: 1.4),
    ),
  );

  Widget _disclaimerBox() => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: const Color(0xFFF8FAFC),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: const Color(0xFFE2E8F0)),
    ),
    child: const Text(
      '본 정보는 참고용이며, 실제 지원 여부와 금액은 관할 보건소의 결정에 따릅니다. 의료적 판단이나 시술 결정에 대한 조언이 아닙니다.',
      style: TextStyle(fontSize: 10, color: Color(0xFF64748B), height: 1.5),
    ),
  );

  Widget _selectChip(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.accentGreen : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? AppColors.accentGreen : AppColors.primaryLight,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: active ? Colors.white : AppColors.textDark,
          ),
        ),
      ),
    );
  }

  Widget _nextButton(String label, VoidCallback? onTap) => SizedBox(
    width: double.infinity,
    child: ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.accentGreen,
        padding: const EdgeInsets.symmetric(vertical: 16),
      ),
      child: Text(label),
    ),
  );
}

class _StepTitle extends StatelessWidget {
  const _StepTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: AppColors.textDark,
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.step});
  final int step;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: List.generate(3, (i) {
          final active = i <= step;
          return Expanded(
            child: Container(
              height: 4,
              margin: EdgeInsets.only(right: i < 2 ? 6 : 0),
              decoration: BoxDecoration(
                color: active ? AppColors.accentGreen : AppColors.primaryLight,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          );
        }),
      ),
    );
  }
}
