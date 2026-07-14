import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';
import '../../state/providers.dart';

const Map<PostCategory, List<PostTag>> _categoryTags = {
  'DAILY': ['#감정토닥', '#남편_시댁', '#아무말'],
  'CLINIC': ['#시험관_신선', '#시험관_동결', '#인공수정', '#병원추천'],
  'INFO': ['#배테기_기초체온', '#영양제추천', '#운동_식단'],
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
      backgroundColor: const Color(0xFFFFFBFC),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(
                    Icons.chevron_left,
                    color: AppColors.textMuted,
                  ),
                ),
                const Expanded(
                  child: Column(
                    children: [
                      Text(
                        '👥 공감 커뮤니티',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textDark,
                        ),
                      ),
                      Text(
                        '같은 길을 걷는 분들과 마음을 나눠요',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                InkWell(
                  onTap: _openWriteModal,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Text(
                      '+ 글쓰기',
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
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F5),
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
                                color: const Color(0xFFEDE9FE),
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
                color: const Color(0xFFF5F3FF),
                border: Border.all(color: const Color(0xFFDDD6FE)),
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
                              color: Color(0xFF6D28D9),
                              height: 1.5,
                            ),
                          ),
                          TextSpan(
                            text: '100% 익명',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF6D28D9),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          TextSpan(
                            text: '으로 안전하게 운영됩니다. 안심하고 마음을 나눠보세요. 🌸',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF6D28D9),
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

  Widget _buildPostCard(CommunityPost post) {
    final isExpanded = _expandedPostId == post.id;
    final comments = _commentsMap[post.id] ?? const <CommunityComment>[];
    final tagColor = post.targetMode == 'CLINIC'
        ? (bg: const Color(0xFFEDE9FE), fg: AppColors.accentPurple)
        : post.targetMode == 'NATURAL'
        ? (bg: const Color(0xFFDCFCE7), fg: const Color(0xFF16A34A))
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
            ],
          ),
          const SizedBox(height: 10),
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
                            hintStyle: TextStyle(color: Color(0xFFC4A0AE)),
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
                      (c) => Container(
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
                                color: Color(0xFF8C5060),
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
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
  final _contentCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _contentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_contentCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(communityApiProvider)
          .createPost(tag: _tag, content: _contentCtrl.text.trim());
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
                color: const Color(0xFFF5F3FF),
                border: Border.all(color: const Color(0xFFDDD6FE)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '익명',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF6D28D9),
                        fontSize: 11,
                      ),
                    ),
                    TextSpan(
                      text: '으로 게시돼요. 닉네임이 자동 생성됩니다.',
                      style: TextStyle(color: Color(0xFF6D28D9), fontSize: 11),
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
                hintStyle: TextStyle(color: Color(0xFFC4A0AE)),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_contentCtrl.text.trim().isEmpty || _saving)
                    ? null
                    : _submit,
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
