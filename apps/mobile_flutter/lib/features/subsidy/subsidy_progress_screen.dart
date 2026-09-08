import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/domain/clinic_gate.dart';
import '../../core/domain/subsidy_progress.dart';
import '../../core/models/subsidy.dart';
import '../../core/models/treatment.dart';
import '../../core/push/local_notifications.dart';
import '../../core/theme/app_theme.dart';
import '../../state/profile_controller.dart';
import '../../state/providers.dart';
import '../../widgets/paywall_modal.dart';

/// 지원금 신청 진행 관리 — 회차(시술 일정)별로
/// 통지서 발급 → 시술 완료 → 청구 완료를 체크하고 서류를 준비한다.
/// 체크 상태는 서버(subsidy_profiles.applications)에 저장되며,
/// 완료한 단계의 D-7 / D+14 로컬 알림은 자동으로 해제된다. 체크는 프리미엄 전용.
class SubsidyProgressScreen extends ConsumerStatefulWidget {
  const SubsidyProgressScreen({super.key});

  @override
  ConsumerState<SubsidyProgressScreen> createState() =>
      _SubsidyProgressScreenState();
}

class _SubsidyProgressScreenState extends ConsumerState<SubsidyProgressScreen> {
  bool _loading = true;
  String? _error;
  List<TreatmentSchedule> _schedules = const [];
  UserSubsidyProfile? _profile;
  final Set<String> _saving = {};
  final Set<String> _expandedDocs = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ref.read(treatmentApiProvider).getAll(),
        ref.read(subsidyApiProvider).getProfile(),
      ]);
      if (!mounted) return;
      setState(() {
        _schedules = results[0] as List<TreatmentSchedule>;
        _profile = results[1] as UserSubsidyProfile;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '진행 상태를 불러오지 못했어요.';
      });
    }
  }

  bool get _isPremium {
    final profile = ref.read(profileControllerProvider);
    return profile != null && isPremiumProfile(profile);
  }

  void _openPaywall() {
    showPaywallModal(
      context,
      source: PaywallSource.subsidyCalculator,
      onSuccess: () => setState(() {}),
    );
  }

  Future<void> _patch(String scheduleId, Map<String, dynamic> data) async {
    if (!_isPremium) {
      _openPaywall();
      return;
    }
    setState(() => _saving.add(scheduleId));
    try {
      final updated = await ref
          .read(subsidyApiProvider)
          .updateApplication(scheduleId, data);
      if (!mounted) return;
      setState(() => _profile = updated);
      // 완료한 단계의 알림은 빼고 다시 예약한다.
      LocalNotifications.instance
          .rescheduleSubsidyAlerts(_schedules, applications: updated.applications)
          .catchError((_) {});
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('저장에 실패했어요. 잠시 후 다시 시도해주세요.')),
      );
    } finally {
      if (mounted) setState(() => _saving.remove(scheduleId));
    }
  }

  void _toggleStep(SubsidyProgress progress, SubsidyStepState step) {
    final field = subsidyStepField(step.step);
    // 시술 완료가 일정 status 로 자동 인정된 경우엔 되돌릴 대상이 없다.
    if (step.step == SubsidyStep.procedure &&
        step.done &&
        progress.application?.procedureDoneAt == null) {
      return;
    }
    _patch(progress.schedule.id, {
      field: step.done ? null : DateTime.now().toIso8601String(),
    });
  }

  void _toggleDoc(SubsidyProgress progress, String docId, bool current) {
    final docs = Map<String, bool>.from(
      progress.application?.docsChecked ?? const {},
    );
    docs[docId] = !current;
    _patch(progress.schedule.id, {'docsChecked': docs});
  }

  @override
  Widget build(BuildContext context) {
    final trackable = subsidyTrackableSchedules(_schedules);
    final isPremium = _isPremium;

    return Scaffold(
      backgroundColor: const Color(0xFFFFFBFC),
      appBar: AppBar(
        title: const Text('지원금 신청 진행 관리'),
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.textDark,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _messageState(_error!, action: ('다시 시도', _load))
          : trackable.isEmpty
          ? _messageState(
              '지원금 대상 시술 일정(시험관 · 인공수정 · 동결이식)이 없어요.\n캘린더에서 일정을 등록하면 여기서 신청 단계를 챙겨드려요.',
              action: ('캘린더로 이동', () => context.go('/calendar')),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (!isPremium) _premiumBanner(),
                  _intro(),
                  const SizedBox(height: 12),
                  ...trackable.map((s) {
                    final progress = buildSubsidyProgress(
                      s,
                      _profile?.applicationFor(s.id),
                    );
                    return _ScheduleCard(
                      progress: progress,
                      saving: _saving.contains(s.id),
                      locked: !isPremium,
                      docsExpanded: _expandedDocs.contains(s.id),
                      onToggleDocs: () => setState(() {
                        if (!_expandedDocs.add(s.id)) _expandedDocs.remove(s.id);
                      }),
                      onToggleStep: (step) => _toggleStep(progress, step),
                      onToggleDoc: (docId, current) =>
                          _toggleDoc(progress, docId, current),
                      onLockedTap: _openPaywall,
                    );
                  }),
                  const SizedBox(height: 8),
                  const Text(
                    '청구 기한과 필요 서류는 지자체마다 다를 수 있어요. 최종 기준은 관할 보건소 또는 e보건소에서 확인해주세요.',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _intro() {
    return const Text(
      '회차마다 세 단계를 체크하세요. 통지서는 시술 전에, 청구는 시술 후 1개월 이내가 기준이에요. 체크한 단계의 알림은 자동으로 꺼져요.',
      style: TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.5),
    );
  }

  Widget _premiumBanner() {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primaryLight),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_rounded, size: 18, color: AppColors.textDark),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              '진행 단계 체크와 서류 체크리스트, 마감 알림은 프리미엄 기능이에요.',
              style: TextStyle(fontSize: 12, color: AppColors.textDark),
            ),
          ),
          TextButton(onPressed: _openPaywall, child: const Text('구독하기')),
        ],
      ),
    );
  }

  Widget _messageState(String message, {required (String, VoidCallback) action}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textMuted,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: action.$2,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accentGreen,
              ),
              child: Text(action.$1),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScheduleCard extends StatelessWidget {
  const _ScheduleCard({
    required this.progress,
    required this.saving,
    required this.locked,
    required this.docsExpanded,
    required this.onToggleDocs,
    required this.onToggleStep,
    required this.onToggleDoc,
    required this.onLockedTap,
  });

  final SubsidyProgress progress;
  final bool saving;
  final bool locked;
  final bool docsExpanded;
  final VoidCallback onToggleDocs;
  final void Function(SubsidyStepState step) onToggleStep;
  final void Function(String docId, bool current) onToggleDoc;
  final VoidCallback onLockedTap;

  static const _typeLabel = {'IVF': '시험관', 'IUI': '인공수정', 'FET': '동결이식'};

  @override
  Widget build(BuildContext context) {
    final s = progress.schedule;
    final dt = DateTime.tryParse(s.scheduledAt);
    final dateStr = dt != null ? '${dt.year}.${dt.month}.${dt.day}' : '';
    final urgency = progress.urgency;
    final borderColor = progress.allDone
        ? AppColors.accentGreen
        : urgency == SubsidyUrgency.overdue
        ? AppColors.error
        : urgency == SubsidyUrgency.soon
        ? const Color(0xFFF59E0B)
        : AppColors.primaryLight;
    final docs = progress.application?.docsChecked ?? const {};
    final docsDone = subsidyRequiredDocs.where((d) => docs[d.id] == true).length;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.accentGreenLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _typeLabel[s.type] ?? s.type,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppColors.accentGreen,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  s.title.isNotEmpty ? s.title : '${_typeLabel[s.type] ?? s.type} 시술',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textDark,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                dateStr,
                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress.doneCount / progress.steps.length,
                    minHeight: 5,
                    backgroundColor: AppColors.surface,
                    color: progress.allDone
                        ? AppColors.accentGreen
                        : AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                progress.allDone
                    ? '완료'
                    : '${progress.doneCount}/${progress.steps.length}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted,
                ),
              ),
              if (saving) ...[
                const SizedBox(width: 8),
                const SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          ...progress.steps.map((st) => _stepRow(st)),
          const SizedBox(height: 4),
          InkWell(
            onTap: onToggleDocs,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  const Icon(
                    Icons.description_outlined,
                    size: 15,
                    color: AppColors.textMuted,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '서류 체크리스트 $docsDone/${subsidyRequiredDocs.length}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textDark,
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    docsExpanded
                        ? Icons.expand_less_rounded
                        : Icons.expand_more_rounded,
                    size: 18,
                    color: AppColors.textMuted,
                  ),
                ],
              ),
            ),
          ),
          if (docsExpanded)
            ...subsidyRequiredDocs.map((d) {
              final checked = docs[d.id] == true;
              return InkWell(
                onTap: locked ? onLockedTap : () => onToggleDoc(d.id, checked),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Icon(
                        checked
                            ? Icons.check_box_rounded
                            : Icons.check_box_outline_blank_rounded,
                        size: 16,
                        color: checked
                            ? AppColors.accentGreen
                            : AppColors.textMuted,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          d.label,
                          style: TextStyle(
                            fontSize: 12,
                            color: checked
                                ? AppColors.textMuted
                                : AppColors.textDark,
                            decoration: checked
                                ? TextDecoration.lineThrough
                                : null,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _stepRow(SubsidyStepState st) {
    final Color hintColor;
    switch (st.urgency) {
      case SubsidyUrgency.overdue:
        hintColor = AppColors.error;
        break;
      case SubsidyUrgency.soon:
        hintColor = const Color(0xFFB45309);
        break;
      case SubsidyUrgency.none:
        hintColor = AppColors.textMuted;
    }
    final autoDone = st.step == SubsidyStep.procedure &&
        st.done &&
        progress.application?.procedureDoneAt == null;

    return InkWell(
      onTap: locked
          ? onLockedTap
          : autoDone
          ? null
          : () => onToggleStep(st),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              st.done
                  ? Icons.check_circle_rounded
                  : locked
                  ? Icons.lock_outline_rounded
                  : Icons.radio_button_unchecked_rounded,
              size: 20,
              color: st.done
                  ? AppColors.accentGreen
                  : st.urgency == SubsidyUrgency.overdue
                  ? AppColors.error
                  : AppColors.textMuted,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subsidyStepLabel(st.step),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: st.done ? AppColors.textMuted : AppColors.textDark,
                      decoration: st.done ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    autoDone ? '일정 완료 처리로 자동 인정' : st.hint,
                    style: TextStyle(fontSize: 11, color: hintColor, height: 1.4),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
