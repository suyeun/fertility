class ArticleProduct {
  ArticleProduct({
    required this.name,
    required this.desc,
    required this.platform,
    required this.url,
  });

  final String name;
  final String desc;
  final String platform;
  final String url;

  factory ArticleProduct.fromJson(Map<String, dynamic> j) => ArticleProduct(
    name: j['name'] as String? ?? '',
    desc: j['desc'] as String? ?? '',
    platform: j['platform'] as String? ?? '',
    url: j['url'] as String? ?? '',
  );
}

class MedicalArticle {
  MedicalArticle({
    required this.id,
    required this.category,
    required this.title,
    required this.summary,
    this.content,
    this.authorName,
    this.authorAffiliation,
    required this.readMin,
    required this.tags,
    required this.publishedAt,
    required this.isVerified,
    this.products,
  });

  final String id;
  final String category;
  final String title;
  final String summary;
  final String? content;
  final String? authorName;
  final String? authorAffiliation;
  final int readMin;
  final List<String> tags;
  final String publishedAt;
  final bool isVerified;
  final List<ArticleProduct>? products;

  factory MedicalArticle.fromJson(Map<String, dynamic> j) => MedicalArticle(
    id: j['id'] as String,
    category: j['category'] as String? ?? '',
    title: j['title'] as String? ?? '',
    summary: j['summary'] as String? ?? '',
    content: j['content'] as String?,
    authorName: j['authorName'] as String?,
    authorAffiliation: j['authorAffiliation'] as String?,
    readMin: (j['readMin'] as num?)?.toInt() ?? 1,
    tags: (j['tags'] as List?)?.map((e) => e.toString()).toList() ?? const [],
    publishedAt: j['publishedAt'] as String? ?? '',
    isVerified: j['isVerified'] as bool? ?? false,
    products: (j['products'] as List?)
        ?.map((e) => ArticleProduct.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}
