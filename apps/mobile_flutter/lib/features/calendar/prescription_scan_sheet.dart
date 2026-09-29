import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/client.dart';
import '../../core/domain/clinic_gate.dart';
import '../../core/domain/prescription_scan.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';

/// 처방전·주사 일정표 사진 → 일정 초안 → 확인·수정 → 일괄 등록.
///
/// 안전 원칙:
/// - 인식 결과는 "초안"이며 반드시 확인 화면을 거쳐야 저장된다(자동 등록 없음).
/// - 사진은 분석 요청에만 쓰고 기기·서버에 저장하지 않는다. 화면에도 원본을 오래 들고 있지 않는다.
/// - 확신도가 낮은 항목은 눈에 띄게 표시해 시각·용량 재확인을 유도한다.
class PrescriptionScanSheet extends ConsumerStatefulWidget {
  const PrescriptionScanSheet({
    super.key,
    required this.initialDate,
    required this.isPremium,
    required this.existingScheduleCount,
    required this.onPaywall,
    required this.onSaved,
  });

  final DateTime initialDate;
  final bool isPremium;
  final int existingScheduleCount;
  final void Function(PaywallSource source) onPaywall;
  final void Function(List<TreatmentSchedule> saved) onSaved;

  @override
  ConsumerState<PrescriptionScanSheet> createState() => _PrescriptionScanSheetState();
}

enum _Step { pick, analyzing, review }

class _PrescriptionScanSheetState extends ConsumerState<PrescriptionScanSheet> {
  _Step _step = _Step.pick;
  String? _error;
  ScanQuota? _quota;
  ScanResult? _result;

  @override
  void initState() {
    super.initState();
    _loadQuota();
  }

  Future<void> _loadQuota() async {
    try {
      final q = await ref.read(treatmentApiProvider).getScanQuota();
      if (mounted) setState(() => _quota = q);
    } catch (_) {
      // 잔여 횟수를 못 읽어도 스캔 시도는 가능 — 서버가 최종 판정한다
    }
  }
  List<ScanDraft> _drafts = const [];
  final _hospitalCtrl = TextEditingController();
  bool _saving = false;
  int _savedCount = 0;

  @override
  void dispose() {
    _hospitalCtrl.dispose();
    super.dispose();
  }

  Future<void> _pick(ImageSource source) async {
    final q = _quota;
    if (q != null && !q.allowed) {
      if (!q.isPremium) {
        widget.onPaywall(PaywallSource.medicationReminder);
      } else {
        setState(() => _error = q.label);
      }
      return;
    }
    setState(() => _error = null);
    final picker = ImagePicker();
    XFile? file;
    try {
      // 긴 변 1600px · JPEG 80% — 글자 판독에 충분하고 전송량은 수백 KB 수준
      file = await picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 80,
        requestFullMetadata: false,
      );
    } catch (_) {
      setState(() => _error = source == ImageSource.camera
          ? '카메라를 열 수 없어요. 기기 설정에서 BOM의 카메라 권한을 확인해 주세요.'
          : '사진을 불러올 수 없어요. 기기 설정에서 BOM의 사진 권한을 확인해 주세요.');
      return;
    }
    if (file == null) return;
    await _analyze(file);
  }

  Future<void> _analyze(XFile file) async {
    setState(() {
      _step = _Step.analyzing;
      _error = null;
    });
    try {
      final bytes = await File(file.path).readAsBytes();
      final result = await ref.read(treatmentApiProvider).scanSchedule(
        imageBase64: base64Encode(bytes),
        mediaType: 'image/jpeg',
        referenceDate: _dateStr(widget.initialDate),
      );
      if (!mounted) return;
      final fallback = result.detectedReferenceDate != null
          ? (DateTime.tryParse(result.detectedReferenceDate!) ?? widget.initialDate)
          : widget.initialDate;
      setState(() {
        _result = result;
        _quota = result.quota ?? _quota;
        _drafts = buildScanDrafts(result.items, fallback);
        _step = _Step.review;
      });
      if (result.items.isEmpty) {
        setState(() => _error = '일정을 찾지 못했어요. 표나 글자가 잘 보이게 다시 찍어 주세요.');
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.code == 'SCAN_FREE_LIMIT') {
        setState(() => _step = _Step.pick);
        _loadQuota();
        widget.onPaywall(PaywallSource.medicationReminder);
        return;
      }
      setState(() {
        _step = _Step.pick;
        _error = e.message;
      });
      if (e.code == 'SCAN_DAILY_LIMIT') _loadQuota();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _step = _Step.pick;
        _error = '분석 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
      });
    }
  }

  int get _includedCount => _drafts.where((d) => d.include).length;

  Future<void> _save() async {
    if (_includedCount == 0) return;
    final allowedFree = canUseClinicScheduler(
      ClinicFeature.registerFirstSchedule,
      ClinicGateContext(
        isPremium: widget.isPremium,
        existingScheduleCount: widget.existingScheduleCount,
      ),
    );
    // 약물 알림이 붙는 저장은 프리미엄 기능. 무료는 기존 규칙(첫 일정 1건, 약물 없음)만.
    final hasMedication = _drafts.any((d) => d.include && d.isMedication && d.medicationName.isNotEmpty);
    if (!widget.isPremium && (!allowedFree || _includedCount > 1 || hasMedication)) {
      widget.onPaywall(hasMedication ? PaywallSource.medicationReminder : PaywallSource.multiSchedule);
      return;
    }

    setState(() {
      _saving = true;
      _savedCount = 0;
    });
    final saved = <TreatmentSchedule>[];
    try {
      for (final d in _drafts.where((d) => d.include)) {
        d.hospitalName = _hospitalCtrl.text.trim();
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
                ? '등록에 실패했어요. 잠시 후 다시 시도해 주세요.'
                : '${saved.length}건은 등록됐고 나머지는 실패했어요. 캘린더에서 확인해 주세요.',
          ),
        ),
      );
      if (saved.isNotEmpty) widget.onSaved(saved);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  static String _dateStr(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

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
                      _step == _Step.review ? '인식 결과 확인 · 수정' : '처방전·주사 일정표 스캔',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textDark,
                      ),
                    ),
                  ),
                  if (_step == _Step.review)
                    TextButton(
                      onPressed: _saving ? null : () => setState(() => _step = _Step.pick),
                      child: const Text('다시 찍기'),
                    ),
                ],
              ),
            ),
            Expanded(
              child: switch (_step) {
                _Step.pick => _pickView(controller),
                _Step.analyzing => _analyzingView(),
                _Step.review => _reviewView(controller),
              },
            ),
            if (_step == _Step.review && _drafts.isNotEmpty) _saveBar(),
          ],
        ),
      ),
    );
  }

  Widget _pickView(ScrollController controller) {
    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        _noticeBox(
          '병원에서 받은 처방전이나 주사 일정표를 찍으면 약 이름·용량·시각을 읽어 일정 초안을 만들어요. '
          '초안은 저장 전에 하나씩 확인·수정할 수 있고, 사진은 분석 후 저장하지 않아요.',
        ),
        const SizedBox(height: 10),
        _quotaBadge(),
        const SizedBox(height: 12),
        _pickButton(Icons.photo_camera_rounded, '카메라로 촬영', '표 전체가 프레임 안에 들어오고 그림자가 없게', () => _pick(ImageSource.camera)),
        const SizedBox(height: 10),
        _pickButton(Icons.photo_library_rounded, '사진 보관함에서 선택', '이미 찍어 둔 일정표 사진', () => _pick(ImageSource.gallery)),
        if (_error != null) ...[
          const SizedBox(height: 14),
          _errorBox(_error!),
        ],
        const SizedBox(height: 16),
        const Text(
          '잘 읽히는 사진 팁',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDark),
        ),
        const SizedBox(height: 6),
        const Text(
          '• 밝은 곳에서 정면으로, 글자가 흐리지 않게\n• 손글씨 표는 시각·용량 부분이 선명하게\n• 여러 장이면 한 장씩 스캔해 등록',
          style: TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.6),
        ),
      ],
    );
  }

  /// 잔여 횟수 표시 — 무료 "체험 N회 남음", 프리미엄 "오늘 N회", 소진 시 안내와 구독 버튼.
  Widget _quotaBadge() {
    final q = _quota;
    if (q == null) {
      return const Text(
        '잔여 횟수 확인 중…',
        style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
      );
    }
    final exhausted = !q.allowed;
    final color = exhausted ? const Color(0xFF92400E) : AppColors.accentGreen;
    final bg = exhausted ? const Color(0xFFFEF3C7) : AppColors.accentGreenLight;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Icon(
            exhausted ? Icons.lock_outline_rounded : Icons.document_scanner_rounded,
            size: 16,
            color: color,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              q.isPremium
                  ? (exhausted ? q.label : '프리미엄 · 오늘 ${q.remaining}/${q.dailyLimit}회 남음')
                  : (exhausted ? q.label : '무료 체험 ${q.remaining}/${q.freeLimit}회 남음 · 프리미엄은 하루 ${q.dailyLimit}회'),
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color, height: 1.4),
            ),
          ),
          if (exhausted && !q.isPremium)
            TextButton(
              onPressed: () => widget.onPaywall(PaywallSource.medicationReminder),
              style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8)),
              child: const Text('구독하기', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
            ),
        ],
      ),
    );
  }

  Widget _analyzingView() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 14),
          Text('일정표를 읽고 있어요…', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
          SizedBox(height: 4),
          Text('보통 10~20초 걸려요', style: TextStyle(fontSize: 11, color: AppColors.textMutedLight)),
        ],
      ),
    );
  }

  Widget _reviewView(ScrollController controller) {
    final result = _result!;
    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
      children: [
        _noticeBox('읽은 내용을 병원 일정표와 하나씩 비교해 주세요. 시각·용량이 틀리면 탭해서 고치고, 필요 없는 항목은 체크를 해제하면 돼요.'),
        if (result.warnings.isNotEmpty) ...[
          const SizedBox(height: 10),
          ...result.warnings.map(
            (w) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.warning_amber_rounded, size: 14, color: Color(0xFFB45309)),
                  const SizedBox(width: 6),
                  Expanded(child: Text(w, style: const TextStyle(fontSize: 11, color: Color(0xFFB45309), height: 1.4))),
                ],
              ),
            ),
          ),
        ],
        if (_error != null) ...[const SizedBox(height: 10), _errorBox(_error!)],
        const SizedBox(height: 12),
        TextField(
          controller: _hospitalCtrl,
          decoration: const InputDecoration(hintText: '병원 이름 (선택 · 모든 일정에 함께 저장)', isDense: true),
        ),
        const SizedBox(height: 12),
        ..._drafts.map(_draftCard),
      ],
    );
  }

  Widget _draftCard(ScanDraft d) {
    final low = d.confidence == 'low';
    final weekday = ['월', '화', '수', '목', '금', '토', '일'];
    return Opacity(
      opacity: d.include ? 1 : 0.5,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: low ? const Color(0xFFF59E0B) : AppColors.primaryLight, width: low ? 1.5 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Checkbox(
                  value: d.include,
                  onChanged: _saving ? null : (v) => setState(() => d.include = v ?? true),
                  activeColor: AppColors.primary,
                ),
                _tag(d.typeLabel, AppColors.surfaceAlt, AppColors.accentPurple),
                if (low) ...[const SizedBox(width: 6), _tag('확인 필요', const Color(0xFFFEF3C7), const Color(0xFF92400E))],
                const Spacer(),
                if (d.isMedication && d.dayCount > 1)
                  Text('${d.dayCount}일간', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
            if (d.isMedication)
              Row(
                children: [
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: TextFormField(
                      initialValue: d.medicationName,
                      enabled: !_saving,
                      onChanged: (v) => d.medicationName = d.title = v,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textDark),
                      decoration: const InputDecoration(isDense: true, hintText: '약 이름'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      initialValue: d.medicationDose,
                      enabled: !_saving,
                      onChanged: (v) => d.medicationDose = v,
                      style: const TextStyle(fontSize: 13),
                      decoration: const InputDecoration(isDense: true, hintText: '용량'),
                    ),
                  ),
                ],
              )
            else
              Padding(
                padding: const EdgeInsets.only(left: 12),
                child: TextFormField(
                  initialValue: d.title,
                  enabled: !_saving,
                  onChanged: (v) => d.title = v,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textDark),
                  decoration: const InputDecoration(isDense: true, hintText: '일정 제목'),
                ),
              ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(left: 12),
              child: Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  _chip(
                    Icons.event_rounded,
                    d.isMedication && d.dayCount > 1
                        ? '${d.startDate.month}/${d.startDate.day} ~ ${d.endDate.month}/${d.endDate.day}'
                        : '${d.startDate.month}/${d.startDate.day} (${weekday[d.startDate.weekday - 1]})',
                    _saving ? null : () => _pickDates(d),
                  ),
                  ...d.times.asMap().entries.map(
                    (e) => _chip(Icons.schedule_rounded, e.value, _saving ? null : () => _pickTime(d, e.key)),
                  ),
                  if (d.isMedication)
                    _chip(Icons.add_rounded, '시각 추가', _saving ? null : () => _pickTime(d, null)),
                  if (d.times.isEmpty && !d.isMedication)
                    _chip(Icons.schedule_rounded, '시각 설정', _saving ? null : () => _pickTime(d, null)),
                ],
              ),
            ),
            if (d.notes.isNotEmpty) ...[
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.only(left: 12),
                child: Text(d.notes, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _pickDates(ScanDraft d) async {
    if (d.isMedication && d.dayCount > 1) {
      final range = await showDateRangePicker(
        context: context,
        initialDateRange: DateTimeRange(start: d.startDate, end: d.endDate),
        firstDate: DateTime.now().subtract(const Duration(days: 365)),
        lastDate: DateTime.now().add(const Duration(days: 730)),
      );
      if (range != null) {
        setState(() {
          d.startDate = range.start;
          d.endDate = range.end;
        });
      }
      return;
    }
    final picked = await showDatePicker(
      context: context,
      initialDate: d.startDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (picked != null) {
      setState(() {
        d.startDate = picked;
        d.endDate = picked;
      });
    }
  }

  Future<void> _pickTime(ScanDraft d, int? index) async {
    final current = index != null ? d.times[index] : '09:00';
    final parts = current.split(':');
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: int.tryParse(parts[0]) ?? 9, minute: int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0),
    );
    if (picked == null) return;
    final v = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    setState(() {
      final list = List<String>.from(d.times);
      if (index != null) {
        list[index] = v;
      } else if (!list.contains(v)) {
        list.add(v);
      }
      list.sort();
      d.times = list;
    });
  }

  Widget _saveBar() {
    final count = _includedCount;
    return Container(
      padding: EdgeInsets.fromLTRB(20, 10, 20, 10 + MediaQuery.of(context).padding.bottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.primaryLight)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              _saving ? '등록 중… $_savedCount/$count' : '$count건 선택 · 시각과 용량을 확인했나요?',
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

  Widget _pickButton(IconData icon, String label, String sub, VoidCallback onTap) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12)),
              alignment: Alignment.center,
              child: Icon(icon, size: 20, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                  const SizedBox(height: 2),
                  Text(sub, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMutedLight),
          ],
        ),
      ),
    );
  }

  Widget _noticeBox(String text) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8E1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline_rounded, size: 16, color: Color(0xFF92400E)),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFF92400E), height: 1.5))),
        ],
      ),
    );
  }

  Widget _errorBox(String text) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFFB91C1C), height: 1.5)),
    );
  }

  Widget _tag(String label, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: fg)),
    );
  }

  Widget _chip(IconData icon, String label, VoidCallback? onTap) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(8)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: AppColors.primary),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textDark)),
          ],
        ),
      ),
    );
  }
}
