import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Port of apps/mobile/components/onboarding/ProgressBar.tsx.
class OnboardingProgressBar extends StatelessWidget {
  const OnboardingProgressBar({
    super.key,
    required this.step,
    required this.totalSteps,
    required this.onBack,
  });

  final int step;
  final int totalSteps;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (step > 1)
                IconButton(
                  onPressed: onBack,
                  icon: const Icon(
                    Icons.arrow_back,
                    size: 20,
                    color: AppColors.textMuted,
                  ),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                )
              else
                const SizedBox(width: 20),
              const Spacer(),
              Text(
                '$step / $totalSteps',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: step / totalSteps,
              minHeight: 6,
              backgroundColor: AppColors.primaryLight,
              valueColor: const AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }
}
