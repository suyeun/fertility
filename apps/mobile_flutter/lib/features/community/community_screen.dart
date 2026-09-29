import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';

const Map<PostCategory, List<PostTag>> _categoryTags = {
  'DAILY': ['#감정토닥', '#남편_시댁', '#아무말', '#소소한일상', '#고민상담'],
  'CLINIC': ['#시험관_신선', '#시험관_동결', '#인공수정', '#병원추천', '#판정대기'],
  'INFO': ['#배테기_기초체온', '#영양제추천', '#운동_식단', '#한방차_한의원', '#스트레스관리'],
};

const _reactionConfig = {
  'cheer': (emoji: '💪', label: '응원해요'),
  'empathy': (emoji: '🤗', label: '공감해요'),
  'pray': (emoji: '🙏', label: '같이기도'),
};

String _timeAgo(String dateStr) {
  final dt = DateTime.tryParse(dateStr);
  if (dt == null) return '';
  final diff = DateTime.now().difference(dt);
  final m = diff.inMinutes;
  if (m < 1) return '방금';
  if (m < 60) return '$m분 전';
  final h = diff.inHours;
  if (h < 24) return '$h시간 전';
  return '${diff.inDays}일 전';
}

/// Port of apps/mobile/app/(tabs)/community/index.tsx.
class CommunityScreen extends ConsumerStatefulWidget {
  const CommunityScreen({super.key});

  @override
  ConsumerState<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends ConsumerState<CommunityScreen> {
  bool _loading = true;
  bool _postsLoading = false;

  UserProfile? _profile;
  PostCategory _activeCategory = 'DAILY';
  PostTag? _activeTag;
  List<CommunityPost> _posts = [];

  String? _expandedPostId;
  final Map<String, List<CommunityComment>> _commentsMap = {};
  final Map<String, TextEditingController> _commentCtrls = {};
  bool _commentSaving = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    for (final c in _commentCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  UserMode get _userMode {
    return _profile?.currentMode ??
        (_profile?.treatmentStage == 'natural' ? 'NATURAL' : 'CLINIC');
  }

  List<PostCategory> get _orderedCategories =>
      categoryOrder[_userMode] ?? categoryOrder['NATURAL']!;

  Future<void> _init() async {
    try {
      final p = await ref.read(usersApiProvider).getProfile();
      if (mounted) {
        setState(() {
          _profile = p;
          _activeCategory = (categoryOrder[_userMode] ?? const ['DAILY'])[0];
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
    await _fetchPosts();
  }

  Future<void> _fetchPosts() async {
    setState(() => _postsLoading = true);
    try {
      final data = await ref
          .read(communityApiProvider)
          .getPosts(
            category: _activeCategory,
            tag: _activeTag,
            userMode: _userMode,
          );
      if (mounted) setState(() => _posts = data);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _postsLoading = false);
    }
  }

  void _handleCategoryChange(PostCategory cat) {
    setState(() {
      _activeCategory = cat;
      _activeTag = null;
      _expandedPostId = null;
    });
    _fetchPosts();
  }

  Future<void> _handleReact(String postId, String reaction) async {
    try {
      await ref.read(communityApiProvider).reactPost(postId, reaction);
      await _fetchPosts();
    } catch (_) {}
  }

  Future<void> _handleExpandComments(String postId) async {
    if (_expandedPostId == postId) {
      setState(() => _expandedPostId = null);
      return;
    }
    setState(() => _expandedPostId = postId);
    if (!_commentsMap.containsKey(postId)) {
      try {
        final data = await ref.read(communityApiProvider).getComments(postId);
        if (mounted) setState(() => _commentsMap[postId] = data);
      } catch (_) {}
    }
  }

  Future<void> _handleAddComment(String postId) async {
    final ctrl = _commentCtrls[postId];
    final text = ctrl?.text.trim();
    if (text == null || text.isEmpty || _commentSaving) return;
    setState(() => _commentSaving = true);
    try {
      await ref.read(communityApiProvider).addComment(postId, text);
      ctrl?.clear();
      final updated = await ref.read(communityApiProvider).getComments(postId);
      if (mounted) {
        setState(() {
          _commentsMap[postId] = updated;
          _posts = _posts
              .map(
                (p) => p.id == postId
                    ? CommunityPost(
                        id: p.id,
                        authorToken: p.authorToken,
                        authorName: p.authorName,
                        isAnonymous: p.isAnonymous,
                        category: p.category,
                        tag: p.tag,
                        targetMode: p.targetMode,
                        title: p.title,
                        content: p.content,
                        commentsCount: p.commentsCount + 1,
                        reactions: p.reactions,
                        createdAt: p.createdAt,
                      )
                    : p,
              )
              .toList();
        });
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('댓글 등록에 실패했어요.')));
      }
    } finally {
      if (mounted) setState(() => _commentSaving = false);
    }
  }

  void _openWriteModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _WriteModal(
        category: _activeCategory,
        onCreated: () async {
          Navigator.of(context).pop();
          await _fetchPosts();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => context.pop(),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: const Icon(
                    Icons.chevron_left,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(width: 4),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.forum_rounded,
                            size: 18,
                            color: AppColors.primary,
                          ),
                          SizedBox(width: 6),
                          Text(
                            '공감 커뮤니티',
                            style: TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 3),
                      Text(
                        '같은 길을 걷는 분들과 마음을 나눠요 · 불쾌한 글은 ⋯ 메뉴에서 신고·차단',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                InkWell(
                  onTap: _openWriteModal,
                  borderRadius: BorderRadius.circular(22),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.edit_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: _orderedCategories.map((cat) {
                  final meta = categoryLabel[cat]!;
                  final active = _activeCategory == cat;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => _handleCategoryChange(cat),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: active ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            Text(
                              '${meta.emoji} ${meta.label}',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: active
                                    ? AppColors.primary
                                    : const Color(0xFF9CA3AF),
                              ),
                            ),
                            const SizedBox(height: 3),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 5,
                                vertical: 1,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceAlt,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                '🔒 익명',
                                style: TextStyle(
                                  fontSize: 8,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.accentPurple,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                border: Border.all(color: AppColors.accentPurpleLight),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('🔒', style: TextStyle(fontSize: 12)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: 'BOM 커뮤니티는 유저분들의 소중한 프라이버시를 위해 ',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.accentPurple,
                              height: 1.5,
                            ),
                          ),
                          TextSpan(
                            text: '100% 익명',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.accentPurple,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          TextSpan(
                            text: '으로 안전하게 운영됩니다. 안심하고 마음을 나눠보세요. 🌸',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.accentPurple,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 34,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _tagChip(
                    '전체',
                    _activeTag == null,
                    () => setState(() {
                      _activeTag = null;
                      _fetchPosts();
                    }),
                  ),
                  ...(_categoryTags[_activeCategory] ?? const []).map(
                    (tag) => _tagChip(tag, _activeTag == tag, () {
                      setState(
                        () => _activeTag = _activeTag == tag ? null : tag,
                      );
                      _fetchPosts();
                    }),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_postsLoading)
              const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            else if (_posts.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 60),
                child: Column(
                  children: [
                    Text(
                      '아직 게시글이 없어요',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textMuted,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '첫 번째 이야기를 들려주세요 🌸',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
              )
            else
              Column(children: _posts.map(_buildPostCard).toList()),
          ],
        ),
      ),
    );
  }

  Widget _tagChip(String label, bool active, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: active ? AppColors.primary : Colors.white,
            border: Border.all(
              color: active ? AppColors.primary : AppColors.primaryLight,
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: active ? Colors.white : AppColors.textMuted,
            ),
          ),
        ),
      ),
    );
  }

  static const _avatarEmojis = ['🌱', '🌷', '☀️', '🌼', '🍃', '🌸'];
  static const _avatarBackgrounds = [
    AppColors.surface,
    AppColors.surfaceAlt,
    AppColors.accentGreenLight,
    AppColors.primaryLight,
  ];

  Widget _postAvatar(String authorName) {
    final seed = authorName.hashCode.abs();
    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        color: _avatarBackgrounds[seed % _avatarBackgrounds.length],
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        _avatarEmojis[seed % _avatarEmojis.length],
        style: const TextStyle(fontSize: 12),
      ),
    );
  }

  Widget _buildPostCard(CommunityPost post) {
    final isExpanded = _expandedPostId == post.id;
    final comments = _commentsMap[post.id] ?? const <CommunityComment>[];
    final tagColor = post.targetMode == 'CLINIC'
        ? (bg: AppColors.surfaceAlt, fg: AppColors.accentPurple)
        : post.targetMode == 'NATURAL'
        ? (bg: AppColors.accentGreenLight, fg: AppColors.accentGreen)
        : (bg: AppColors.surface, fg: AppColors.primary);

    _commentCtrls.putIfAbsent(post.id, () => TextEditingController());

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primaryLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    _postAvatar(post.authorName),
                    const SizedBox(width: 8),
                    const Text('🔒', style: TextStyle(fontSize: 11)),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        post.authorName,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textDark,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: tagColor.bg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        post.tag,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: tagColor.fg,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                _timeAgo(post.createdAt),
                style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.textMutedLight,
                ),
              ),
              _postMenu(post),
            ],
          ),
          const SizedBox(height: 10),
          if (post.title != null && post.title!.isNotEmpty) ...[
            Text(
              post.title!,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 6),
          ],
          Text(
            post.content,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textDark,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.only(top: 8),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.surface)),
            ),
            child: Row(
              children: [
                ...['cheer', 'empathy', 'pray'].map((r) {
                  final count = post.reactions.countFor(r);
                  final cfg = _reactionConfig[r]!;
                  return Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: GestureDetector(
                      onTap: () => _handleReact(post.id, r),
                      child: Row(
                        children: [
                          Text(cfg.emoji, style: const TextStyle(fontSize: 14)),
                          const SizedBox(width: 4),
                          Text(
                            count > 0 ? '$count' : cfg.label,
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const Spacer(),
                GestureDetector(
                  onTap: () => _handleExpandComments(post.id),
                  child: Text(
                    '💬 ${post.commentsCount > 0 ? post.commentsCount : '댓글'}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (isExpanded) ...[
            Container(
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.only(top: 10),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.surface)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _commentCtrls[post.id],
                          onSubmitted: (_) => _handleAddComment(post.id),
                          decoration: const InputDecoration(
                            hintText: '익명으로 댓글이 달려요',
                            hintStyle: TextStyle(color: AppColors.textMutedLight),
                          ),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textDark,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () => _handleAddComment(post.id),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 9,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: _commentSaving
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  '전송',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (comments.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        '첫 댓글을 달아주세요 🌸',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors.textMutedLight,
                        ),
                      ),
                    )
                  else
                    ...comments.map(
                      (c) => InkWell(
                        onLongPress: c.isMine
                            ? null
                            : () => _showCommentActions(c),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '🔒 ${c.authorName}${c.isAuthor ? ' (글쓴이)' : ''}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textDark,
                                  ),
                                ),
                                Text(
                                  _timeAgo(c.createdAt),
                                  style: const TextStyle(
                                    fontSize: 9,
                                    color: AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              c.content,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMuted,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                        ),
                      ),
                    ),
                  if (comments.isNotEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 2),
                      child: Text(
                        '댓글을 길게 누르면 신고·차단할 수 있어요',
                        style: TextStyle(fontSize: 9, color: AppColors.textMutedLight),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── 신고 · 차단 · 삭제 ──────────────────────────────────

  static const _reportReasons = <(String, String)>[
    ('spam', '광고 · 홍보 · 도배'),
    ('harassment', '욕설 · 비하 · 괴롭힘'),
    ('medical_misinfo', '위험한 의학 정보 · 시술 권유'),
    ('privacy', '개인정보 노출'),
    ('sexual', '성적인 내용'),
    ('other', '기타'),
  ];

  Widget _postMenu(CommunityPost post) {
    return PopupMenuButton<String>(
      padding: EdgeInsets.zero,
      iconSize: 18,
      icon: const Icon(Icons.more_horiz_rounded, color: AppColors.textMutedLight),
      onSelected: (v) {
        switch (v) {
          case 'report':
            _showReportSheet(postId: post.id);
            break;
          case 'block':
            _confirmBlock(postId: post.id);
            break;
          case 'delete':
            _confirmDeletePost(post);
            break;
        }
      },
      itemBuilder: (_) => post.isMine
          ? const [
              PopupMenuItem(value: 'delete', child: Text('내 글 삭제')),
            ]
          : const [
              PopupMenuItem(value: 'report', child: Text('신고하기')),
              PopupMenuItem(value: 'block', child: Text('이 작성자 차단')),
            ],
    );
  }

  void _showCommentActions(CommunityComment c) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.flag_outlined),
              title: const Text('댓글 신고하기'),
              onTap: () {
                Navigator.of(ctx).pop();
                _showReportSheet(commentId: c.id);
              },
            ),
            ListTile(
              leading: const Icon(Icons.block_rounded),
              title: const Text('이 작성자 차단'),
              onTap: () {
                Navigator.of(ctx).pop();
                _confirmBlock(commentId: c.id);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showReportSheet({String? postId, String? commentId}) {
    String reason = _reportReasons.first.$1;
    final detailCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + MediaQuery.of(ctx).viewInsets.bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '신고 사유를 선택해주세요',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textDark),
              ),
              const SizedBox(height: 4),
              const Text(
                '신고는 운영자가 확인하며, 여러 사용자가 신고한 글은 검토 전까지 자동으로 숨겨져요.',
                style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.4),
              ),
              const SizedBox(height: 10),
              ..._reportReasons.map(
                (r) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    reason == r.$1
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_unchecked_rounded,
                    size: 18,
                    color: reason == r.$1 ? AppColors.primary : AppColors.textMuted,
                  ),
                  title: Text(r.$2, style: const TextStyle(fontSize: 13)),
                  onTap: () => setSheet(() => reason = r.$1),
                ),
              ),
              TextField(
                controller: detailCtrl,
                maxLength: 500,
                maxLines: 2,
                decoration: const InputDecoration(hintText: '추가 설명 (선택)'),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.of(ctx).pop();
                    await _submitReport(
                      postId: postId,
                      commentId: commentId,
                      reason: reason,
                      detail: detailCtrl.text.trim(),
                    );
                  },
                  child: const Text('신고 접수'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitReport({
    String? postId,
    String? commentId,
    required String reason,
    String? detail,
  }) async {
    try {
      final api = ref.read(communityApiProvider);
      final result = commentId != null
          ? await api.reportComment(commentId, reason, detail: detail)
          : await api.reportPost(postId!, reason, detail: detail);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.hidden
                ? '신고가 접수됐어요. 신고가 누적되어 검토 전까지 숨겨졌어요.'
                : '신고가 접수됐어요. 운영자가 확인 후 조치할게요.',
          ),
        ),
      );
      if (result.hidden) _fetchPosts();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('신고를 접수하지 못했어요. 잠시 후 다시 시도해주세요.')),
      );
    }
  }

  Future<void> _confirmBlock({String? postId, String? commentId}) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('이 작성자를 차단할까요?'),
        content: const Text(
          '차단한 작성자의 글과 댓글이 더 이상 보이지 않아요. 설정 > 커뮤니티에서 차단을 모두 해제할 수 있어요.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('취소')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('차단', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ref.read(communityApiProvider).blockAuthor(postId: postId, commentId: commentId);
      await _fetchPosts();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('작성자를 차단했어요.')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('차단하지 못했어요. 잠시 후 다시 시도해주세요.')),
      );
    }
  }

  Future<void> _confirmDeletePost(CommunityPost post) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('글을 삭제할까요?'),
        content: const Text('삭제한 글은 되돌릴 수 없어요.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('취소')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('삭제', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ref.read(communityApiProvider).deletePost(post.id);
      await _fetchPosts();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('글을 삭제하지 못했어요.')),
      );
    }
  }
}

class _WriteModal extends ConsumerStatefulWidget {
  const _WriteModal({required this.category, required this.onCreated});
  final PostCategory category;
  final VoidCallback onCreated;

  @override
  ConsumerState<_WriteModal> createState() => _WriteModalState();
}

class _WriteModalState extends ConsumerState<_WriteModal> {
  late PostTag _tag = (_categoryTags[widget.category] ?? const ['#아무말']).first;
  final _titleCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  bool get _canSubmit => _titleCtrl.text.trim().isNotEmpty && _contentCtrl.text.trim().isNotEmpty;

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(communityApiProvider)
          .createPost(tag: _tag, title: _titleCtrl.text.trim(), content: _contentCtrl.text.trim());
      widget.onCreated();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('게시글 등록에 실패했어요. 잠시 후 다시 시도해주세요.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tags = _categoryTags[widget.category] ?? const [];
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '글 작성하기',
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
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                border: Border.all(color: AppColors.accentPurpleLight),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '익명',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.accentPurple,
                        fontSize: 11,
                      ),
                    ),
                    TextSpan(
                      text: '으로 게시돼요. 닉네임이 자동 생성됩니다.',
                      style: TextStyle(color: AppColors.accentPurple, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              '태그 선택 *',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 34,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: tags
                    .map(
                      (tag) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setState(() => _tag = tag),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: _tag == tag
                                  ? AppColors.primary
                                  : Colors.white,
                              border: Border.all(
                                color: _tag == tag
                                    ? AppColors.primary
                                    : AppColors.primaryLight,
                              ),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              tag,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: _tag == tag
                                    ? Colors.white
                                    : AppColors.textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              '제목 *',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _titleCtrl,
              maxLength: 100,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: '제목을 입력해주세요',
                hintStyle: TextStyle(color: AppColors.textMutedLight),
              ),
              style: const TextStyle(fontSize: 13, color: AppColors.textDark),
            ),
            const SizedBox(height: 8),
            const Text(
              '내용 *',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _contentCtrl,
              maxLines: 5,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: '솔직하고 따뜻하게 이야기를 나눠주세요 🌸',
                hintStyle: TextStyle(color: AppColors.textMutedLight),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (!_canSubmit || _saving) ? null : _submit,
                child: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('게시하기'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
