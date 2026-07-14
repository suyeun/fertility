import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/domain/clinic_gate.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';
import 'calendar_screen.dart' show moods;

String _typeBadge(String type) {
  switch (type) {
    case 'IVF':
      return '🧬 시험관';
    case 'IUI':
      return '🧪 인공수정';
    case 'FET':
      return '❄️ 동결이식';
    case 'monitoring':
      return '🩺 초음파 검진';
    default:
      return '📅 일반 진료';
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
  });

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

  @override
  ConsumerState<DayDetailModal> createState() => _DayDetailModalState();
}

class _DayDetailModalState extends ConsumerState<DayDetailModal> {
  String? _dayMood;
  final _memoCtrl = TextEditingController();
  bool _savingDiary = false;
  bool _diarySaved = false;

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

  List<TreatmentSchedule> get _dateSchedules => widget.schedules
      .where((s) => s.scheduledAt.split('T')[0] == widget.selectedDateStr)
      .toList();

  List<Medication> get _dateMedications {
    final sel = DateTime.tryParse(widget.selectedDateStr);
    final out = <Medication>[];
    for (final s in widget.schedules) {
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
    _loadDiary();
  }

  @override
  void dispose() {
    _memoCtrl.dispose();
    _periodStartCtrl.dispose();
    _periodEndCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCheckedMeds() async {
    final saved = await ref
        .read(localCacheProvider)
        .getMedicationChecked(widget.selectedDateStr);
    if (mounted)
      setState(() => _checkedMeds = {for (final k in saved) k: true});
  }

  Future<void> _loadDiary() async {
    try {
      final diaries = await ref.read(diaryApiProvider).getAll();
      DiaryEntry? entry;
      for (final d in diaries) {
        if (d.date == widget.selectedDateStr) {
          entry = d;
          break;
        }
      }
      if (mounted) {
        setState(() {
          _dayMood = entry?.mood;
          _memoCtrl.text = entry?.content ?? '';
        });
      }
    } catch (_) {
      // leave mood/memo empty
    }
  }

  Future<void> _handleSaveDiary() async {
    if (_dayMood == null && _memoCtrl.text.trim().isEmpty) return;
    setState(() => _savingDiary = true);
    try {
      await ref.read(diaryApiProvider).save(widget.selectedDateStr, {
        'mood': _dayMood ?? 'neutral',
        'content': _memoCtrl.text.trim().isNotEmpty
            ? _memoCtrl.text.trim()
            : '기분을 기록했어요.',
      });
      setState(() => _diarySaved = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _diarySaved = false);
      });
    } catch (_) {
      // swallow, matches RN
    } finally {
      if (mounted) setState(() => _savingDiary = false);
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
                          child: Text(
                            '🌷 생리 기간',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFFB91C1C),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        )
                      else if ((_selectedDayHormone?.opkIndex ?? 0) >= 8)
                        const Padding(
                          padding: EdgeInsets.only(top: 4),
                          child: Text(
                            '🌸 배란 가능성 높음',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
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
                      '😊 오늘 기분 & 메모',
                      Column(
                        children: [
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: moods.map((m) {
                              final active = _dayMood == m.mood;
                              return GestureDetector(
                                onTap: () => setState(() => _dayMood = m.mood),
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
                                        m.emoji,
                                        style: const TextStyle(fontSize: 18),
                                      ),
                                      Text(
                                        m.label,
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
                            maxLines: 2,
                            onChanged: (_) => setState(() {}),
                            decoration: const InputDecoration(
                              hintText: '오늘 하루 한 줄 메모...',
                            ),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed:
                                  (_savingDiary ||
                                      (_dayMood == null &&
                                          _memoCtrl.text.trim().isEmpty))
                                  ? null
                                  : _handleSaveDiary,
                              child: _savingDiary
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(
                                      _diarySaved ? '✓ 저장됐어요!' : '기분 & 메모 저장',
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
                          '🌷 생리 기록',
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
                      '🌡️ 건강 기록',
                      _selectedDayHormone != null
                          ? Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                if (_selectedDayHormone!.bbt != null)
                                  _healthChip(
                                    '🌡️ ${_selectedDayHormone!.bbt}°C',
                                  ),
                                if (_selectedDayHormone!.opkIndex != null)
                                  _healthChip(
                                    '🥚 OPK ${_selectedDayHormone!.opkIndex}/10',
                                  ),
                                if (_selectedDayHormone!.intercourse != null)
                                  _healthChip(
                                    _selectedDayHormone!.intercourse!
                                        ? '❤️ 관계 있음'
                                        : '🤍 관계 없음',
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
                        '💊 복용 체크리스트',
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
                                        Text(
                                          '🕒 ${med.times.join(', ')}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textMuted,
                                          ),
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
                                  child: const Text('🔔 약물 알림 켜기'),
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
                                      const Text(
                                        '🔒',
                                        style: TextStyle(fontSize: 16),
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
                      '📅 시술 일정',
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
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 3,
                                            ),
                                            decoration: BoxDecoration(
                                              color: style.bg,
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              _typeBadge(sc.type),
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w700,
                                                color: style.fg,
                                              ),
                                            ),
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
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textDark,
                                        ),
                                      ),
                                      if (sc.hospitalName != null)
                                        Text(
                                          '🏢 ${sc.hospitalName}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
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

  Widget _healthChip(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      text,
      style: const TextStyle(fontSize: 12, color: AppColors.textDark),
    ),
  );

  Widget _section(String title, Widget body, {Widget? trailing}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textDark,
                ),
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
