import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/domain/pregnancy.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';

/// 임신·출산 지원 안내 — 백엔드(Firestore config/birthBenefits)에서 받아 표시하고,
/// 실패하면 앱 내 폴백 데이터를 쓴다. 확인일과 면책 문구를 항상 함께 보여 준다.
class BirthBenefitsScreen extends ConsumerStatefulWidget {
  const BirthBenefitsScreen({super.key});

  @override
  ConsumerState<BirthBenefitsScreen> createState() => _BirthBenefitsScreenState();
}

class _BirthBenefitsScreenState extends ConsumerState<BirthBenefitsScreen> {
  BirthBenefitsData _data = defaultBirthBenefitsData;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final remote = await ref.read(infoApiProvider).getBirthBenefits();
      if (mounted) setState(() => _data = remote);
    } catch (_) {
      // 오프라인·서버 오류 → 폴백 유지
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBFC),
      appBar: AppBar(
        title: const Text('임신·출산 지원 안내'),
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.textDark,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.accentGreenLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '임신 확인 직후부터 출생 후까지, 시점별로 챙길 지원이에요.',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accentGreen,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '기준 확인일 ${data.verifiedAt}',
                        style: const TextStyle(fontSize: 11, color: AppColors.accentGreen),
                      ),
                      if (_loading) ...[
                        const SizedBox(width: 8),
                        const SizedBox(
                          width: 10,
                          height: 10,
                          child: CircularProgressIndicator(strokeWidth: 1.5),
                        ),
                      ] else if (data.source == 'offline') ...[
                        const SizedBox(width: 8),
                        const Text(
                          '· 저장된 기준 표시 중',
                          style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            ...data.items.map(_card),
            const SizedBox(height: 8),
            Text(
              data.disclaimer,
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card(BirthBenefit b) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primaryLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            b.title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            b.amount,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.accentGreen,
            ),
          ),
          const SizedBox(height: 8),
          _line(Icons.schedule_rounded, b.when),
          _line(Icons.how_to_reg_rounded, b.how),
          if (b.note != null && b.note!.isNotEmpty) _line(Icons.info_outline_rounded, b.note!),
          if (b.url != null && b.url!.isNotEmpty)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => _open(b.url!),
                child: const Text('신청 안내 열기 ›'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _line(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: AppColors.textMuted),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 12, color: AppColors.textDark, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
