import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api/client.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';

/// Port of apps/mobile/app/couple/index.tsx.
class CoupleScreen extends ConsumerStatefulWidget {
  const CoupleScreen({super.key});

  @override
  ConsumerState<CoupleScreen> createState() => _CoupleScreenState();
}

class _CoupleScreenState extends ConsumerState<CoupleScreen> {
  CoupleStatusResponse? _status;
  bool _loading = true;
  final _codeCtrl = TextEditingController();
  bool _joining = false;
  bool _inviting = false;
  bool _unlinking = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ref.read(couplesApiProvider).me();
      if (mounted) setState(() => _status = res);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('연결 상태를 불러올 수 없어요')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _shareCode(String code) async {
    await Share.share(
      'BOM 앱 배우자 연결 초대코드: $code\n\n앱에서 설정 → 배우자 연결 → 코드 입력 후 함께 기록을 공유해요 💕',
      subject: 'BOM 배우자 초대',
    );
  }

  Future<void> _handleCreateInvite() async {
    setState(() => _inviting = true);
    try {
      final res = await ref.read(couplesApiProvider).invite();
      await _load();
      final expires = DateTime.tryParse(res.expiresAt);
      final expiresStr = expires != null
          ? '${expires.month}월 ${expires.day}일 ${expires.hour}시'
          : '';
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('초대코드 생성 완료 💕'),
            content: Text(
              '코드: ${res.inviteCode}\n\n유효기간: $expiresStr까지\n\n배우자에게 코드를 알려주세요.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('닫기'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _shareCode(res.inviteCode);
                },
                child: const Text('공유하기'),
              ),
            ],
          ),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('초대코드 생성 중 문제가 발생했어요')));
      }
    } finally {
      if (mounted) setState(() => _inviting = false);
    }
  }

  Future<void> _handleJoin() async {
    final code = _codeCtrl.text.trim().toUpperCase();
    if (code.length != 6) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('6자리 코드를 정확히 입력해주세요')));
      return;
    }
    setState(() => _joining = true);
    try {
      final res = await ref.read(couplesApiProvider).join(code);
      await _load();
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('연결 완료 💕'),
            content: Text(
              '${res.partnerName}님과 연결되었어요!\n이제 일정과 기록을 함께 확인할 수 있어요.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('확인'),
              ),
            ],
          ),
        );
      }
      _codeCtrl.clear();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('유효하지 않거나 만료된 코드예요')));
      }
    } finally {
      if (mounted) setState(() => _joining = false);
    }
  }

  Future<void> _handleUnlink() async {
    if (_status?.coupleId == null) return;
    setState(() => _unlinking = true);
    try {
      await ref.read(couplesApiProvider).unlink(_status!.coupleId!);
      if (mounted) Navigator.of(context).pop();
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('연결 해제 완료 — 과거 공유 기록은 유지됩니다.')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('연결 해제 중 문제가 발생했어요')));
      }
    } finally {
      if (mounted) setState(() => _unlinking = false);
    }
  }

  void _showUnlinkModal() {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          title: const Text('연결 해제할까요?'),
          content: const Text('해제 후에도 과거 기록은 유지돼요.\n새 기록부터 비공유로 전환됩니다.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('취소'),
            ),
            TextButton(
              onPressed: _unlinking ? null : _handleUnlink,
              child: Text(
                '연결 해제',
                style: TextStyle(color: _unlinking ? Colors.grey : Colors.red),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.surface,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    final isLinked = _status?.linked ?? false;
    final isPending = !isLinked && _status?.inviteCode != null;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 10, bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextButton(
                    onPressed: () => context.pop(),
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      alignment: Alignment.centerLeft,
                    ),
                    child: const Text(
                      '← 뒤로',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                  const Text(
                    '배우자 연결 💕',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                    ),
                  ),
                ],
              ),
            ),
            if (isLinked) ..._linkedContent(),
            if (isPending) ..._pendingContent(),
            if (!isLinked && !isPending) ..._unlinkedContent(),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                '🔒 배우자와 공유된 정보는 제3자에게 공개되지 않으며 기존 인증 체계(JWT)로 보호됩니다.',
                style: TextStyle(
                  fontSize: 11,
                  color: Color(0xFF166534),
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  List<Widget> _linkedContent() {
    return [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.primaryLight, width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.primaryLight, width: 2),
                  ),
                  alignment: Alignment.center,
                  child: const Text('💑', style: TextStyle(fontSize: 28)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '연결됨',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textDark,
                        ),
                      ),
                      Text(
                        '${_status?.partnerName ?? '배우자'}님과 함께 기록 중',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textDark,
                        ),
                      ),
                      Text(
                        '내 역할: ${_status?.role == 'OWNER' ? '초대자' : '파트너'}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const _FeatureRow(emoji: '📅', text: '시술 일정 함께 열람 · 기록'),
            const _FeatureRow(emoji: '💊', text: '복약 스케줄 공동 확인'),
            const _FeatureRow(emoji: '📊', text: '호르몬 수치 함께 추적'),
            const _FeatureRow(emoji: '📔', text: '감정일기 — 선택적 공유 가능'),
          ],
        ),
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF8E1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('ℹ️', style: TextStyle(fontSize: 14)),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                '연결 해제 후에도 과거에 함께 기록한 데이터는 유지됩니다. 신규 기록부터 비공유로 전환돼요.',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF78350F),
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      SizedBox(
        width: double.infinity,
        child: OutlinedButton(
          onPressed: _showUnlinkModal,
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            side: const BorderSide(color: Color(0xFFFCA5A5), width: 1.5),
          ),
          child: const Text(
            '연결 해제하기',
            style: TextStyle(
              color: Color(0xFFDC2626),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    ];
  }

  List<Widget> _pendingContent() {
    final expires = _status?.expiresAt != null
        ? DateTime.tryParse(_status!.expiresAt!)
        : null;
    return [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFEDE9FE),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFC4B5FD), width: 1.5),
        ),
        child: Column(
          children: [
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '초대 대기 중 ⏳',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentPurple,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(
                _status?.inviteCode ?? '',
                style: const TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentPurple,
                  letterSpacing: 8,
                ),
              ),
            ),
            const Text(
              '배우자가 이 코드를 앱에 입력하면 연결돼요',
              style: TextStyle(fontSize: 12, color: AppColors.accentPurple),
            ),
            if (expires != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  '만료: ${expires.year}.${expires.month}.${expires.day} ${expires.hour}:${expires.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.accentPurple,
                  ),
                ),
              ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => _shareCode(_status!.inviteCode!),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(
                    color: AppColors.accentPurple,
                    width: 1.5,
                  ),
                ),
                child: const Text(
                  '📤 코드 공유하기',
                  style: TextStyle(
                    color: AppColors.accentPurple,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: _inviting ? null : _handleCreateInvite,
          child: _inviting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('🔄 새 코드 재발급'),
        ),
      ),
    ];
  }

  List<Widget> _unlinkedContent() {
    return [
      Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.all(24),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          children: const [
            Text('💑', style: TextStyle(fontSize: 48)),
            SizedBox(height: 10),
            Text(
              '배우자와 함께 기록하세요',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 8),
            Text(
              '난임은 혼자가 아니에요. 배우자와 시술 일정·복약·호르몬 수치를 함께 확인하고 응원할 수 있어요.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Color(0xE6FFFFFF),
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '초대코드 보내기',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const Text(
              '배우자에게 코드를 보내 연결을 시작하세요',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _inviting ? null : _handleCreateInvite,
                child: _inviting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('💌 초대코드 생성하기'),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      Row(
        children: const [
          Expanded(child: Divider(color: AppColors.primaryLight)),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 10),
            child: Text(
              '또는',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ),
          Expanded(child: Divider(color: AppColors.primaryLight)),
        ],
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '초대코드 입력하기',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const Text(
              '배우자가 보낸 6자리 코드를 입력하세요',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _codeCtrl,
                    textAlign: TextAlign.center,
                    textCapitalization: TextCapitalization.characters,
                    maxLength: 6,
                    onChanged: (v) => _codeCtrl.value = _codeCtrl.value
                        .copyWith(text: v.toUpperCase()),
                    decoration: const InputDecoration(
                      hintText: '예: AB1234',
                      counterText: '',
                    ),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                      letterSpacing: 4,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton(
                  onPressed: _joining ? null : _handleJoin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.textDark,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 16,
                    ),
                  ),
                  child: _joining
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('연결'),
                ),
              ],
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '연결 후 이런 걸 함께 할 수 있어요',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 12),
            const _FeatureRow(emoji: '📅', text: '시술 일정 함께 열람 · 기록'),
            const _FeatureRow(emoji: '💊', text: '복약 스케줄 공동 확인'),
            const _FeatureRow(emoji: '📊', text: '호르몬 수치 공유'),
            const _FeatureRow(emoji: '🔔', text: '일정 등록 시 배우자에게 알림'),
            const _FeatureRow(emoji: '📔', text: '감정일기 — 선택적으로 공유'),
          ],
        ),
      ),
    ];
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({required this.emoji, required this.text});
  final String emoji;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          SizedBox(
            width: 26,
            child: Text(emoji, style: const TextStyle(fontSize: 18)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, color: AppColors.textDark),
            ),
          ),
        ],
      ),
    );
  }
}
