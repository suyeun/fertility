import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/domain/clinic_gate.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';
import 'calendar_screen.dart' show conditionOptions;

({IconData icon, String label}) _typeBadge(String type) {
  switch (type) {
    case 'IVF':
      return (icon: Icons.biotech_rounded, label: '시험관');
    case 'IUI':
      return (icon: Icons.medical_services_rounded, label: '인공수정');
    case 'FET':
      return (icon: Icons.ac_unit_rounded, label: '동결이식');
    case 'monitoring':
      return (icon: Icons.monitor_heart_rounded, label: '초음파 검진');
    default:
      return (icon: Icons.event_rounded, label: '일반 진료');
  }
}

({Color bg, Color fg}) _badgeStyle(String type) {
  switch (type) {
    case 'IVF':
      return (bg: const Color(0xFFFFE4E6), fg: const Color(0xFF9F1239));
    case 'IUI':
      return (bg: const Color(0xFFFEF3C7), fg: const Color(0xFF92400E));
    case 'FET':
      return (bg: const Color(0xFFE0F2FE), fg: const Color(0xFF075985));
    case 'monitoring':
      return (bg: const Color(0xFFDCFCE7), fg: const Color(0xFF166534));
    default:
      return (bg: const Color(0xFFF3F4F6), fg: const Color(0xFF374151));
  }
}

/// Port of the day-tap "day detail" bottom sheet in
/// apps/mobile/app/(tabs)/calendar/index.tsx.
class DayDetailModal extends ConsumerStatefulWidget {
  const DayDetailModal({
    super.key,
    required this.selectedDateStr,
    required this.treatmentMode,
    required this.isPremium,
    required this.cycles,
    required this.schedules,
    required this.hormones,
    required this.cycleLength,
    required this.periodLength,
    required this.onPeriodSaved,
    required this.onOpenScheduleModal,
    required this.onGoRecords,
    required this.onPaywall,
    this.onNoteSaved,
    this.onEditSchedule,
    this.onSchedulesChanged,
  });

  /// 일정 수정 — 부모가 수정 모달을 열고, 저장된 일정(취소 시 null)을 돌려준다.
  final Future<TreatmentSchedule?> Function(TreatmentSchedule schedule)?
  onEditSchedule;

  /// 일정 완료·삭제·수정 후 호출 — 부모(캘린더)가 목록과 알림을 갱신한다.
  final VoidCallback? onSchedulesChanged;

  final String selectedDateStr;
  final TreatmentMode treatmentMode;
  final bool isPremium;
  final List<MenstrualCycle> cycles;
  final List<TreatmentSchedule> schedules;
  final List<HormoneRecord> hormones;
  final int cycleLength;
  final int periodLength;
  final Future<void> Function() onPeriodSaved;
  final VoidCallback onOpenScheduleModal;
  final VoidCallback onGoRecords;
  final void Function(PaywallSource source) onPaywall;
  /// 메모/컨디션 자동저장 후 호출 — 부모(캘린더)가 월뷰 dot을 갱신할 수 있게 함.
  final VoidCallback? onNoteSaved;

  @override
  ConsumerState<DayDetailModal> createState() => _DayDetailModalState();
}

class _DayDetailModalState extends ConsumerState<DayDetailModal> {
  /// 이 시트가 열린 뒤 완료·삭제·수정된 결과를 반영하는 로컬 목록.
  late final List<TreatmentSchedule> _schedules = List.of(widget.schedules);
  final Set<String> _scheduleBusy = {};

  int? _condition;
  final _memoCtrl = TextEditingController();
  final _memoFocusNode = FocusNode();
  Timer? _debounce;
  bool _suppressAutoSave = false;
  bool _savingNote = false;
  bool _noteSaved = false;

  final _periodStartCtrl = TextEditingController();
  final _periodEndCtrl = TextEditingController();
  bool _savingPeriod = false;
  bool _isEditingPeriod = false;

  Map<String, bool> _checkedMeds = {};

  MenstrualCycle? get _selectedCycleRecord {
    final sel = DateTime.tryParse(widget.selectedDateStr);
    if (sel == null) return null;
    for (final c in widget.cycles) {
      final start = DateTime.tryParse(c.startDate);
      if (start == null) continue;
      final pLen = c.periodLength;
      final end = c.endDate != null
          ? DateTime.tryParse(c.endDate!)
          : start.add(Duration(days: pLen - 1));
      if (end == null) continue;
      if (!sel.isBefore(start) && !sel.isAfter(end)) return c;
    }
    return null;
  }

  HormoneRecord? get _selectedDayHormone {
    for (final h in widget.hormones) {
      if (h.recordedAt == widget.selectedDateStr) return h;
    }
    return null;
  }

  void _replaceSchedule(TreatmentSchedule updated) {
    setState(() {
      final i = _schedules.indexWhere((s) => s.id == updated.id);
      if (i >= 0) {
        _schedules[i] = updated;
      } else {
        _schedules.add(updated);
      }
    });
  }

  Future<void> _toggleScheduleStatus(TreatmentSchedule sc) async {
    final next = sc.status == 'completed' ? 'scheduled' : 'completed';
    setState(() => _scheduleBusy.add(sc.id));
    try {
      await ref.read(treatmentApiProvider).updateStatus(sc.id, next);
      if (!mounted) return;
      _replaceSchedule(
        TreatmentSchedule(
          id: sc.id,
          userId: sc.userId,
          type: sc.type,
          title: sc.title,
          scheduledAt: sc.scheduledAt,
          status: next,
          hospitalName: sc.hospitalName,
          notes: sc.notes,
          medications: sc.medications,
          isPartnerRecord: sc.isPartnerRecord,
        ),
      );
      widget.onSchedulesChanged?.call();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('상태를 변경하지 못했어요.')),
      );
    } finally {
      if (mounted) setState(() => _scheduleBusy.remove(sc.id));
    }
  }

  Future<void> _deleteSchedule(TreatmentSchedule sc) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('일정을 삭제할까요?'),
        content: Text(
          '\'${sc.title}\' 일정과 연결된 약물 알림이 함께 삭제돼요. 되돌릴 수 없어요.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('삭제', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _scheduleBusy.add(sc.id));
    try {
      await ref.read(treatmentApiProvider).delete(sc.id);
      if (!mounted) return;
      setState(() => _schedules.removeWhere((s) => s.id == sc.id));
      widget.onSchedulesChanged?.call();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('일정을 삭제하지 못했어요.')),
      );
    } finally {
      if (mounted) setState(() => _scheduleBusy.remove(sc.id));
    }
  }

  Future<void> _editSchedule(TreatmentSchedule sc) async {
    final handler = widget.onEditSchedule;
    if (handler == null) return;
    final updated = await handler(sc);
    if (updated != null && mounted) {
      _replaceSchedule(updated);
      widget.onSchedulesChanged?.call();
    }
  }

  Widget _scheduleActionBar(TreatmentSchedule sc) {
    final busy = _scheduleBusy.contains(sc.id);
    final done = sc.status == 'completed';
    Widget action(IconData icon, String label, VoidCallback onTap,
        {Color color = AppColors.textMuted}) {
      return InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: busy ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          action(
            done ? Icons.undo_rounded : Icons.check_circle_outline_rounded,
            done ? '완료 취소' : '완료',
            () => _toggleScheduleStatus(sc),
            color: done ? AppColors.textMuted : AppColors.accentGreen,
          ),
          action(Icons.edit_outlined, '수정', () => _editSchedule(sc)),
          action(
            Icons.delete_outline_rounded,
            '삭제',
            () => _deleteSchedule(sc),
            color: AppColors.error,
          ),
          if (busy) ...[
            const Spacer(),
            const SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ],
        ],
      ),
    );
  }

  List<TreatmentSchedule> get _dateSchedules => _schedules
      .where((s) => s.scheduledAt.split('T')[0] == widget.selectedDateStr)
      .toList();

  List<Medication> get _dateMedications {
    final sel = DateTime.tryParse(widget.selectedDateStr);
    final out = <Medication>[];
    for (final s in _schedules) {
      final isSelectedDateSchedule =
          s.scheduledAt.split('T')[0] == widget.selectedDateStr;
      for (final med in s.medications ?? const <Medication>[]) {
        if (isSelectedDateSchedule) {
          out.add(med);
          continue;
        }
        final start = DateTime.tryParse(med.startDate);
        final end = med.endDate != null
            ? DateTime.tryParse(med.endDate!)
            : null;
        if (start != null && sel != null) {
          final afterStart = !sel.isBefore(start);
          final beforeEnd = end == null || !sel.isAfter(end);
          if (afterStart && beforeEnd) out.add(med);
        }
      }
    }
    return out;
  }

  @override
  void initState() {
    super.initState();
    _periodStartCtrl.text = widget.selectedDateStr;
    _loadCheckedMeds();
    _loadDailyNote();
    _memoFocusNode.addListener(() {
      if (!_memoFocusNode.hasFocus) {
        _debounce?.cancel();
        _autoSave();
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _memoFocusNode.dispose();
    _memoCtrl.dispose();
    _periodStartCtrl.dispose();
    _periodEndCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCheckedMeds() async {
    final saved = await ref
        .read(localCacheProvider)
        .getMedicationChecked(widget.selectedDateStr);
    if (mounted) {
      setState(() => _checkedMeds = {for (final k in saved) k: true});
    }
  }

  Future<void> _loadDailyNote() async {
    try {
      final note = await ref
          .read(dailyNotesApiProvider)
          .getByDate(widget.selectedDateStr);
      if (mounted) {
        setState(() {
          _condition = note?.condition;
          _suppressAutoSave = true;
          _memoCtrl.text = note?.memo ?? '';
          _suppressAutoSave = false;
        });
      }
    } catch (_) {
      // leave condition/memo empty
    }
  }

  void _scheduleAutoSave() {
    if (_suppressAutoSave) return;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 800), _autoSave);
  }

  void _selectCondition(int value) {
    setState(() => _condition = _condition == value ? null : value);
    _debounce?.cancel();
    _autoSave();
  }

  Future<void> _autoSave() async {
    setState(() => _savingNote = true);
    try {
      await ref.read(dailyNotesApiProvider).save(widget.selectedDateStr, {
        'memo': _memoCtrl.text.trim(),
        'condition': _condition,
      });
      if (mounted) {
        setState(() => _noteSaved = true);
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) setState(() => _noteSaved = false);
        });
      }
      widget.onNoteSaved?.call();
    } catch (_) {
      // 자동저장 실패는 조용히 무시 — 다음 변경 시 재시도됨.
    } finally {
      if (mounted) setState(() => _savingNote = false);
    }
  }

  Future<void> _handleSavePeriod() async {
    if (_periodStartCtrl.text.isEmpty) return;
    setState(() => _savingPeriod = true);
    try {
      final start = DateTime.tryParse(_periodStartCtrl.text);
      final end = _periodEndCtrl.text.isNotEmpty
          ? DateTime.tryParse(_periodEndCtrl.text)
          : null;
      final calcPeriodLength = (end != null && start != null)
          ? (end.difference(start).inDays + 1).clamp(1, 999)
          : (_selectedCycleRecord?.periodLength ?? widget.periodLength);

      await ref.read(cyclesApiProvider).save({
        if (_selectedCycleRecord != null) 'id': _selectedCycleRecord!.id,
        'startDate': _periodStartCtrl.text,
        if (_periodEndCtrl.text.isNotEmpty) 'endDate': _periodEndCtrl.text,
        'cycleLength': widget.cycleLength,
        'periodLength': calcPeriodLength,
      });
      await widget.onPeriodSaved();
      if (mounted) {
        setState(() => _isEditingPeriod = false);
        Navigator.of(context).pop();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('생리 기록 저장에 실패했어요.')));
      }
    } finally {
      if (mounted) setState(() => _savingPeriod = false);
    }
  }

  Future<void> _handleCheckMed(String medKey) async {
    setState(
      () => _checkedMeds = {
        ..._checkedMeds,
        medKey: !(_checkedMeds[medKey] ?? false),
      },
    );
    final checkedIds = _checkedMeds.entries
        .where((e) => e.value)
        .map((e) => e.key)
        .toSet();
    await ref
        .read(localCacheProvider)
        .setMedicationChecked(widget.selectedDateStr, checkedIds);
  }

  @override
  Widget build(BuildContext context) {
    final dateObj = DateTime.tryParse(widget.selectedDateStr) ?? DateTime.now();
    final dateLabel = '${dateObj.year}년 ${dateObj.month}월 ${dateObj.day}일';

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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dateLabel,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textDark,
                        ),
                      ),
                      if (_selectedCycleRecord != null)
                        const Padding(
                          padding: EdgeInsets.only(top: 4),
                          child: Row(
                            children: [
                              Icon(
                                Icons.water_drop_rounded,
                                size: 12,
                                color: Color(0xFFB91C1C),
                              ),
                              SizedBox(width: 4),
                              Text(
                                '생리 기간',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFFB91C1C),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        )
                      else if ((_selectedDayHormone?.opkIndex ?? 0) >= 8)
                        const Padding(
                          padding: EdgeInsets.only(top: 4),
                          child: Row(
                            children: [
                              Icon(
                                Icons.egg_rounded,
                                size: 12,
                                color: AppColors.primary,
                              ),
                              SizedBox(width: 4),
                              Text(
                                '배란 가능성 높음',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
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
                    _section(
                      Icons.mood_rounded,
                      '오늘 컨디션 & 메모',
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: conditionOptions.map((c) {
                              final active = _condition == c.condition;
                              return GestureDetector(
                                onTap: () => _selectCondition(c.condition),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: active
                                        ? AppColors.primary
                                        : AppColors.surface,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    children: [
                                      Text(
                                        c.emoji,
                                        style: const TextStyle(fontSize: 18),
                                      ),
                                      Text(
                                        c.label,
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: active
                                              ? Colors.white
                                              : AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _memoCtrl,
                            focusNode: _memoFocusNode,
                            maxLines: 4,
                            minLines: 2,
                            maxLength: 2000,
                            onChanged: (_) => _scheduleAutoSave(),
                            decoration: const InputDecoration(
                              hintText: '오늘 하루를 짧게 남겨보세요',
                            ),
                          ),
                          if (_savingNote || _noteSaved)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                _savingNote ? '저장 중...' : '✓ 저장됐어요',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Builder(
                      builder: (context) {
                        final periodTrailing = TextButton(
                          onPressed: () {
                            setState(() {
                              if (_selectedCycleRecord != null) {
                                if (_isEditingPeriod) {
                                  _isEditingPeriod = false;
                                } else {
                                  final rec = _selectedCycleRecord!;
                                  _periodStartCtrl.text = rec.startDate;
                                  if (widget.selectedDateStr.compareTo(
                                        rec.startDate,
                                      ) >=
                                      0) {
                                    _periodEndCtrl.text =
                                        widget.selectedDateStr;
                                  } else if (rec.endDate != null) {
                                    _periodEndCtrl.text = rec.endDate!;
                                  } else {
                                    final start = DateTime.tryParse(
                                      rec.startDate,
                                    );
                                    if (start != null) {
                                      final end = start.add(
                                        Duration(days: rec.periodLength - 1),
                                      );
                                      _periodEndCtrl.text =
                                          '${end.year.toString().padLeft(4, '0')}-${end.month.toString().padLeft(2, '0')}-${end.day.toString().padLeft(2, '0')}';
                                    }
                                  }
                                  _isEditingPeriod = true;
                                }
                              } else {
                                _periodStartCtrl.text = widget.selectedDateStr;
                                _periodEndCtrl.text = '';
                                _isEditingPeriod = true;
                              }
                            });
                          },
                          child: Text(
                            _selectedCycleRecord != null
                                ? (_isEditingPeriod ? '수정 취소' : '수정하기')
                                : '기록하기',
                          ),
                        );
                        return _section(
                          Icons.water_drop_rounded,
                          '생리 기록',
                          (_selectedCycleRecord != null && !_isEditingPeriod)
                              ? Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '시작: ${_selectedCycleRecord!.startDate}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                    if (_selectedCycleRecord!.endDate != null)
                                      Text(
                                        '종료: ${_selectedCycleRecord!.endDate}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    Text(
                                      '주기: ${_selectedCycleRecord!.cycleLength}일',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                  ],
                                )
                              : Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (_selectedCycleRecord == null)
                                      const Text(
                                        '이 날짜의 생리 기록이 없어요',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: AppColors.textMutedLight,
                                        ),
                                      ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const Text(
                                                '시작일',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: AppColors.textMuted,
                                                ),
                                              ),
                                              TextField(
                                                controller: _periodStartCtrl,
                                                decoration:
                                                    const InputDecoration(
                                                      hintText: 'YYYY-MM-DD',
                                                    ),
                                                onChanged: (_) =>
                                                    setState(() {}),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const Text(
                                                '종료일 (선택)',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: AppColors.textMuted,
                                                ),
                                              ),
                                              TextField(
                                                controller: _periodEndCtrl,
                                                decoration:
                                                    const InputDecoration(
                                                      hintText: 'YYYY-MM-DD',
                                                    ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton(
                                        onPressed:
                                            (_periodStartCtrl.text.isEmpty ||
                                                _savingPeriod)
                                            ? null
                                            : _handleSavePeriod,
                                        child: _savingPeriod
                                            ? const SizedBox(
                                                width: 16,
                                                height: 16,
                                                child:
                                                    CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                      color: Colors.white,
                                                    ),
                                              )
                                            : Text(
                                                _selectedCycleRecord != null
                                                    ? '기록 수정 완료'
                                                    : '생리 기록 저장',
                                              ),
                                      ),
                                    ),
                                  ],
                                ),
                          trailing: periodTrailing,
                        );
                      },
                    ),
                    _section(
                      Icons.thermostat_rounded,
                      '건강 기록',
                      _selectedDayHormone != null
                          ? Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                if (_selectedDayHormone!.bbt != null)
                                  _healthChip(
                                    '${_selectedDayHormone!.bbt}°C',
                                    icon: Icons.thermostat_rounded,
                                  ),
                                if (_selectedDayHormone!.opkIndex != null)
                                  _healthChip(
                                    'OPK ${_selectedDayHormone!.opkIndex}/10',
                                    icon: Icons.egg_rounded,
                                  ),
                                if (_selectedDayHormone!.intercourse != null)
                                  _healthChip(
                                    _selectedDayHormone!.intercourse!
                                        ? '관계 있음'
                                        : '관계 없음',
                                    icon: _selectedDayHormone!.intercourse!
                                        ? Icons.favorite_rounded
                                        : Icons.favorite_border_rounded,
                                  ),
                              ],
                            )
                          : const Text(
                              'BBT, OPK, 관계 기록이 없어요',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textMutedLight,
                              ),
                            ),
                    ),
                    if (_dateMedications.isNotEmpty)
                      _section(
                        Icons.medication_rounded,
                        '복용 체크리스트',
                        Column(
                          children: [
                            ..._dateMedications.map((med) {
                              final medKey =
                                  '${med.name}_${med.dose}_${med.times.join(',')}';
                              final isChecked = _checkedMeds[medKey] ?? false;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: InkWell(
                                  onTap: () => _handleCheckMed(medKey),
                                  child: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: isChecked
                                          ? AppColors.surface
                                          : Colors.white,
                                      border: Border.all(
                                        color: AppColors.primaryLight,
                                      ),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 20,
                                          height: 20,
                                          decoration: BoxDecoration(
                                            color: isChecked
                                                ? AppColors.primary
                                                : Colors.transparent,
                                            border: Border.all(
                                              color: AppColors.primary,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              6,
                                            ),
                                          ),
                                          alignment: Alignment.center,
                                          child: isChecked
                                              ? const Icon(
                                                  Icons.check,
                                                  size: 14,
                                                  color: Colors.white,
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
                                                med.name,
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w600,
                                                  color: AppColors.textDark,
                                                  decoration: isChecked
                                                      ? TextDecoration
                                                            .lineThrough
                                                      : null,
                                                ),
                                              ),
                                              Text(
                                                '용량: ${med.dose}',
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  color: AppColors.textMuted,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Row(
                                          children: [
                                            const Icon(
                                              Icons.access_time_rounded,
                                              size: 11,
                                              color: AppColors.textMuted,
                                            ),
                                            const SizedBox(width: 3),
                                            Text(
                                              med.times.join(', '),
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }),
                            const SizedBox(height: 6),
                            if (widget.isPremium)
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton(
                                  onPressed: () {},
                                  child: const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.notifications_active_rounded,
                                        size: 15,
                                      ),
                                      SizedBox(width: 6),
                                      Text('약물 알림 켜기'),
                                    ],
                                  ),
                                ),
                              )
                            else
                              InkWell(
                                onTap: () => widget.onPaywall(
                                  PaywallSource.medicationReminder,
                                ),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(
                                        Icons.lock_rounded,
                                        size: 16,
                                        color: AppColors.textMuted,
                                      ),
                                      const SizedBox(width: 10),
                                      const Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '프리미엄으로 알림 켜기',
                                              style: TextStyle(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w700,
                                                color: AppColors.textDark,
                                              ),
                                            ),
                                            Text(
                                              '정시 투약 푸시 알림 활성화',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const Text(
                                        '›',
                                        style: TextStyle(
                                          fontSize: 18,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    _section(
                      Icons.event_rounded,
                      '시술 일정',
                      _dateSchedules.isNotEmpty
                          ? Column(
                              children: _dateSchedules.map((sc) {
                                final dt = DateTime.tryParse(sc.scheduledAt);
                                final timeStr = dt != null
                                    ? '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}'
                                    : '';
                                final style = _badgeStyle(sc.type);
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: sc.isPartnerRecord
                                        ? Colors.white
                                        : AppColors.surface,
                                    borderRadius: BorderRadius.circular(12),
                                    border: sc.isPartnerRecord
                                        ? Border.all(
                                            color: AppColors.accentPurpleLight
                                                .withValues(alpha: 0.5),
                                          )
                                        : null,
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 8,
                                                      vertical: 3,
                                                    ),
                                                decoration: BoxDecoration(
                                                  color: style.bg,
                                                  borderRadius:
                                                      BorderRadius.circular(8),
                                                ),
                                                child: Row(
                                                  mainAxisSize:
                                                      MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      _typeBadge(sc.type).icon,
                                                      size: 11,
                                                      color: style.fg,
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      _typeBadge(sc.type).label,
                                                      style: TextStyle(
                                                        fontSize: 10,
                                                        fontWeight:
                                                            FontWeight.w700,
                                                        color: style.fg,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              if (sc.isPartnerRecord) ...[
                                                const SizedBox(width: 6),
                                                Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        horizontal: 7,
                                                        vertical: 3,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: AppColors.surfaceAlt,
                                                    borderRadius:
                                                        BorderRadius.circular(8),
                                                  ),
                                                  child: const Row(
                                                    mainAxisSize:
                                                        MainAxisSize.min,
                                                    children: [
                                                      Icon(
                                                        Icons.favorite_rounded,
                                                        size: 10,
                                                        color: AppColors
                                                            .accentPurple,
                                                      ),
                                                      SizedBox(width: 3),
                                                      Text(
                                                        '배우자',
                                                        style: TextStyle(
                                                          fontSize: 10,
                                                          fontWeight:
                                                              FontWeight.w700,
                                                          color: AppColors
                                                              .accentPurple,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ),
                                          Text(
                                            timeStr,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: AppColors.textMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        sc.title,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: sc.status == 'completed'
                                              ? AppColors.textMuted
                                              : AppColors.textDark,
                                          decoration: sc.status == 'completed'
                                              ? TextDecoration.lineThrough
                                              : null,
                                        ),
                                      ),
                                      if (sc.hospitalName != null)
                                        Row(
                                          children: [
                                            const Icon(
                                              Icons.local_hospital_rounded,
                                              size: 11,
                                              color: AppColors.textMuted,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              sc.hospitalName!,
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      if (!sc.isPartnerRecord)
                                        _scheduleActionBar(sc),
                                    ],
                                  ),
                                );
                              }).toList(),
                            )
                          : const Text(
                              '등록된 시술 일정이 없어요',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textMutedLight,
                              ),
                            ),
                      trailing: TextButton(
                        onPressed: widget.onOpenScheduleModal,
                        child: const Text('+ 일정 추가'),
                      ),
                    ),
                    Row(
                      children: widget.treatmentMode == 'natural'
                          ? [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: widget.onGoRecords,
                                  child: const Text('+ 기록 추가하기'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: widget.onOpenScheduleModal,
                                  child: const Text('+ 일정 등록하기'),
                                ),
                              ),
                            ]
                          : [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: widget.onOpenScheduleModal,
                                  child: const Text('+ 일정 등록하기'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: widget.onGoRecords,
                                  child: const Text('+ 수치 기록하기'),
                                ),
                              ),
                            ],
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _healthChip(String text, {IconData? icon}) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 13, color: AppColors.textDark),
          const SizedBox(width: 5),
        ],
        Text(
          text,
          style: const TextStyle(fontSize: 12, color: AppColors.textDark),
        ),
      ],
    ),
  );

  Widget _section(
    IconData icon,
    String title,
    Widget body, {
    Widget? trailing,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, size: 14, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                    ),
                  ),
                ],
              ),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 8),
          body,
        ],
      ),
    );
  }
}
