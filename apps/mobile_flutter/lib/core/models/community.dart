import 'enums.dart';

class Reactions {
  Reactions({required this.cheer, required this.empathy, required this.pray});

  final List<String> cheer;
  final List<String> empathy;
  final List<String> pray;

  factory Reactions.fromJson(Map<String, dynamic>? j) {
    List<String> l(String key) =>
        (j?[key] as List?)?.map((e) => e.toString()).toList() ?? const [];
    return Reactions(cheer: l('cheer'), empathy: l('empathy'), pray: l('pray'));
  }

  Map<String, dynamic> toJson() => {
    'cheer': cheer,
    'empathy': empathy,
    'pray': pray,
  };

  int countFor(ReactionType type) {
    switch (type) {
      case 'cheer':
        return cheer.length;
      case 'empathy':
        return empathy.length;
      case 'pray':
        return pray.length;
      default:
        return 0;
    }
  }
}

class CommunityPost {
  CommunityPost({
    required this.id,
    required this.authorToken,
    required this.authorName,
    required this.isAnonymous,
    required this.category,
    required this.tag,
    required this.targetMode,
    required this.content,
    required this.commentsCount,
    required this.reactions,
    required this.createdAt,
    this.isDeleted,
  });

  final String id;
  final String authorToken;
  final String authorName;
  final bool isAnonymous;
  final PostCategory category;
  final PostTag tag;
  final PostTargetMode targetMode;
  final String content;
  final int commentsCount;
  final Reactions reactions;
  final String createdAt;
  final bool? isDeleted;

  factory CommunityPost.fromJson(Map<String, dynamic> j) => CommunityPost(
    id: j['id'] as String,
    authorToken: j['authorToken'] as String? ?? '',
    authorName: j['authorName'] as String? ?? '',
    isAnonymous: j['isAnonymous'] as bool? ?? true,
    category: j['category'] as String? ?? 'DAILY',
    tag: j['tag'] as String? ?? '',
    targetMode: j['targetMode'] as String? ?? 'ALL',
    content: j['content'] as String? ?? '',
    commentsCount: (j['commentsCount'] as num?)?.toInt() ?? 0,
    reactions: Reactions.fromJson(j['reactions'] as Map<String, dynamic>?),
    createdAt: j['createdAt'] as String? ?? '',
    isDeleted: j['isDeleted'] as bool?,
  );
}

class CommunityComment {
  CommunityComment({
    required this.id,
    required this.postId,
    required this.authorToken,
    required this.authorName,
    required this.isAnonymous,
    required this.isAuthor,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String postId;
  final String authorToken;
  final String authorName;
  final bool isAnonymous;
  final bool isAuthor;
  final String content;
  final String createdAt;

  factory CommunityComment.fromJson(Map<String, dynamic> j) => CommunityComment(
    id: j['id'] as String,
    postId: j['postId'] as String? ?? '',
    authorToken: j['authorToken'] as String? ?? '',
    authorName: j['authorName'] as String? ?? '',
    isAnonymous: j['isAnonymous'] as bool? ?? true,
    isAuthor: j['isAuthor'] as bool? ?? false,
    content: j['content'] as String? ?? '',
    createdAt: j['createdAt'] as String? ?? '',
  );
}
