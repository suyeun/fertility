import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/client.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';

/// Port of the hormone-entry modal in apps/mobile/app/records/index.tsx —
/// mode-aware accordion (natural vs clinic primary field-set).
class HormoneModal extends ConsumerStatefulWidget {
  const HormoneModal({
    super.key,
    required this.isNaturalMode,
    required this.onSaved,
  });

  final bool isNaturalMode;
  final VoidCallback onSaved;

  @override
  ConsumerState<HormoneModal> createState() => _HormoneModalState();
}

class _HormoneModalState extends ConsumerState<HormoneModal> {
  late final _recordedAtCtrl = TextEditingController(text: _todayStr());
  final _amhCtrl = TextEditingController();
  final _fshCtrl = TextEditingController();
  final _lhCtrl = TextEditingController();
  final _estradiolCtrl = TextEditingController();
  final _progesteroneCtrl = TextEditingController();
  final _bbtCtrl = TextEditingController();
  final _opkCtrl = TextEditingController();
  final _weightCtrl = TextEditingController();
  final _sleepCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String? _cervicalMucus;

  bool _showAccordion = false;
  bool _saving = false;

  static String _todayStr() {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  double? _num(String s) => s.trim().isEmpty ? null : double.tryParse(s.trim());

  Future<void> _submit() async {
    setState(() => _saving = true);
    try {
      await ref.read(hormonesApiProvider).save({
        'recordedAt': _recordedAtCtrl.text,
        if (_num(_amhCtrl.text) != null) 'amh': _num(_amhCtrl.text),
        if (_num(_fshCtrl.text) != null) 'fsh': _num(_fshCtrl.text),
        if (_num(_lhCtrl.text) != null) 'lh': _num(_lhCtrl.text),
        if (_num(_estradiolCtrl.text) != null)
          'estradiol': _num(_estradiolCtrl.text),
        if (_num(_progesteroneCtrl.text) != null)
          'progesterone': _num(_progesteroneCtrl.text),
        if (_num(_bbtCtrl.text) != null) 'bbt': _num(_bbtCtrl.text),
        if (_num(_opkCtrl.text) != null) 'opkIndex': _num(_opkCtrl.text),
        if (_cervicalMucus != null) 'cervicalMucus': _cervicalMucus,
        if (_num(_weightCtrl.text) != null) 'weight': _num(_weightCtrl.text),
        if (_num(_sleepCtrl.text) != null) 'sleepHours': _num(_sleepCtrl.text),
        'notes': _notesCtrl.text,
      });
      widget.onSaved();
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _recordedAtCtrl.dispose();
    _amhCtrl.dispose();
    _fshCtrl.dispose();
    _lhCtrl.dispose();
    _estradiolCtrl.dispose();
    _progesteroneCtrl.dispose();
    _bbtCtrl.dispose();
    _opkCtrl.dispose();
    _weightCtrl.dispose();
    _sleepCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
                  const Text(
                    '기록 수치 추가 🧬',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
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
                    _label('기록 날짜 (YYYY-MM-DD)'),
                    _field(_recordedAtCtrl, '예: 2026-05-23'),
                    const SizedBox(height: 14),
                    if (widget.isNaturalMode)
                      ..._naturalPrimary()
                    else
                      ..._clinicPrimary(),
                    const SizedBox(height: 14),
                    _label('메모'),
                    _field(_notesCtrl, ''),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _submit,
                        child: _saving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('저장하기'),
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

  List<Widget> _naturalPrimary() {
    return [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF5F5),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFFFE4E6)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '🌱 홈케어 지표 기록 (자연임신)',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Color(0xFF881337),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('기초체온 (°C)'),
                      _field(_bbtCtrl, '예: 36.45'),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('배란테스트기 (0~10)'),
                      _field(_opkCtrl, '0 ~ 10'),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('몸무게 (kg)'),
                      _field(_weightCtrl, '예: 50'),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('수면 시간 (시간)'),
                      _field(_sleepCtrl, '예: 8'),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _label('자궁경부점액 상태'),
            _mucusRow(),
          ],
        ),
      ),
      const SizedBox(height: 12),
      _accordion('🏥 상세 병원 검사 결과 (호르몬) 추가', [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_label('AMH'), _field(_amhCtrl, '예: 1.8')],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_label('FSH'), _field(_fshCtrl, '예: 8.5')],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_label('LH'), _field(_lhCtrl, '예: 5.2')],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_label('E2'), _field(_estradiolCtrl, '예: 42.0')],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_label('PROG'), _field(_progesteroneCtrl, '예: 1.2')],
              ),
            ),
          ],
        ),
      ]),
    ];
  }

  List<Widget> _clinicPrimary() {
    return [
      Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [_label('AMH (ng/mL)'), _field(_amhCtrl, '예: 1.8')],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [_label('FSH (mIU/mL)'), _field(_fshCtrl, '예: 8.5')],
            ),
          ),
        ],
      ),
      const SizedBox(height: 10),
      Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [_label('LH (mIU/mL)'), _field(_lhCtrl, '예: 5.2')],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _label('E2 (pg/mL)'),
                _field(_estradiolCtrl, '예: 42.0'),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _label('PROG (ng/mL)'),
                _field(_progesteroneCtrl, '예: 1.2'),
              ],
            ),
          ),
        ],
      ),
      const SizedBox(height: 12),
      _accordion('🌱 홈케어 지표 (체온, 배테기, 몸무게, 수면) 추가', [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_label('기초체온 (°C)'), _field(_bbtCtrl, '예: 36.45')],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_label('배테기 (0~10)'), _field(_opkCtrl, '0 ~ 10')],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_label('몸무게 (kg)'), _field(_weightCtrl, '예: 50')],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_label('수면 시간 (시간)'), _field(_sleepCtrl, '예: 8')],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _label('자궁경부점액 상태'),
        _mucusRow(),
      ]),
    ];
  }

  Widget _mucusRow() {
    const options = [
      ('dry', '건조'),
      ('sticky', '끈적'),
      ('creamy', '크림'),
      ('eggwhite', '흰자'),
    ];
    return Row(
      children: options.map((o) {
        final active = _cervicalMucus == o.$1;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: GestureDetector(
              onTap: () =>
                  setState(() => _cervicalMucus = active ? null : o.$1),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: active ? const Color(0xFFE11D48) : Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: active
                        ? const Color(0xFFE11D48)
                        : const Color(0xFFFFE4E6),
                  ),
                ),
                child: Text(
                  o.$2,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: active ? Colors.white : const Color(0xFF9F1239),
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _accordion(String title, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFF3F4F6)),
        borderRadius: BorderRadius.circular(18),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _showAccordion = !_showAccordion),
            child: Container(
              padding: const EdgeInsets.all(12),
              color: const Color(0xFFF9FAFB),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF4B5563),
                      ),
                    ),
                  ),
                  Text(
                    _showAccordion ? '접기 ▲' : '펼치기 ▼',
                    style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFF9CA3AF),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_showAccordion)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(children: children),
            ),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 11,
        color: AppColors.textMuted,
        fontWeight: FontWeight.w600,
      ),
    ),
  );

  Widget _field(TextEditingController ctrl, String hint) {
    return TextField(
      controller: ctrl,
      keyboardType: TextInputType.text,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.primaryLight),
      ),
      style: const TextStyle(fontSize: 13, color: AppColors.textDark),
    );
  }
}
