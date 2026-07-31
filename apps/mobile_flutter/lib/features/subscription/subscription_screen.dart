import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/purchases/purchases_service.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/bom_logo.dart';

const _termsOfUseUrl =
    'https://cuboid-string-459.notion.site/BOM-3ab4e4079c788019b0e9e946d351ca7f';
const _privacyPolicyUrl =
    'https://cuboid-string-459.notion.site/Lunera-3864e4079c7880699f4cf6ac9f9c7952';

const _features = [
  (icon: Icons.savings_rounded, text: '💰 지원금 상세 내역 & 신청 서류 체크리스트'),
  (icon: Icons.alarm_rounded, text: '⏰ 지원금 신청 마감 자동 알림'),
  (icon: Icons.medical_information_rounded, text: '💊 약제비 청구 가이드'),
  (icon: Icons.thermostat_rounded, text: '호르몬 수치 트렌드 분석 리포트'),
  (icon: Icons.medication_rounded, text: '약물 복용 알림 + 시술 일정 관리'),
  (icon: Icons.bar_chart_rounded, text: '사이클 패턴 심층 분석'),
  (icon: Icons.auto_awesome_rounded, text: '감정 일기 AI 분석 — 매일 응원 메시지'),
];

/// Port of apps/mobile/app/subscription/index.tsx.
class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends ConsumerState<SubscriptionScreen> {
  List<Package> _packages = [];
  Package? _selected;
  bool _loading = true;
  bool _purchasing = false;
  bool _restoring = false;
  SubscriptionStatus _currentStatus = const SubscriptionStatus(isActive: false);

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final results = await Future.wait([
      PurchasesService.instance.getOfferings(),
      PurchasesService.instance.getSubscriptionStatus(),
    ]);
    final pkgs = results[0] as List<Package>;
    final status = results[1] as SubscriptionStatus;

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
        _currentStatus = status;
        _selected = annual ?? (pkgs.isNotEmpty ? pkgs.first : null);
        _loading = false;
      });
    }
  }

  bool _isAnnual(Package pkg) =>
      pkg.storeProduct.identifier.startsWith(PurchasesService.productIdAnnual);

  String _monthlyPriceFromAnnual(Package pkg) {
    final monthly = (pkg.storeProduct.price / 12).round();
    return '월 $monthly원';
  }

  String _trialDisclosure(Package pkg) {
    final store = pkg.storeProduct;
    final periodWord = _isAnnual(pkg) ? '매년' : '매월';
    final intro = store.introductoryPrice;
    if (intro != null && intro.price == 0) {
      final trial = _periodLabel(intro.periodNumberOfUnits, intro.periodUnit);
      return '$trial 무료체험 후 $periodWord ${store.priceString}이 자동 결제됩니다.\n'
          '체험 종료 전 언제든 해지하면 요금이 청구되지 않아요.';
    }
    return '$periodWord ${store.priceString}이 자동 결제됩니다.\n'
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

  Future<void> _handlePurchase() async {
    final selected = _selected;
    if (selected == null) return;
    setState(() => _purchasing = true);
    final result = await PurchasesService.instance.purchasePackage(selected);
    if (mounted) setState(() => _purchasing = false);
    if (!mounted) return;
    if (result.success) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('구독 완료 🌸'),
          content: const Text('BOM 프리미엄이 활성화됐어요!\n모든 기능을 자유롭게 이용하세요.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                context.go('/home');
              },
              child: const Text('시작하기'),
            ),
          ],
        ),
      );
    } else if (result.error != 'cancelled') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.error ?? '잠시 후 다시 시도해 주세요.')),
      );
    }
  }

  Future<void> _handleRestore() async {
    setState(() => _restoring = true);
    final restored = await PurchasesService.instance.restorePurchases();
    if (mounted) setState(() => _restoring = false);
    if (!mounted) return;
    if (restored) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('복원 완료'),
          content: const Text('기존 구독이 복원됐어요 🌸'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                context.go('/home');
              },
              child: const Text('확인'),
            ),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('이 계정으로 구매한 구독 내역이 없어요.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFFFFFBFC),
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFFFBFC),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: IconButton(
                onPressed: () => context.pop(),
                icon: const Icon(Icons.close, color: AppColors.textMuted),
              ),
            ),
            const Center(child: BomLogoMark(size: 64)),
            const SizedBox(height: 8),
            const Text(
              'BOM 프리미엄',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              '임신 준비의 모든 것을 함께해요',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: AppColors.textMuted),
            ),
            const SizedBox(height: 20),
            if (_currentStatus.isActive)
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1FAE5),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '✅ 현재 구독 중${_currentStatus.expiresAt != null ? ' · ${_formatDate(_currentStatus.expiresAt!)} 만료' : ''}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF065F46),
                    ),
                  ),
                ),
              ),
            Container(
              padding: const EdgeInsets.all(18),
              margin: const EdgeInsets.only(bottom: 24),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: _features
                    .map(
                      (f) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 28,
                              child: Icon(
                                f.icon,
                                size: 20,
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
            if (_packages.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(
                  child: Text(
                    '현재 구독 플랜을 불러올 수 없어요.\n잠시 후 다시 시도해 주세요.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 13,
                      height: 1.5,
                    ),
                  ),
                ),
              )
            else
              Column(
                children: _packages.map((pkg) {
                  final isSelected = _selected?.identifier == pkg.identifier;
                  final annual = _isAnnual(pkg);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () => setState(() => _selected = pkg),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFFFFF8FA)
                              : Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.primaryLight,
                            width: 1.5,
                          ),
                        ),
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            if (annual)
                              Positioned(
                                top: -22,
                                right: 4,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Text(
                                    '🔥 최대 40% 할인',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                            Row(
                              children: [
                                Container(
                                  width: 20,
                                  height: 20,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected
                                          ? AppColors.primary
                                          : AppColors.primaryLight,
                                      width: 2,
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  child: isSelected
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
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        annual ? '연간 구독' : '월간 구독',
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          color: isSelected
                                              ? AppColors.textDark
                                              : AppColors.textMuted,
                                        ),
                                      ),
                                      if (annual)
                                        Text(
                                          '${_monthlyPriceFromAnnual(pkg)} 환산',
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
                                      fontSize: 17,
                                      fontWeight: FontWeight.w800,
                                      color: isSelected
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
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed:
                    (_selected == null ||
                        _purchasing ||
                        _currentStatus.isActive)
                    ? null
                    : _handlePurchase,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 17),
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
                        _currentStatus.isActive ? '구독 중' : '구독 시작하기',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: _restoring ? null : _handleRestore,
                child: _restoring
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.textMuted,
                        ),
                      )
                    : const Text(
                        '기존 구매 복원',
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 13,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 12),
            if (_selected != null)
              Text(
                _trialDisclosure(_selected!),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textDark,
                  height: 1.6,
                ),
              ),
            const SizedBox(height: 6),
            const Text(
              '구매 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 10,
                color: Color(0xFFC4A0AE),
                height: 1.6,
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: () => launchUrl(Uri.parse(_termsOfUseUrl)),
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
                  style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
                TextButton(
                  onPressed: () => launchUrl(Uri.parse(_privacyPolicyUrl)),
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
          ],
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return '${dt.year}.${dt.month}.${dt.day}';
  }
}
