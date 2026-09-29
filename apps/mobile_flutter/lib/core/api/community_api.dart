import '../models/community.dart';
import 'client.dart';

class CommunityApi {
  CommunityApi(this._client);
  final ApiClient _client;

  Future<List<CommunityPost>> getPosts({
    String? category,
    String? tag,
    String? userMode,
  }) async {
    final res = await _client.get<List<dynamic>>(
      '/community/posts',
      query: {
        if (category != null) 'category': category,
        if (tag != null) 'tag': tag,
        if (userMode != null) 'userMode': userMode,
      },
    );
    return (res.data ?? const [])
        .map((e) => CommunityPost.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CommunityPost> createPost({
    required String tag,
    required String title,
    required String content,
    String? anonymousName,
  }) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/community/posts',
      data: {
        'tag': tag,
        'title': title,
        'content': content,
        if (anonymousName != null) 'anonymousName': anonymousName,
      },
    );
    return CommunityPost.fromJson(res.data!);
  }

  Future<void> reactPost(String id, String reaction) =>
      _client.post('/community/posts/$id/react', data: {'reaction': reaction});

  Future<void> deletePost(String id) => _client.delete('/community/posts/$id');

  /// 신고 — reason: spam | harassment | medical_misinfo | privacy | sexual | other
  Future<ReportResult> reportPost(String id, String reason, {String? detail}) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/community/posts/$id/report',
      data: {'reason': reason, if (detail != null && detail.isNotEmpty) 'detail': detail},
    );
    return ReportResult.fromJson(res.data ?? const {});
  }

  Future<ReportResult> reportComment(String id, String reason, {String? detail}) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/community/comments/$id/report',
      data: {'reason': reason, if (detail != null && detail.isNotEmpty) 'detail': detail},
    );
    return ReportResult.fromJson(res.data ?? const {});
  }

  /// 글 또는 댓글의 작성자를 차단한다 — 서버가 작성자를 해석하므로 토큰이 노출되지 않는다.
  Future<void> blockAuthor({String? postId, String? commentId}) => _client.post(
    '/community/block',
    data: {
      if (postId != null) 'postId': postId,
      if (commentId != null) 'commentId': commentId,
    },
  );

  Future<void> unblockAll() => _client.delete('/community/block');

  Future<List<CommunityComment>> getComments(String id) async {
    final res = await _client.get<List<dynamic>>(
      '/community/posts/$id/comments',
    );
    return (res.data ?? const [])
        .map((e) => CommunityComment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CommunityComment> addComment(
    String id,
    String content, {
    String? anonymousName,
  }) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/community/posts/$id/comments',
      data: {
        'content': content,
        if (anonymousName != null) 'anonymousName': anonymousName,
      },
    );
    return CommunityComment.fromJson(res.data!);
  }
}

class ReportResult {
  const ReportResult({required this.reporterCount, required this.hidden});
  final int reporterCount;
  final bool hidden;
  factory ReportResult.fromJson(Map<String, dynamic> j) => ReportResult(
    reporterCount: (j['reporterCount'] as num?)?.toInt() ?? 1,
    hidden: j['hidden'] == true,
  );
}
