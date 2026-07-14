import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/domain/mock_diary_feedback.dart';
import '../../core/domain/record_fields.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../state/profile_controller.dart';
import '../../state/providers.dart';
import 'hormone_modal.dart';

const _diaryMoods = [
  (value: 'great', icon: '😄', label: '행복'),
  (value: 'good', icon: '😊', label: '평온'),
  (value: 'neutral', icon: '😐', label: '보통'),
  (value: 'sad', icon: '😢', label: '슬픔'),
  (value: 'anxious', icon: '😰', label: '불안'),
  (value: 'hopeful', icon: '💫', label: '기대'),
];

String _moodLabel(String mood) {
  switch (mood) {
    case 'great':
      return '😄 행복';
    case 'good':
      return '😊 평온';
    case 'neutral':
      return '😐 보통';
    case 'sad':
      return '😢 슬픔';
    case 'anxious':
      return '😰 불안';
    case 'hopeful':
      return '💫 기대';
    default:
      return mood;
  }
}

String _todayStr() {
  final now = DateTime.now();
  return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
}

/// Port of apps/mobile/app/records/index.tsx — second-largest screen.
class RecordsScreen extends ConsumerStatefulWidget {
  const RecordsScreen({super.key});

  @override
  ConsumerState<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends ConsumerState<RecordsScreen> {
  String _activeTab = 'daily';
  List<HormoneRecord> _records = [];
  List<DiaryEntry> _diaries = [];
  bool _loadingHormones = true;
  bool _loadingDiaries = true;

  String? _selectedMood;
  final _diaryCtrl = TextEditingController();
  String _aiFeedback = '';
  bool _savingDiary = false;
  String? _diaryError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _diaryCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final records = await ref.read(hormonesApiProvider).getAll();
      if (mounted) setState(() => _records = records);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingHormones = false);
    }
    try {
      final diaries = await ref.read(diaryApiProvider).getAll();
      DiaryEntry? today;
      for (final d in diaries) {
        if (d.date == _todayStr()) {
          today = d;
          break;
        }
      }
      if (mounted) {
        setState(() {
          _diaries = diaries;
          if (today != null) {
            _selectedMood = today.mood;
            _diaryCtrl.text = today.content;
            _aiFeedback = today.aiAnalysis ?? '';
          }
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingDiaries = false);
    }
  }

  HormoneRecord? get _todayRecord {
    for (final r in _records) {
      if (r.recordedAt == _todayStr() ||
          r.recordedAt.split('T')[0] == _todayStr())
        return r;
    }
    return null;
  }

  Future<void> _saveDailyField(String field, Object? value) async {
    final today = _todayRecord;
    final json = today?.toJson() ?? {};
    json['id'] = today?.id ?? 'daily_${DateTime.now().millisecondsSinceEpoch}';
    json['recordedAt'] = _todayStr();
    if (value == null) {
      json.remove(field);
    } else {
      json[field] = value;
    }
    try {
      await ref.read(hormonesApiProvider).save(json);
      final updated = await ref.read(hormonesApiProvider).getAll();
      if (mounted) setState(() => _records = updated);
    } catch (_) {
      // swallow, matches RN saveDailyField
    }
  }

  Future<void> _handleSaveDiary() async {
    if (_diaryCtrl.text.trim().isEmpty) {
      setState(() => _diaryError = '오늘의 마음 일기 내용을 작성해 주세요.');
      return;
    }
    setState(() {
      _savingDiary = true;
      _diaryError = null;
    });
    final mood = _selectedMood ?? 'neutral';
    var aiAnalysis = '';
    try {
      final baseUrl = ref.read(apiClientProvider).dio.options.baseUrl;
      final res = await Dio().post<String>(
        '$baseUrl/ai',
        data: {
          'messages': [
            {
              'role': 'user',
              'content':
                  '다음 일기를 쓴 사용자의 감정을 따뜻하게 공감하고, 힘이 나는 응원 편지를 2-3문장으로 다정하게 써주세요. 의학적 판단은 금지입니다:\n\n"${_diaryCtrl.text}"',
              'timestamp': DateTime.now().toIso8601String(),
            },
          ],
        },
        options: Options(
          responseType: ResponseType.plain,
          receiveTimeout: const Duration(seconds: 20),
        ),
      );
      aiAnalysis = (res.data != null && res.data!.trim().isNotEmpty)
          ? res.data!
          : getLocalMockFeedback(mood);
    } catch (_) {
      aiAnalysis = getLocalMockFeedback(mood);
    }

    setState(() => _aiFeedback = aiAnalysis);

    try {
      await ref.read(diaryApiProvider).save(_todayStr(), {
        'mood': mood,
        'content': _diaryCtrl.text,
        'aiAnalysis': aiAnalysis,
      });
      final diaries = await ref.read(diaryApiProvider).getAll();
      if (mounted) setState(() => _diaries = diaries);
    } catch (e) {
      if (mounted) setState(() => _diaryError = '일기 저장에 실패했습니다.');
    } finally {
      if (mounted) setState(() => _savingDiary = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileControllerProvider);
    final treatmentMode = profile?.treatmentStage ?? 'natural';
    final currentStage = profile?.currentStage;
    final recordTabs = getRecordTabs(treatmentMode);

    final loadingAny = _activeTab == 'diary'
        ? _loadingDiaries
        : _loadingHormones;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: loadingAny
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => context.pop(),
                        icon: const Icon(
                          Icons.chevron_left,
                          color: AppColors.textDark,
                        ),
                      ),
                      const Expanded(
                        child: Text(
                          '오늘의 신체 기록',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textDark,
                          ),
                        ),
                      ),
                      const SizedBox(width: 40),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: recordTabs.map((tab) {
                        final active = _activeTab == tab.key;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _activeTab = tab.key),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: active
                                    ? Colors.white
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                tab.label,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: active
                                      ? AppColors.primary
                                      : AppColors.textMuted,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (_activeTab == 'daily') _buildDailyTab(),
                  if (_activeTab == 'hospital')
                    _buildHospitalTab(treatmentMode, currentStage),
                  if (_activeTab == 'procedure') _buildProcedureTab(),
                  if (_activeTab == 'diary') _buildDiaryTab(),
                ],
              ),
      ),
    );
  }

  Widget _buildDailyTab() {
    final today = _todayRecord;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '오늘의 신체 기록 📊',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
        const Text(
          '매일의 신체 변화를 기록합니다',
          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.primaryLight),
          ),
          child: Column(
            children: [
              _dailyRow(
                '🌡️ 기초체온',
                _numberInputRow(today?.bbt?.toString(), 'bbt', '°C 입력', '36.5'),
              ),
              const Divider(height: 24),
              _dailyRow(
                '🥚 배란 테스트기',
                Row(
                  children: [
                    _opkBtn(
                      '양성 (피크)',
                      today?.opkIndex == 10,
                      () => _saveDailyField(
                        'opkIndex',
                        today?.opkIndex == 10 ? null : 10,
                      ),
                    ),
                    const SizedBox(width: 8),
                    _opkBtn(
                      '음성',
                      today?.opkIndex == 1,
                      () => _saveDailyField(
                        'opkIndex',
                        today?.opkIndex == 1 ? null : 1,
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 24),
              _dailyRow(
                '⚖️ 몸무게',
                _numberInputRow(
                  today?.weight?.toString(),
                  'weight',
                  'kg 입력',
                  '50',
                ),
              ),
              const Divider(height: 24),
              _dailyRow(
                '😴 수면 시간',
                _numberInputRow(
                  today?.sleepHours?.toString(),
                  'sleepHours',
                  '시간 입력',
                  '8',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Row(
            children: [
              Text('💡', style: TextStyle(fontSize: 16)),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  '기초체온을 매일 기록하면 배란 흐름을 파악하는 데 도움이 돼요',
                  style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _historyCard(),
      ],
    );
  }

  Widget _dailyRow(String label, Widget trailing) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textDark,
          ),
        ),
        trailing,
      ],
    );
  }

  Widget _numberInputRow(
    String? currentValue,
    String field,
    String unitLabel,
    String placeholder,
  ) {
    final ctrl = TextEditingController(text: currentValue ?? '');
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 80,
          child: TextField(
            controller: ctrl,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.right,
            decoration: InputDecoration(
              hintText: placeholder,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 10,
                vertical: 8,
              ),
            ),
            onSubmitted: (val) => _saveDailyField(
              field,
              val.isNotEmpty ? double.tryParse(val) : null,
            ),
            onEditingComplete: () {},
          ),
        ),
        const SizedBox(width: 6),
        Text(
          unitLabel,
          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
        ),
      ],
    );
  }

  Widget _opkBtn(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFFE11D48) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: active ? const Color(0xFFE11D48) : AppColors.primaryLight,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : const Color(0xFF9F1239),
          ),
        ),
      ),
    );
  }

  Widget _historyCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primaryLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '📋 과거 수치 기록 내역',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 10),
          if (_records.isEmpty)
            const Text(
              '히스토리가 비어 있습니다.',
              style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
            )
          else
            ..._records.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          r.recordedAt,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted,
                          ),
                        ),
                        if (r.notes != null && r.notes!.isNotEmpty) ...[
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              '"${r.notes}"',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMutedLight,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        if (r.bbt != null)
                          _pill(
                            '체온',
                            '${r.bbt}°C',
                            const Color(0xFFFFE4E6),
                            const Color(0xFFBE123C),
                          ),
                        if (r.opkIndex != null)
                          _pill(
                            '배테기',
                            r.opkIndex == 10 ? '양성(피크)' : '음성',
                            const Color(0xFFFFE4E6),
                            const Color(0xFFBE123C),
                          ),
                        if (r.cervicalMucus != null)
                          _pill(
                            '점액',
                            _mucusLabel(r.cervicalMucus!),
                            const Color(0xFFFFE4E6),
                            const Color(0xFFBE123C),
                          ),
                        if (r.weight != null)
                          _pill(
                            '몸무게',
                            '${r.weight}kg',
                            const Color(0xFFFFE4E6),
                            const Color(0xFFBE123C),
                          ),
                        if (r.sleepHours != null)
                          _pill(
                            '수면',
                            '${r.sleepHours}시간',
                            const Color(0xFFFFE4E6),
                            const Color(0xFFBE123C),
                          ),
                        if (r.amh != null)
                          _pill(
                            'AMH',
                            '${r.amh}',
                            AppColors.surface,
                            AppColors.textDark,
                          ),
                        if (r.fsh != null)
                          _pill(
                            'FSH',
                            '${r.fsh}',
                            AppColors.surface,
                            AppColors.textDark,
                          ),
                        if (r.lh != null)
                          _pill(
                            'LH',
                            '${r.lh}',
                            AppColors.surface,
                            AppColors.textDark,
                          ),
                        if (r.estradiol != null)
                          _pill(
                            'E2',
                            '${r.estradiol}',
                            AppColors.surface,
                            AppColors.textDark,
                          ),
                        if (r.progesterone != null)
                          _pill(
                            'PROG',
                            '${r.progesterone}',
                            AppColors.surface,
                            AppColors.textDark,
                          ),
                        if (r.follicleSize != null)
                          _pill(
                            '난포',
                            '${r.follicleSize}mm',
                            const Color(0xFFE0E7FF),
                            const Color(0xFF312E81),
                          ),
                        if (r.endometriumThickness != null)
                          _pill(
                            '내막',
                            '${r.endometriumThickness}mm',
                            const Color(0xFFE0E7FF),
                            const Color(0xFF312E81),
                          ),
                        if (r.hcgLevel != null)
                          _pill(
                            'hCG',
                            '${r.hcgLevel}',
                            const Color(0xFFE0E7FF),
                            const Color(0xFF312E81),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (context) => HormoneModal(
                  isNaturalMode:
                      (ref.read(profileControllerProvider)?.treatmentStage ??
                          'natural') ==
                      'natural',
                  onSaved: () => _load(),
                ),
              ),
              child: const Text('+ 병원 검사 수치 기록하기'),
            ),
          ),
        ],
      ),
    );
  }

  String _mucusLabel(String v) {
    switch (v) {
      case 'dry':
        return '건조함';
      case 'sticky':
        return '끈적함';
      case 'creamy':
        return '크림';
      case 'eggwhite':
        return '계란흰자';
      default:
        return v;
    }
  }

  Widget _pill(String label, String value, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '$label $value',
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: fg),
      ),
    );
  }

  Widget _buildHospitalTab(String treatmentMode, String? currentStage) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '🏥 병원 수치 기록',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
        const Text(
          '현재 단계의 주요 검사 수치를 입력합니다',
          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        const SizedBox(height: 14),
        if (currentStage == null)
          Container(
            padding: const EdgeInsets.all(20),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primaryLight),
            ),
            child: Column(
              children: const [
                Text('⚙️', style: TextStyle(fontSize: 28)),
                SizedBox(height: 8),
                Text(
                  '치료 단계가 설정되지 않았습니다',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textDark,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  '설정 화면에서 현재 단계를 선택해 주세요',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          )
        else
          Builder(
            builder: (context) {
              final fields = getHospitalFields(treatmentMode, currentStage);
              if (fields.isEmpty)
                return const Text(
                  '이 단계에서 기록할 항목이 없습니다.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textMutedLight,
                  ),
                );
              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primaryLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: fields.map((f) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${f.label}${f.unit.isNotEmpty ? ' (${f.unit})' : ''}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textDark,
                            ),
                          ),
                          const SizedBox(height: 6),
                          if (f.type == FieldType.select ||
                              f.type == FieldType.multiselect)
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: (f.options ?? const [])
                                  .map(
                                    (o) => Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.surface,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        o.label,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textDark,
                                        ),
                                      ),
                                    ),
                                  )
                                  .toList(),
                            )
                          else
                            TextField(
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                hintText: f.placeholder ?? f.unit,
                                hintStyle: const TextStyle(
                                  color: Color(0xFFFDA4AF),
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildProcedureTab() {
    final filtered = _records
        .where((r) => r.follicleSize != null || r.hcgLevel != null)
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '💉 시술 지표 기록',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
        const Text(
          '채취, 이식 등 주요 시술 결과를 기록합니다',
          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.primaryLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '📋 최근 기록',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textDark,
                ),
              ),
              const SizedBox(height: 10),
              if (filtered.isEmpty)
                const Text(
                  '아직 기록된 시술 데이터가 없습니다.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textMutedLight,
                  ),
                )
              else
                ...filtered.map(
                  (r) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          r.recordedAt,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 8,
                          children: [
                            if (r.follicleSize != null)
                              _pill(
                                '난포',
                                '${r.follicleSize}mm',
                                AppColors.surface,
                                AppColors.textDark,
                              ),
                            if (r.hcgLevel != null)
                              _pill(
                                'hCG',
                                '${r.hcgLevel}',
                                AppColors.surface,
                                AppColors.textDark,
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDiaryTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '오늘의 마음 일기 📝',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
        const Text(
          '시술 중 겪는 미묘한 감정을 기록하고 위로받으세요',
          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.primaryLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '오늘 나의 마음 날씨는 어떤가요?',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textDark,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _diaryMoods.map((m) {
                  final active = _selectedMood == m.value;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedMood = m.value),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: active ? AppColors.primary : AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        children: [
                          Text(m.icon, style: const TextStyle(fontSize: 20)),
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
              const SizedBox(height: 12),
              TextField(
                controller: _diaryCtrl,
                maxLines: 5,
                onChanged: (_) {
                  if (_diaryError != null) setState(() => _diaryError = null);
                },
                decoration: const InputDecoration(
                  hintText:
                      '시술 준비 과정에서 느끼신 사소한 감정이나 몸의 변화를 차분히 남겨 보세요. 다정히 위로해 드릴게요.',
                ),
              ),
              if (_diaryError != null) ...[
                const SizedBox(height: 6),
                Text(
                  '⚠️ $_diaryError',
                  style: const TextStyle(fontSize: 12, color: Colors.red),
                ),
              ],
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _savingDiary ? null : _handleSaveDiary,
                  child: _savingDiary
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('일기 등록 & AI 위로 편지 받기'),
                ),
              ),
            ],
          ),
        ),
        if (_aiFeedback.isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8FA),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primaryLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '💌 AI 동반자가 보낸 편지',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textDark,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _aiFeedback,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textDark,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  '* 이 응원은 자가 일기 분석에 따른 멘탈 케어로, 의학적 해석을 대체하지 않습니다.',
                  style: TextStyle(
                    fontSize: 10,
                    color: AppColors.textMutedLight,
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.primaryLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '📅 과거의 마음 기록들',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textDark,
                ),
              ),
              const SizedBox(height: 10),
              if (_diaries.isEmpty)
                const Text(
                  '과거의 마음 기록이 없습니다.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textMutedLight,
                  ),
                )
              else
                ..._diaries.map(
                  (d) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _moodLabel(d.mood),
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textDark,
                              ),
                            ),
                            Text(
                              d.date,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          d.content,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textDark,
                          ),
                        ),
                        if (d.aiAnalysis != null &&
                            d.aiAnalysis!.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '💌 ${d.aiAnalysis}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textDark,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
