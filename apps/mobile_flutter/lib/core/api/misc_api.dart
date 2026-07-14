import 'client.dart';

class NotificationsApi {
  NotificationsApi(this._client);
  final ApiClient _client;

  Future<void> registerToken(String token, String platform) => _client.post(
    '/notifications/token',
    data: {'token': token, 'platform': platform},
  );
}

/// status: 'force' | 'optional' | 'ok'
class VersionCheckResult {
  VersionCheckResult({
    required this.status,
    required this.message,
    this.storeUrlIos,
    this.storeUrlAndroid,
  });

  final String status;
  final String message;
  final String? storeUrlIos;
  final String? storeUrlAndroid;

  factory VersionCheckResult.fromJson(Map<String, dynamic> j) {
    final storeUrl = j['storeUrl'] as Map<String, dynamic>?;
    return VersionCheckResult(
      status: j['status'] as String? ?? 'ok',
      message: j['message'] as String? ?? '',
      storeUrlIos: storeUrl?['ios'] as String?,
      storeUrlAndroid: storeUrl?['android'] as String?,
    );
  }
}

class VersionApi {
  VersionApi(this._client);
  final ApiClient _client;

  Future<VersionCheckResult> check(String version, String platform) async {
    final res = await _client.get<Map<String, dynamic>>(
      '/app/version-check',
      query: {'version': version, 'platform': platform},
    );
    return VersionCheckResult.fromJson(res.data ?? {});
  }
}

class AffiliateProduct {
  AffiliateProduct({
    required this.name,
    required this.desc,
    required this.platform,
    required this.url,
  });
  final String name;
  final String desc;
  final String platform;
  final String url;

  factory AffiliateProduct.fromJson(Map<String, dynamic> j) => AffiliateProduct(
    name: j['name'] as String? ?? '',
    desc: j['desc'] as String? ?? '',
    platform: j['platform'] as String? ?? '',
    url: j['url'] as String? ?? '',
  );
}

class InfoApi {
  InfoApi(this._client);
  final ApiClient _client;

  /// articleId → product list
  Future<Map<String, List<AffiliateProduct>>> getProducts() async {
    final res = await _client.get<Map<String, dynamic>>('/info/products');
    final data = res.data ?? {};
    return data.map(
      (key, value) => MapEntry(
        key,
        (value as List)
            .map((e) => AffiliateProduct.fromJson(e as Map<String, dynamic>))
            .toList(),
      ),
    );
  }
}
