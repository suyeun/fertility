import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/domain/clinic_gate.dart';
import '../../core/domain/protocol_drafts.dart';
import '../../core/models/models.dart';
import '../../core/models/protocol_template.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';

/// 회차 프로토콜 템플릿 시트 — 기준일 하나로 회차 일정 초안을 만들고,
/// 사용자가 모든 날짜·시간을 확인·수정한 뒤 한 번에 등록한다.
///
/// 안전 원칙:
/// - 초안은 항상 "예시 일정" 으로 표시하고 저장 전 편집을 강제한다(초안 화면을 거쳐야 저장 가능).
/// - 약물 이름·용량은 비어 있고 사용자가 직접 입력한다. 입력하지 않으면 약물 없이 일정만 저장한다.
/// - 무료 사용자는 기존 게이트(첫 일정 1건)를 그대로 따른다.
class ProtocolTemplateSheet extends ConsumerStatefulWidget {
  const ProtocolTemplateSheet({
    super.key,
    required this.treatmentMode,
    required this.initialDate,
    required this.isPremium,
    required this.existingScheduleCount,
    required this.onPaywall,
    required this.onSaved,
  });

  final TreatmentMode treatmentMode;
  final DateTime initialDate;
  final bool isPremium;
  final int existingScheduleCount;
  final void Function(PaywallSource source) onPaywall;

  /// 저장된 일정 목록 (등록 순서대로)
  final void Function(List<TreatmentSchedule> saved) onSaved;

  @override
  ConsumerState<ProtocolTemplateSheet> createState() =>
      _ProtocolTemplateSheetState();
}

class _ProtocolTemplateSheetState extends ConsumerState<ProtocolTemplateSheet> {
  bool _loading = true;
  String? _error;
  List<ProtocolTemplate> _templates = const [];
  ProtocolTemplate? _selected;
  late DateTime _anchor;
  final _hospitalCtrl = TextEditingController();
  List<ProtocolDraft> _drafts = const [];
  bool _reviewed = false; // 초안 화면 진입 여부 — 저장 전 확인 강제
  bool _saving = false;
  int _savedCount = 0;

  @override
  void initState() {
    super.initState();
    _anchor = DateTime(
      widget.initialDate.year,
      widget.initialDate.month,
      widget.initialDate.day,
    );
    _load();
  }

  @override
  void dispose() {
    _hospitalCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final all = await ref.read(treatmentApiProvider).getTemplates();
      final list = templatesForMode(all, widget.treatmentMode);
      if (!mounted) return;
      setState(() {
        _templates = list;
        _selected = list.isNotEmpty ? list.first : null;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '템플릿을 불러오지 못했어요.';
      });
    }
  }

  void _generate() {
    final t = _selected;
    if (t == null) return;
    setState(() {
      _drafts = buildProtocolDrafts(
        t,
        _anchor,
        hospitalName: _hospitalCtrl.text.trim(),
      );
      _reviewed = true;
    });
  }

  int get _includedCount => _drafts.where((d) => d.include).length;

  Future<void> _pickAnchor() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _anchor,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _anchor = picked);
  }

  Future<void> _pickDraftDate(ProtocolDraft d) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: d.date,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (picked != null) setState(() => d.date = picked);
  }

  Future<void> _pickDraftTime(ProtocolDraft d) async {
    final parts = d.time.split(':');
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(
        hour: int.tryParse(parts[0]) ?? 9,
        minute: int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0,
      ),
    );
    if (picked != null) {
      setState(() {
        d.time =
            '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _save() async {
    if (!_reviewed || _includedCount == 0) return;

    // 무료: 기존 일정이 없고 1건만 등록할 때만 허용 (기존 게이트와 동일 기준).
    final allowedFree = canUseClinicScheduler(
      ClinicFeature.registerFirstSchedule,
      ClinicGateContext(
        isPremium: widget.isPremium,
        existingScheduleCount: widget.existingScheduleCount,
      ),
    );
    if (!widget.isPremium && (!allowedFree || _includedCount > 1)) {
      widget.onPaywall(PaywallSource.multiSchedule);
      return;
    }

    setState(() {
      _saving = true;
      _savedCount = 0;
    });
    final saved = <TreatmentSchedule>[];
    try {
      for (final d in _drafts.where((d) => d.include)) {
        if (d.title.trim().isEmpty) continue;
        final s = await ref.read(treatmentApiProvider).save(d.toSavePayload());
        saved.add(s);
        if (mounted) setState(() => _savedCount = saved.length);
      }
      if (!mounted) return;
      widget.onSaved(saved);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            saved.isEmpty
                ? '등록에 실패했어요. 잠시 후 다시 시도해주세요.'
                : '${saved.length}건은 등록됐고 나머지는 실패했어요. 캘린더에서 확인해주세요.',
          ),
        ),
      );
      if (saved.isNotEmpty) widget.onSaved(saved);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, controller) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFFFFFBFC),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 12, 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _reviewed ? '예시 일정 확인 · 수정' : '회차 일정 한 번에 만들기',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textDark,
                      ),
                    ),
                  ),
                  if (_reviewed)
                    TextButton(
                      onPressed: _saving
                          ? null
                          : () => setState(() => _reviewed = false),
                      child: const Text('템플릿 다시 선택'),
                    ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                  ? _message(_error!, ('다시 시도', _load))
                  : _templates.isEmpty
                  ? _message('현재 치료 모드에 맞는 템플릿이 없어요.', null)
                  : _reviewed
                  ? _draftList(controller)
                  : _templatePicker(controller),
            ),
            if (_reviewed && !_loading && _error == null) _saveBar(),
          ],
        ),
      ),
    );
  }

  Widget _message(String text, (String, VoidCallback)? action) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              text,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
            if (action != null) ...[
              const SizedBox(height: 12),
              TextButton(onPressed: action.$2, child: Text(action.$1)),
            ],
          ],
        ),
      ),
    );
  }

  // ── 1단계: 템플릿 · 기준일 ──
  Widget _templatePicker(ScrollController controller) {
    final t = _selected!;
    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        _exampleBanner(),
        const SizedBox(height: 14),
        const Text(
          '어떤 흐름인가요?',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
        const SizedBox(height: 8),
        ..._templates.map(
          (tpl) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => setState(() => _selected = tpl),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: tpl.id == t.id
                        ? AppColors.primary
                        : AppColors.primaryLight,
                    width: tpl.id == t.id ? 1.5 : 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tpl.label,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tpl.description,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${tpl.steps.length}단계 · 기준일: ${tpl.anchorLabel}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          t.anchorLabel,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
        const SizedBox(height: 6),
        InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: _pickAnchor,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primaryLight),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.event_rounded,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  '${_anchor.year}년 ${_anchor.month}월 ${_anchor.day}일',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textDark,
                  ),
                ),
                const Spacer(),
                const Text(
                  '변경',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        const Text(
          '병원 이름 (선택 · 모든 일정에 함께 저장)',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _hospitalCtrl,
          decoration: const InputDecoration(hintText: '예: ○○여성병원'),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _generate,
            child: const Text('예시 일정 만들기'),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          t.disclaimer,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.textMuted,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _exampleBanner() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8E1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, size: 16, color: Color(0xFF92400E)),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              '여기서 만드는 일정은 일반적인 흐름을 배치한 예시예요. 병원마다 요법과 날짜가 다르니, 담당 의료진이 준 일정표에 맞춰 모든 날짜와 시간을 확인·수정한 뒤 저장하세요.',
              style: TextStyle(
                fontSize: 12,
                color: Color(0xFF92400E),
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── 2단계: 초안 확인·수정 ──
  Widget _draftList(ScrollController controller) {
    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
      children: [
        _exampleBanner(),
        const SizedBox(height: 8),
        Text(
          '${_selected!.label} · 기준일 ${_anchor.month}월 ${_anchor.day}일',
          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        const SizedBox(height: 10),
        ..._drafts.map(_draftCard),
      ],
    );
  }

  Widget _draftCard(ProtocolDraft d) {
    final weekday = ['월', '화', '수', '목', '금', '토', '일'][d.date.weekday - 1];
    return Opacity(
      opacity: d.include ? 1 : 0.5,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Checkbox(
                  value: d.include,
                  onChanged: _saving
                      ? null
                      : (v) => setState(() => d.include = v ?? true),
                  activeColor: AppColors.primary,
                ),
                Expanded(
                  child: TextFormField(
                    initialValue: d.title,
                    enabled: !_saving,
                    onChanged: (v) => d.title = v,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textDark,
                    ),
                    decoration: const InputDecoration(
                      isDense: true,
                      border: InputBorder.none,
                    ),
                  ),
                ),
              ],
            ),
            Row(
              children: [
                const SizedBox(width: 12),
                _chip(
                  Icons.event_rounded,
                  '${d.date.month}/${d.date.day} ($weekday)',
                  _saving ? null : () => _pickDraftDate(d),
                ),
                const SizedBox(width: 8),
                _chip(
                  Icons.schedule_rounded,
                  d.time,
                  _saving ? null : () => _pickDraftTime(d),
                ),
              ],
            ),
            if (d.step.note != null) ...[
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.only(left: 12),
                child: Text(
                  d.step.note!,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
            ],
            if (d.step.hasMedication) ...[
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '투약 알림 ${d.step.medicationTimes.join(' · ')}'
                      '${d.step.medicationDays != null ? ' · ${d.step.medicationDays}일' : ''}'
                      ' — 약 이름을 입력하면 알림이 함께 등록돼요 (선택)',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            initialValue: d.medicationName,
                            enabled: !_saving,
                            onChanged: (v) => d.medicationName = v,
                            style: const TextStyle(fontSize: 12),
                            decoration: const InputDecoration(
                              isDense: true,
                              hintText: '약 이름 (병원 처방대로)',
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: TextFormField(
                            initialValue: d.medicationDose,
                            enabled: !_saving,
                            onChanged: (v) => d.medicationDose = v,
                            style: const TextStyle(fontSize: 12),
                            decoration: const InputDecoration(
                              isDense: true,
                              hintText: '용량',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _chip(IconData icon, String label, VoidCallback? onTap) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: AppColors.primary),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _saveBar() {
    final count = _includedCount;
    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        10,
        20,
        10 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.primaryLight)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              _saving
                  ? '등록 중… $_savedCount/$count'
                  : '$count건 선택 · 날짜와 시간을 모두 확인했나요?',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ),
          ElevatedButton(
            onPressed: _saving || count == 0 ? null : _save,
            child: Text(_saving ? '등록 중' : '$count건 등록'),
          ),
        ],
      ),
    );
  }
}
