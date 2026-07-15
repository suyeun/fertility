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
