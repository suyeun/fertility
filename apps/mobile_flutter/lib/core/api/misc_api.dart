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

/// 관리자 사이트에서 등록하는 실시간 이벤트 배너.
class EventBanner {
  EventBanner({
    required this.id,
    required this.title,
    required this.subTitle,
    required this.imageUrl,
    required this.linkUrl,
    required this.position,
    required this.order,
    required this.bgColor,
    this.isAd = false,
    this.advertiserType = 'brand',
    this.hospitalId,
  });

  final String id;
  final String title;
  final String subTitle;
  final String imageUrl;
  final String linkUrl;
  final String position;
  final int order;
  final String bgColor;

  /// true 면 "광고" 표시를 붙인다. 병원 배너는 서버가 항상 true 로 내려준다.
  final bool isAd;

  /// 'brand' | 'hospital'
  final String advertiserType;
  final String? hospitalId;

  factory EventBanner.fromJson(Map<String, dynamic> j) => EventBanner(
    id: j['id'] as String? ?? '',
    title: j['title'] as String? ?? '',
    subTitle: j['subTitle'] as String? ?? '',
    imageUrl: j['imageUrl'] as String? ?? '',
    linkUrl: j['linkUrl'] as String? ?? '',
    position: j['position'] as String? ?? 'home',
    order: (j['order'] as num?)?.toInt() ?? 1,
    bgColor: j['bgColor'] as String? ?? '',
    isAd: j['isAd'] == true,
    advertiserType: j['advertiserType'] as String? ?? 'brand',
    hospitalId: j['hospitalId'] as String?,
  );
}

/// 광고 노출·클릭 집계 — 비식별. 실패해도 사용자 경험에 영향을 주지 않도록
/// 호출 측은 await 하지 않고 오류를 무시한다.
class AdsApi {
  AdsApi(this._client);
  final ApiClient _client;

  Future<void> sendEvent({
    required String type, // 'impression' | 'click'
    required String target, // 'banner' | 'hospital'
    required String targetId,
  }) async {
    if (targetId.isEmpty) return;
    try {
      await _client.post<void>(
        '/ads/events',
        data: {'type': type, 'target': target, 'targetId': targetId},
      );
    } catch (_) {
      // 집계 실패는 무시
    }
  }
}

class BannersApi {
  BannersApi(this._client);
  final ApiClient _client;

  Future<List<EventBanner>> getBanners(String position) async {
    final res = await _client.get<List<dynamic>>(
      '/banners',
      query: {'position': position},
    );
    return (res.data ?? [])
        .map((e) => EventBanner.fromJson(e as Map<String, dynamic>))
        .toList();
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
