import 'package:flutter/material.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/domain/clinic_gate.dart';
import '../core/purchases/purchases_service.dart';
import '../core/theme/app_theme.dart';

const _termsOfUseUrl =
    'https://cuboid-string-459.notion.site/BOM-3ab4e4079c788019b0e9e946d351ca7f';
const _privacyPolicyUrl =
    'https://cuboid-string-459.notion.site/Lunera-3864e4079c7880699f4cf6ac9f9c7952';

const Map<PaywallSource, ({IconData icon, String title, String desc})>
_sourceContent = {
  PaywallSource.medicationReminder: (
    icon: Icons.medication_rounded,
    title: '약물 알림은\n프리미엄 기능이에요',
    desc: '주사·질정·경구약 투여 시각에 맞춰\n정시 푸시 알림을 보내드려요.',
  ),
  PaywallSource.multiSchedule: (
    icon: Icons.calendar_month_rounded,
    title: '다회차 일정 관리는\n프리미엄 기능이에요',
    desc: '2회차부터는 프리미엄으로\n모든 시술 일정을 한눈에 관리하세요.',
  ),
  PaywallSource.analytics: (
    icon: Icons.insights_rounded,
    title: '추이 분석은\n프리미엄 기능이에요',
    desc: '호르몬 수치·주기 패턴·시술 결과를\n장기 차트로 분석해드려요.',
  ),
  PaywallSource.subsidyCalculator: (
    icon: Icons.savings_rounded,
    title: '지원금 상세 내역은\n프리미엄 기능이에요',
    desc: '항목별 지원금 상세·신청 서류 체크리스트·\n마감 알림까지 한 번에 확인하세요.',
  ),
  PaywallSource.generic: (
    icon: Icons.auto_awesome_rounded,
    title: '프리미엄 기능이에요',
    desc: '더 많은 기능을 이용하려면\nBOM 프리미엄을 시작해보세요.',
  ),
};

const _premiumFeatures = [
  (icon: Icons.medication_rounded, text: '약물·주사 정시 알림 (핵심)'),
  (icon: Icons.calendar_month_rounded, text: '다회차 시술 일정 무제한 등록'),
  (icon: Icons.insights_rounded, text: '호르몬·주기 추이 분석 차트'),
  (icon: Icons.auto_awesome_rounded, text: '감정 일기 AI 분석 + 매일 응원'),
];

/// Port of apps/mobile/components/PaywallModal.tsx.
Future<void> showPaywallModal(
  BuildContext context, {
  required PaywallSource source,
  VoidCallback? onSuccess,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => _PaywallSheet(source: source, onSuccess: onSuccess),
  );
}

class _PaywallSheet extends StatefulWidget {
  const _PaywallSheet({required this.source, this.onSuccess});
  final PaywallSource source;
  final VoidCallback? onSuccess;

  @override
  State<_PaywallSheet> createState() => _PaywallSheetState();
}

class _PaywallSheetState extends State<_PaywallSheet> {
  List<Package> _packages = [];
  Package? _selected;
  bool _loading = true;
  bool _purchasing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final pkgs = await PurchasesService.instance.getOfferings();
    Package? annual;
    for (final p in pkgs) {
      if (p.storeProduct.identifier.startsWith(
        PurchasesService.productIdAnnual,
      )) {
        annual = p;
        break;
      }
    }
    if (mounted) {
      setState(() {
        _packages = pkgs;
        _selected = annual ?? (pkgs.isNotEmpty ? pkgs.first : null);
        _loading = false;
      });
    }
  }

  bool _isAnnual(Package pkg) =>
      pkg.storeProduct.identifier.startsWith(PurchasesService.productIdAnnual);

  String _trialDisclosure(Package pkg) {
    final store = pkg.storeProduct;
    final periodWord = _isAnnual(pkg) ? '매년' : '매월';
    final intro = store.introductoryPrice;
    if (intro != null && intro.price == 0) {
      final trial = _periodLabel(intro.periodNumberOfUnits, intro.periodUnit);
      return '$trial 무료체험 후 $periodWord ${store.priceString}이 자동 결제돼요.\n'
          '체험 종료 전 언제든 해지하면 요금이 청구되지 않아요.';
    }
    return '$periodWord ${store.priceString}이 자동 결제돼요.\n'
        '언제든지 App Store / Play Store에서 해지할 수 있어요.';
  }

  String _periodLabel(int units, PeriodUnit unit) {
    switch (unit) {
      case PeriodUnit.day:
        return '$units일';
      case PeriodUnit.week:
        return '$units주';
      case PeriodUnit.month:
        return '$units개월';
      case PeriodUnit.year:
        return '$units년';
      case PeriodUnit.unknown:
        return '$units';
    }
  }

  String _ctaLabel(Package? pkg) {
    if (pkg == null) return '구독 시작';
    final intro = pkg.storeProduct.introductoryPrice;
    if (intro != null && intro.price == 0) {
      return '${_periodLabel(intro.periodNumberOfUnits, intro.periodUnit)} 무료체험 시작';
    }
    return '구독 시작하기';
  }

  Future<void> _handleStartTrial() async {
    final selected = _selected;
    if (selected == null) return;
    setState(() => _purchasing = true);
    final result = await PurchasesService.instance.purchasePackage(selected);
    if (mounted) setState(() => _purchasing = false);
    if (!mounted) return;
    if (result.success) {
      Navigator.of(context).pop();
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('구독 시작 🌸'),
          content: const Text('약물 알림을 포함한 모든 프리미엄 기능을 사용해보세요.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                widget.onSuccess?.call();
              },
              child: const Text('확인'),
            ),
          ],
        ),
      );
    } else if (result.error != null && result.error != 'cancelled') {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('결제 오류'),
          content: Text(result.error ?? '잠시 후 다시 시도해주세요.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('확인'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = _sourceContent[widget.source]!;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.92,
      minChildSize: 0.5,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      top: -12,
                      right: -8,
                      child: IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(
                          Icons.close,
                          color: AppColors.textMuted,
                          size: 18,
                        ),
                      ),
                    ),
                    Column(
                      children: [
                        Icon(
                          content.icon,
                          size: 40,
                          color: AppColors.primary,
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.3),
                            ),
                          ),
                          child: const Text(
                            '🔒 프리미엄 전용',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          content.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textDark,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          content.desc,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textMuted,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  children: [
                    const Text(
                      '프리미엄 포함 기능',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Column(
                        children: _premiumFeatures
                            .map(
                              (f) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 26,
                                      child: Icon(
                                        f.icon,
                                        size: 18,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        f.text,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          color: AppColors.textDark,
                                          height: 1.4,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 18),
                    if (_loading)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: CircularProgressIndicator(
                            color: AppColors.primary,
                          ),
                        ),
                      )
                    else if (_packages.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: Text(
                            '구독 플랜을 불러올 수 없어요.\n잠시 후 다시 시도해주세요.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                              height: 1.5,
                            ),
                          ),
                        ),
                      )
                    else
                      Column(
                        children: _packages.map((pkg) {
                          final isSel = _selected?.identifier == pkg.identifier;
                          final annual = _isAnnual(pkg);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () => setState(() => _selected = pkg),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: isSel
                                      ? const Color(0xFFFFF8FA)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSel
                                        ? AppColors.primary
                                        : AppColors.primaryLight,
                                    width: 1.5,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 20,
                                      height: 20,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: isSel
                                              ? AppColors.primary
                                              : AppColors.primaryLight,
                                          width: 2,
                                        ),
                                      ),
                                      alignment: Alignment.center,
                                      child: isSel
                                          ? Container(
                                              width: 10,
                                              height: 10,
                                              decoration: const BoxDecoration(
                                                shape: BoxShape.circle,
                                                color: AppColors.primary,
                                              ),
                                            )
                                          : null,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            annual ? '연간 구독' : '월간 구독',
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: isSel
                                                  ? AppColors.textDark
                                                  : AppColors.textMuted,
                                            ),
                                          ),
                                          if (annual)
                                            Text(
                                              '월 ${(pkg.storeProduct.price / 12).round()}원 환산',
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    Text.rich(
                                      TextSpan(
                                        text: pkg.storeProduct.priceString,
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                          color: isSel
                                              ? AppColors.primary
                                              : AppColors.textMuted,
                                        ),
                                        children: [
                                          TextSpan(
                                            text: annual ? '/년' : '/월',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w400,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    const SizedBox(height: 6),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed:
                            (_selected == null || _purchasing || _loading)
                            ? null
                            : _handleStartTrial,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        child: _purchasing
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                _ctaLabel(_selected),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (_selected != null)
                      Text(
                        _trialDisclosure(_selected!),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textDark,
                          height: 1.5,
                        ),
                      ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TextButton(
                          onPressed: () =>
                              launchUrl(Uri.parse(_termsOfUseUrl)),
                          child: const Text(
                            '이용약관',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textMuted,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                        const Text(
                          '·',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                        TextButton(
                          onPressed: () =>
                              launchUrl(Uri.parse(_privacyPolicyUrl)),
                          child: const Text(
                            '개인정보처리방침',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textMuted,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Center(
                      child: TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text(
                          '나중에',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
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
}
