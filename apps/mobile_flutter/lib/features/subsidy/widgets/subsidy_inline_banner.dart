import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

/// 캘린더 시술 일정 등록 직후 노출되는 인라인 배너 (진입점: 캘린더 연동).
///
/// 신선/동결 배아를 구분할 수 없는 현재 시술 칩 체계상 확정 단일 금액은 절대
/// 표시하지 않는다. 핵심 메시지는 금액이 아니라 "지원결정통지서를 시술 시작
/// 전에 발급받아야 한다"는 시술 종류와 무관하게 항상 참인 타이밍 경고다.
/// [showRange]가 true인 시험관(IVF/FET) 계열 칩에 한해서만 범위 표기를
/// 추가로 보여준다 — 그마저도 단일 확정 금액이 아닌 범위("50~110만 원")다.
class SubsidyInlineBanner extends StatelessWidget {
  const SubsidyInlineBanner({
    super.key,
    required this.onConfirm,
    required this.onDismiss,
    this.showRange = false,
  });

  final VoidCallback onConfirm;
  final VoidCallback onDismiss;
  final bool showRange;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.accentGreenLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.accentGreen),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('💰', style: TextStyle(fontSize: 18)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '이 시술은 정부 지원 대상이에요',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    '시술 시작 전 지원결정통지서가 필요합니다',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                  if (showRange) ...[
                    const SizedBox(height: 2),
                    const Text(
                      '최대 50~110만 원 지원 대상 (신선/동결 여부에 따라 달라요)',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: onConfirm,
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      '내 지원금 계산하기 →',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accentGreen,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: onDismiss,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              icon: const Icon(
                Icons.close_rounded,
                size: 16,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
