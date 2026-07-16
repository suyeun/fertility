import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/users_api.dart';
import '../../core/domain/mode_helpers.dart';
import '../../core/theme/app_theme.dart';
import '../../state/auth_controller.dart';
import '../../state/profile_controller.dart';
import '../../state/providers.dart';
import '../../widgets/bom_logo.dart';
import 'onboarding_data.dart';
import 'progress_bar.dart';

/// Port of apps/mobile/app/onboarding/index.tsx — 3-step wizard
/// (mode → stage → cycle length) then a completion screen.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _flow = OnboardingFlow();
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _flow.addListener(_onFlowChanged);
  }

  @override
  void dispose() {
    _flow.removeListener(_onFlowChanged);
    super.dispose();
  }

  void _onFlowChanged() => setState(() {});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: AppColors.primaryLight, width: 0.5),
            ),
            child: _done ? _CompleteScreen(data: _flow.data) : _buildSteps(),
          ),
        ),
      ),
    );
  }

  Widget _buildSteps() {
    final stageOptions = _flow.data.treatmentMode == 'iui'
        ? iuiStageOptions
        : ivfStageOptions;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            BomLogoMark(size: 28),
            SizedBox(width: 6),
            Text(
              'BOM',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        OnboardingProgressBar(
          step: _flow.displayStep,
          totalSteps: _flow.totalSteps,
          onBack: _flow.goBack,
        ),
        if (_flow.step == 1) _StepMode(onSelect: _flow.selectMode),
        if (_flow.step == 2 &&
            _flow.data.treatmentMode != null &&
            _flow.data.treatmentMode != 'natural')
          _StepStage(
            mode: _flow.data.treatmentMode!,
            options: stageOptions,
            onSelect: _flow.setCurrentStage,
          ),
        if (_flow.step == 3)
          _StepCycle(
            treatmentMode: _flow.data.treatmentMode,
            cycleLength: _flow.data.cycleLength,
            onChange: _flow.setCycleLength,
            onNext: () => setState(() => _done = true),
          ),
      ],
    );
  }
}

class _StepMode extends StatelessWidget {
  const _StepMode({required this.onSelect});
  final void Function(String mode) onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '지금 어떻게\n임신을 준비하고 있나요?',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          '선택에 따라 맞춤 기능을 바로 열어드려요 🌸',
          style: TextStyle(
            fontSize: 13,
            color: AppColors.textMuted,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 20),
        ...modeOptions.map(
          (opt) => _OptionButton(
            emoji: opt.emoji,
            label: opt.label,
            sub: opt.sub,
            iconBg: opt.color.withValues(alpha: 0.1),
            onTap: () => onSelect(opt.value),
          ),
        ),
      ],
    );
  }
}

class _StepStage extends StatelessWidget {
  const _StepStage({
    required this.mode,
    required this.options,
    required this.onSelect,
  });
  final String mode;
  final List<StageOption> options;
  final void Function(String? stage) onSelect;

  @override
  Widget build(BuildContext context) {
    final title = mode == 'iui' ? '인공수정(IUI)' : '시험관(IVF)';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$title 치료\n어느 단계인가요?',
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          '단계에 맞는 기록·알림 기능을 열어드릴게요',
          style: TextStyle(
            fontSize: 13,
            color: AppColors.textMuted,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 20),
        ...options.map(
          (opt) => _OptionButton(
            emoji: opt.emoji,
            label: opt.label,
            iconBg: AppColors.surface,
            dashed: opt.value == null,
            onTap: () => onSelect(opt.value),
          ),
        ),
      ],
    );
  }
}

class _StepCycle extends StatelessWidget {
  const _StepCycle({
    required this.treatmentMode,
    required this.cycleLength,
    required this.onChange,
    required this.onNext,
  });

  final String? treatmentMode;
  final int cycleLength;
  final void Function(int v) onChange;
  final VoidCallback onNext;

  static const _presets = [24, 26, 28, 30, 32, 35, 38, 40];

  @override
  Widget build(BuildContext context) {
    final guide = treatmentMode != null
        ? cycleGuide[treatmentMode]!
        : '평균 생리 주기를 입력해 주세요';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '생리 주기가\n며칠인가요?',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          guide,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.textMuted,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _StepButton(
              label: '−',
              onTap: () => onChange((cycleLength - 1).clamp(21, 45)),
            ),
            Column(
              children: [
                Text(
                  '$cycleLength',
                  style: const TextStyle(
                    fontSize: 64,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
                const Text(
                  '일',
                  style: TextStyle(fontSize: 16, color: AppColors.textMuted),
                ),
              ],
            ),
            _StepButton(
              label: '+',
              onTap: () => onChange((cycleLength + 1).clamp(21, 45)),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _presets.map((n) {
            final active = cycleLength == n;
            return GestureDetector(
              onTap: () => onChange(n),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: active ? AppColors.primary : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: active ? AppColors.primary : AppColors.primaryLight,
                    width: 0.5,
                  ),
                ),
                child: Text(
                  '$n일',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: active ? Colors.white : const Color(0xFF8C5060),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        const Text(
          '정확하지 않아도 괜찮아요 — 나중에 언제든지 수정할 수 있어요',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11, color: Color(0xFFC4A0AE)),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: onNext,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            child: const Text(
              '다음 →',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: const BoxDecoration(
          color: AppColors.primaryLight,
          shape: BoxShape.circle,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: const TextStyle(fontSize: 22, color: Color(0xFFC0005A)),
        ),
      ),
    );
  }
}

class _OptionButton extends StatelessWidget {
  const _OptionButton({
    required this.emoji,
    required this.label,
    this.sub,
    required this.iconBg,
    this.dashed = false,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final String? sub;
  final Color iconBg;
  final bool dashed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: dashed ? const Color(0xFFE0C0C8) : AppColors.primaryLight,
              width: 1.5,
              style: BorderStyle.solid,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  emoji,
                  style: TextStyle(fontSize: sub != null ? 24 : 20),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: dashed
                            ? AppColors.textMuted
                            : AppColors.textDark,
                      ),
                    ),
                    if (sub != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        sub!,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (sub != null)
                const Text(
                  '→',
                  style: TextStyle(color: AppColors.primaryLight, fontSize: 16),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

const _modeConfig = {
  'natural': (
    emoji: '🌱',
    color: Color(0xFF22C55E),
    title: '자연임신 준비\n파트너가 생겼어요!',
    desc: '기초체온·배란테스트기 기록으로 배란 흐름을 함께 살펴봐요.',
  ),
  'iui': (
    emoji: '💉',
    color: Color(0xFF3B82F6),
    title: '인공수정 전 과정을\n함께할게요!',
    desc: '시술 일정·약물 알림, 배란 모니터링, 수치 기록까지 모두 열렸어요.',
  ),
  'ivf': (
    emoji: '🔬',
    color: Color(0xFF8B5CF6),
    title: '시험관 전 과정을\n함께할게요!',
    desc: '난포 모니터링, 채취·이식 일정, 호르몬 수치 기록까지 모두 열렸어요.',
  ),
};

class _CompleteScreen extends ConsumerStatefulWidget {
  const _CompleteScreen({required this.data});
  final OnboardingData data;

  @override
  ConsumerState<_CompleteScreen> createState() => _CompleteScreenState();
}

class _CompleteScreenState extends ConsumerState<_CompleteScreen> {
  bool _saving = false;

  Future<void> _handleStart() async {
    setState(() => _saving = true);
    final mode = widget.data.treatmentMode ?? 'natural';
    final userMode = mode == 'natural' ? 'NATURAL' : 'CLINIC';
    try {
      final usersApi = ref.read(usersApiProvider);
      final updated = await usersApi.updateProfile(
        UpdateProfilePayload(
          currentMode: userMode,
          treatmentStage: mode,
          currentStage: widget.data.currentStage,
          averageCycleLength: widget.data.cycleLength,
        ),
      );
      await ref.read(profileControllerProvider.notifier).saveProfile(updated);
      ref.read(authControllerProvider.notifier).markOnboarded();
    } catch (_) {
      // Matches RN CompleteScreen: swallow and let the user retry.
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mode = widget.data.treatmentMode ?? 'natural';
    final config = _modeConfig[mode]!;

    return Column(
      children: [
        Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            color: config.color.withValues(alpha: 0.13),
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(config.emoji, style: const TextStyle(fontSize: 48)),
        ),
        const SizedBox(height: 16),
        Text(
          config.title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          config.desc,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.textMuted,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '설정 정보',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '모드: ${config.emoji} ${config.title.split('\n').first}',
                style: const TextStyle(fontSize: 13, color: Color(0xFF8C5060)),
              ),
              if (mode != 'natural')
                Text(
                  '시술 단계: ${widget.data.currentStage != null ? getStageLabelKo(mode, widget.data.currentStage) : '아직 미설정'}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF8C5060),
                  ),
                ),
              Text(
                '주기: ${widget.data.cycleLength}일',
                style: const TextStyle(fontSize: 13, color: Color(0xFF8C5060)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _saving ? null : _handleStart,
            style: ElevatedButton.styleFrom(
              backgroundColor: config.color,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text(
                    '시작하기 →',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          '언제든지 설정에서 모드를 변경할 수 있어요',
          style: TextStyle(fontSize: 12, color: Color(0xFFC4A0AE)),
        ),
      ],
    );
  }
}
