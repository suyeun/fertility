import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

/// Port of apps/mobile/components/UpdateModal.tsx + lib/useVersionCheck.ts,
/// consolidated into a single implementation (the RN app had two competing
/// copies — one inline in _layout.tsx, one as this standalone component —
/// this rewrite keeps only the more complete standalone version's behavior).
class UpdateModalOverlay extends StatelessWidget {
  const UpdateModalOverlay({
    super.key,
    required this.status, // 'force' | 'optional' | 'ok' | 'idle'
    required this.message,
    required this.onUpdate,
    this.onLater,
  });

  final String status;
  final String message;
  final VoidCallback onUpdate;
  final VoidCallback? onLater;

  @override
  Widget build(BuildContext context) {
    final visible = status == 'force' || status == 'optional';
    if (!visible) return const SizedBox.shrink();
    final isForce = status == 'force';

    return PopScope(
      canPop: !isForce,
      child: Material(
        color: const Color(0x665A3042),
        child: Center(
          child: Container(
            margin: const EdgeInsets.all(32),
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🌸', style: TextStyle(fontSize: 44)),
                const SizedBox(height: 12),
                Text(
                  isForce ? '업데이트가 필요해요' : '새 버전이 출시됐어요',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textDark,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  message.isNotEmpty
                      ? message
                      : (isForce
                            ? '이 버전은 더 이상 지원되지 않아요.\n계속 사용하려면 업데이트해 주세요.'
                            : '더 나은 루네라를 경험해보세요.'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textMuted,
                    height: 1.5,
                  ),
                ),
                if (isForce) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.primaryLight),
                    ),
                    child: const Text(
                      '⚠️ 업데이트 후 앱을 사용할 수 있어요',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: onUpdate,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(isForce ? '지금 업데이트하기' : '업데이트하기'),
                  ),
                ),
                if (!isForce && onLater != null)
                  TextButton(
                    onPressed: onLater,
                    child: const Text(
                      '나중에 할게요',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textMuted,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
