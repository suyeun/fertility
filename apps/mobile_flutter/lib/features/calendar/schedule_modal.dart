import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/domain/clinic_gate.dart';
import '../../core/domain/schedule_helpers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';

/// Port of the schedule-creation modal in
/// apps/mobile/app/(tabs)/calendar/index.tsx.
class ScheduleModal extends ConsumerStatefulWidget {
  const ScheduleModal({
    super.key,
    required this.selectedDateStr,
    required this.treatmentMode,
    required this.isPremium,
    required this.existingScheduleCount,
    required this.onPaywall,
    required this.onSaved,
  });

  final String selectedDateStr;
  final TreatmentMode treatmentMode;
  final bool isPremium;
  final int existingScheduleCount;
  final void Function(PaywallSource source) onPaywall;
  final void Function(StageSuggestion? suggestion) onSaved;

  @override
  ConsumerState<ScheduleModal> createState() => _ScheduleModalState();
}

class _ScheduleModalState extends ConsumerState<ScheduleModal> {
  String? _scheduleChipValue;
  final _titleCtrl = TextEditingController();
  final _timeCtrl = TextEditingController(text: '09:00');
  final _hospitalCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  final _medNameCtrl = TextEditingController();
  final _medDoseCtrl = TextEditingController();
  final _medTimesCtrl = TextEditingController(text: '08:00');
  final List<Medication> _medications = [];

  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _timeCtrl.dispose();
    _hospitalCtrl.dispose();
    _notesCtrl.dispose();
    _medNameCtrl.dispose();
    _medDoseCtrl.dispose();
    _medTimesCtrl.dispose();
    super.dispose();
  }

  void _addMedication() {
    if (_medNameCtrl.text.isEmpty || _medDoseCtrl.text.isEmpty) return;
    setState(() {
      _medications.add(
        Medication(
          name: _medNameCtrl.text,
          dose: _medDoseCtrl.text,
          times: _medTimesCtrl.text.split(',').map((e) => e.trim()).toList(),
          startDate: widget.selectedDateStr,
        ),
      );
      _medNameCtrl.clear();
      _medDoseCtrl.clear();
    });
  }

  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty) return;

    final canRegister = canUseClinicScheduler(
      ClinicFeature.registerFirstSchedule,
      ClinicGateContext(
        isPremium: widget.isPremium,
        existingScheduleCount: widget.existingScheduleCount,
      ),
    );
    if (!canRegister) {
      widget.onPaywall(PaywallSource.multiSchedule);
      return;
    }

    setState(() => _saving = true);
    try {
      final chipsResult = getScheduleChips(widget.treatmentMode);
      final activeValue = _scheduleChipValue ?? chipsResult.defaultValue;
      ScheduleChip? activeChip;
      for (final c in chipsResult.chips) {
        if (c.value == activeValue) {
          activeChip = c;
          break;
        }
      }
      final resolvedType = activeChip?.backendType ?? 'other';

      final fullDateTime =
          '${widget.selectedDateStr}T${_timeCtrl.text.isNotEmpty ? _timeCtrl.text : '09:00'}';
      await ref.read(treatmentApiProvider).save({
        'type': resolvedType,
        'title': _titleCtrl.text.trim(),
        'scheduledAt': fullDateTime,
        'status': 'scheduled',
        'hospitalName': _hospitalCtrl.text,
        'notes': _notesCtrl.text,
        'medications': _medications.map((m) => m.toJson()).toList(),
      });

      final suggestion = getNextStageSuggestion(
        activeValue ?? '',
        null,
        widget.treatmentMode,
      );
      widget.onSaved(suggestion);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('일정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chipsResult = getScheduleChips(widget.treatmentMode);
    final activeValue = _scheduleChipValue ?? chipsResult.defaultValue;
    final showPremiumLock =
        !widget.isPremium && widget.treatmentMode != 'natural';

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.92,
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      '새 일정 추가 (${widget.selectedDateStr}) 📅',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textDark,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('닫기'),
                  ),
                ],
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    _label('일정 종류'),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: chipsResult.chips.map((chip) {
                        final active = activeValue == chip.value;
                        return GestureDetector(
                          onTap: () =>
                              setState(() => _scheduleChipValue = chip.value),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: active
                                  ? AppColors.primary
                                  : AppColors.surface,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              '${chip.emoji} ${chip.label}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: active
                                    ? Colors.white
                                    : AppColors.textDark,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),
                    _label('일정 시간 (HH:MM)'),
                    _textField(_timeCtrl, '예: 09:00'),
                    const SizedBox(height: 14),
                    _label('일정 제목 *'),
                    _textField(_titleCtrl, '예: 초음파 진료 및 난포주사 처방'),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _label('병원 이름'),
                              _textField(_hospitalCtrl, '예: 마리아병원'),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _label('메모'),
                              _textField(_notesCtrl, '공복 여부 등'),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Stack(
                      children: [
                        Opacity(
                          opacity: showPremiumLock ? 0.4 : 1,
                          child: IgnorePointer(
                            ignoring: showPremiumLock,
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    '💊 동반 복용/투약 약물 추가',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textDark,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _textField(
                                          _medNameCtrl,
                                          '약물/주사명',
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: _textField(
                                          _medDoseCtrl,
                                          '용량 (예: 150IU)',
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _textField(
                                          _medTimesCtrl,
                                          '투약 시간 (예: 08:00)',
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      ElevatedButton(
                                        onPressed: _addMedication,
                                        child: const Text('추가'),
                                      ),
                                    ],
                                  ),
                                  ..._medications.asMap().entries.map(
                                    (e) => Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              '${e.value.name} (${e.value.dose}) — 🕒 ${e.value.times.join(', ')}',
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: AppColors.textDark,
                                              ),
                                            ),
                                          ),
                                          TextButton(
                                            onPressed: () => setState(
                                              () =>
                                                  _medications.removeAt(e.key),
                                            ),
                                            child: const Text(
                                              '삭제',
                                              style: TextStyle(
                                                color: Colors.red,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        if (showPremiumLock)
                          Positioned.fill(
                            child: Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Text(
                                    '💊 복용 알림은 프리미엄 기능이에요',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textDark,
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () => widget.onPaywall(
                                      PaywallSource.medicationReminder,
                                    ),
                                    child: const Text(
                                      '지금 구독하기 →',
                                      style: TextStyle(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: (_titleCtrl.text.trim().isEmpty || _saving)
                            ? null
                            : _submit,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
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
                            : const Text('일정 저장하기'),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: AppColors.textMuted,
      ),
    ),
  );

  Widget _textField(TextEditingController ctrl, String hint) {
    return TextField(
      controller: ctrl,
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.primaryLight),
      ),
      style: const TextStyle(fontSize: 13, color: AppColors.textDark),
    );
  }
}
