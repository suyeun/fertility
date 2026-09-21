import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/domain/pregnancy.dart';
import '../../core/theme/app_theme.dart';
import '../../state/profile_controller.dart';

/// 임신 확인 모드 전환 — 주수 기준일을 입력하고 저장한다.
/// 기준일은 마지막 생리 시작일(LMP) 직접 입력 또는 이식일+배아 배양 일수에서 환산한다.
/// 축하·격려 문구를 강요하지 않고 중립적으로 안내한다.
class PregnancySetupScreen extends ConsumerStatefulWidget {
  const PregnancySetupScreen({super.key});

  @override
  ConsumerState<PregnancySetupScreen> createState() =>
      _PregnancySetupScreenState();
}

enum _AnchorKind { lmp, transfer }

class _PregnancySetupScreenState extends ConsumerState<PregnancySetupScreen> {
  _AnchorKind _kind = _AnchorKind.lmp;
  DateTime? _lmp;
  DateTime? _transfer;
  int _embryoDay = 5;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final existing = ref.read(profileControllerProvider)?.pregnancyLmpDate;
    if (existing != null) _lmp = DateTime.tryParse(existing);
  }

  DateTime? get _effectiveLmp {
    switch (_kind) {
      case _AnchorKind.lmp:
        return _lmp;
      case _AnchorKind.transfer:
        return _transfer == null ? null : lmpFromTransfer(_transfer!, _embryoDay);
    }
  }

  Future<void> _pick(DateTime? current, void Function(DateTime) onPicked) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current ?? now,
      firstDate: now.subtract(const Duration(days: 300)),
      lastDate: now,
    );
    if (picked != null) setState(() => onPicked(picked));
  }

  Future<void> _save() async {
    final lmp = _effectiveLmp;
    if (lmp == null) return;
    setState(() => _saving = true);
    final notifier = ref.read(profileControllerProvider.notifier);
    final current = ref.read(profileControllerProvider);
    if (current != null) {
      notifier.setCurrentStage(null);
      await notifier.saveProfile(
        current.copyWith(
          treatmentStage: 'pregnant',
          pregnancyLmpDate: toDateStr(lmp),
          pregnancyConfirmedAt: toDateStr(DateTime.now()),
        ),
      );
      await notifier.syncProfile();
    }
    if (!mounted) return;
    setState(() => _saving = false);
    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final lmp = _effectiveLmp;
    final ga = lmp != null ? gestationalAge(lmp) : null;

    return Scaffold(
      backgroundColor: const Color(0xFFFFFBFC),
      appBar: AppBar(
        title: const Text('임신 확인 모드로 전환'),
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.textDark,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            '주수 계산 기준일을 알려주세요',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '임신 주수·출산 예정일·산전 검사 시기를 계산하는 데 쓰여요. 병원에서 알려준 주수와 다르면 기준일을 조정하세요.',
            style: TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.5),
          ),
          const SizedBox(height: 18),
          _kindButton(
            _AnchorKind.lmp,
            '마지막 생리 시작일을 알아요',
            '자연임신 · 인공수정 · 생리 기준으로 안내받은 경우',
          ),
          _kindButton(
            _AnchorKind.transfer,
            '배아 이식일로 계산할게요',
            '시험관 · 동결이식 — 이식일과 배아 배양 일수로 환산',
          ),
          const SizedBox(height: 16),
          if (_kind == _AnchorKind.lmp)
            _dateField('마지막 생리 시작일', _lmp, () => _pick(_lmp, (d) => _lmp = d))
          else ...[
            _dateField(
              '배아 이식일',
              _transfer,
              () => _pick(_transfer, (d) => _transfer = d),
            ),
            const SizedBox(height: 12),
            const Text(
              '배아 배양 일수',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [3, 5, 6]
                  .map(
                    (d) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text('$d일 배아'),
                        selected: _embryoDay == d,
                        onSelected: (_) => setState(() => _embryoDay = d),
                        selectedColor: AppColors.primaryLight,
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: 20),
          if (lmp != null && ga != null) _preview(lmp, ga),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: lmp == null || _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              child: Text(_saving ? '저장 중…' : '임신 확인 모드로 전환'),
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            '시술·주기 기록은 모두 유지돼요. 설정에서 언제든 다른 모드로 되돌릴 수 있어요. 주수와 예정일은 참고용이며 진단이 아니에요.',
            style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _kindButton(_AnchorKind kind, String label, String sub) {
    final selected = _kind == kind;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => setState(() => _kind = kind),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.primaryLight,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textDark,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                sub,
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dateField(String label, DateTime? value, VoidCallback onTap) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
        const SizedBox(height: 6),
        InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primaryLight),
            ),
            child: Row(
              children: [
                const Icon(Icons.event_rounded, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  value != null ? formatDate(value) : '날짜 선택',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: value != null ? AppColors.textDark : AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _preview(DateTime lmp, GestationalAge ga) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '오늘 기준 ${ga.label} (${ga.trimester}분기)',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '출산 예정일 ${formatDate(dueDate(lmp))} · 기준일 ${formatDate(lmp)}',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
