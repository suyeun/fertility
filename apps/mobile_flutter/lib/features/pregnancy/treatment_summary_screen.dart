import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/domain/treatment_summary.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../state/profile_controller.dart';
import '../../state/providers.dart';

/// 시술 기록 요약 — 회차별 일정·약물·수치를 정리해 텍스트로 공유한다(산부인과 지참용).
class TreatmentSummaryScreen extends ConsumerStatefulWidget {
  const TreatmentSummaryScreen({super.key});

  @override
  ConsumerState<TreatmentSummaryScreen> createState() =>
      _TreatmentSummaryScreenState();
}

class _TreatmentSummaryScreenState extends ConsumerState<TreatmentSummaryScreen> {
  bool _loading = true;
  String? _error;
  List<TreatmentCycleSummary> _cycles = const [];

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
        ref.read(hormonesApiProvider).getAll(),
      ]);
      if (!mounted) return;
      setState(() {
        _cycles = buildTreatmentCycles(
          results[0] as List<TreatmentSchedule>,
          results[1] as List<HormoneRecord>,
        );
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '기록을 불러오지 못했어요.';
      });
    }
  }

  String get _text => formatTreatmentSummary(
    _cycles,
    userName: ref.read(profileControllerProvider)?.name,
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBFC),
      appBar: AppBar(
        title: const Text('시술 기록 요약'),
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        actions: [
          if (!_loading && _cycles.isNotEmpty)
            IconButton(
              tooltip: '공유',
              onPressed: () => Share.share(_text, subject: 'BOM 시술 기록 요약'),
              icon: const Icon(Icons.ios_share_rounded),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.textMuted)))
          : _cycles.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  '정리할 시술 기록이 없어요.\n캘린더에 등록한 시술 일정과 병원 수치가 여기에 회차별로 모여요.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.5),
                ),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  '산부인과나 다른 병원에 갈 때 그대로 보여 주거나 메시지로 보낼 수 있어요. 자가 기록 요약이며 진단서가 아니에요.',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.5),
                ),
                const SizedBox(height: 12),
                ..._cycles.map(_cycleCard),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => Share.share(_text, subject: 'BOM 시술 기록 요약'),
                    icon: const Icon(Icons.ios_share_rounded, size: 18),
                    label: const Text('텍스트로 공유하기'),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _cycleCard(TreatmentCycleSummary c) {
    const typeLabel = {'IVF': '시험관', 'IUI': '인공수정', 'FET': '배아 이식', 'other': '기타'};
    final withValues = c.records.where(_hasClinicValue).length;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primaryLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${c.index}회차 · ${typeLabel[c.type] ?? c.type}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${c.startDate} ~ ${c.endDate} · 일정 ${c.schedules.length}건 · 수치 기록 $withValues일',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
          const SizedBox(height: 8),
          ...c.schedules.take(6).map(
            (s) => Padding(
              padding: const EdgeInsets.only(bottom: 3),
              child: Row(
                children: [
                  Icon(
                    s.status == 'completed'
                        ? Icons.check_circle_rounded
                        : Icons.radio_button_unchecked_rounded,
                    size: 14,
                    color: s.status == 'completed'
                        ? AppColors.accentGreen
                        : AppColors.textMutedLight,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${s.scheduledAt.split('T')[0]}  ${s.title}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textDark),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (c.schedules.length > 6)
            Text(
              '외 ${c.schedules.length - 6}건',
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
        ],
      ),
    );
  }

  bool _hasClinicValue(HormoneRecord r) =>
      r.follicleCount != null ||
      r.endometriumThickness != null ||
      r.estradiol != null ||
      r.totalOocytes != null ||
      r.transferredEmbryos != null ||
      r.hcgLevel != null ||
      r.judgmentResult != null;
}
