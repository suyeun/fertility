import 'dart:developer' as developer;
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:purchases_flutter/purchases_flutter.dart';

/// Port of apps/mobile/lib/purchases.ts — RevenueCat wrapper.
/// Product IDs / entitlement must match what's registered in App Store
/// Connect / Google Play Console + the RevenueCat dashboard.
///
/// 구독 판정 원칙: RevenueCat 권한(entitlement)이 1차 소스다. 마지막으로 확인한
/// 권한 상태를 [entitlementActive] 에 캐시해 두고, 도메인 게이트(clinic_gate)가
/// Firestore 프로필보다 먼저 이 값을 본다 — 결제 직후 웹훅이 늦어도 잠금이 바로 풀린다.
class PurchasesService {
  PurchasesService._();
  static final instance = PurchasesService._();

  static const productIdMonthly = 'bom_monthly';
  static const productIdAnnual = 'bom_annual';
  static const entitlementId = 'bom_premium';

  bool _initialized = false;
  bool get isInitialized => _initialized;

  /// null = 아직 확인 못 함, true/false = 마지막 RevenueCat 응답 기준.
  final ValueNotifier<bool?> entitlementActive = ValueNotifier<bool?>(null);
  bool? get cachedEntitlementActive => entitlementActive.value;

  /// 마지막 상품 조회 실패 사유 — 구독 화면의 빈 상태 안내에 쓴다.
  String? lastOfferingsError;

  @visibleForTesting
  void debugSetEntitlement(bool? active) => entitlementActive.value = active;

  void _updateFromInfo(CustomerInfo info) {
    entitlementActive.value = info.entitlements.active.containsKey(entitlementId);
  }

  static void _log(String message, [Object? error]) {
    developer.log(message, name: 'purchases', error: error);
  }

  Future<void> initPurchases({String? userId}) async {
    if (_initialized) return;

    final apiKey = Platform.isIOS
        ? const String.fromEnvironment('RC_API_KEY_IOS')
        : const String.fromEnvironment('RC_API_KEY_ANDROID');
    if (apiKey.isEmpty) {
      _log('RC_API_KEY 미설정 — 결제 기능 비활성 (dart-define 확인)');
      return;
    }

    try {
      await Purchases.setLogLevel(kDebugMode ? LogLevel.debug : LogLevel.warn);
      await Purchases.configure(PurchasesConfiguration(apiKey));
      if (userId != null) {
        await Purchases.logIn(userId);
      }
      _initialized = true;
      // 갱신·만료·다른 기기 결제 등 서버 측 변화를 앱에 반영한다.
      Purchases.addCustomerInfoUpdateListener(_updateFromInfo);
    } catch (e) {
      _log('RevenueCat 초기화 실패', e);
    }
  }

  Future<void> identifyUser(String userId) async {
    if (!_initialized) return;
    try {
      final result = await Purchases.logIn(userId);
      _updateFromInfo(result.customerInfo);
    } catch (e) {
      _log('RevenueCat logIn 실패', e);
    }
  }

  Future<SubscriptionStatus> getSubscriptionStatus() async {
    if (!_initialized) return const SubscriptionStatus(isActive: false);
    try {
      final info = await Purchases.getCustomerInfo();
      _updateFromInfo(info);
      final entitlement = info.entitlements.active[entitlementId];
      if (entitlement != null) {
        return SubscriptionStatus(
          isActive: true,
          productId: entitlement.productIdentifier,
          expiresAt: entitlement.expirationDate,
        );
      }
      return const SubscriptionStatus(isActive: false);
    } catch (e) {
      _log('getCustomerInfo 실패', e);
      return const SubscriptionStatus(isActive: false);
    }
  }

  Future<List<Package>> getOfferings() async {
    if (!_initialized) {
      lastOfferingsError = '결제 모듈이 초기화되지 않았어요.';
      return [];
    }
    try {
      final offerings = await Purchases.getOfferings();
      final packages = offerings.current?.availablePackages ?? [];
      lastOfferingsError = packages.isEmpty
          ? '등록된 구독 상품이 없어요. 잠시 후 다시 시도해 주세요.'
          : null;
      if (packages.isEmpty) {
        _log('offerings.current 비어 있음 — 스토어 상품 등록/계약/Offering 설정 확인');
      }
      return packages;
    } on PlatformException catch (e) {
      lastOfferingsError = _messageFor(PurchasesErrorHelper.getErrorCode(e));
      _log('getOfferings 실패 (${e.code})', e);
      return [];
    } catch (e) {
      lastOfferingsError = '스토어에 연결할 수 없어요. 네트워크를 확인해 주세요.';
      _log('getOfferings 실패', e);
      return [];
    }
  }

  Future<PurchaseResult> purchasePackage(Package pkg) async {
    if (!_initialized) {
      return const PurchaseResult(success: false, error: '결제 모듈이 초기화되지 않았어요.');
    }
    try {
      final info = await Purchases.purchasePackage(pkg);
      _updateFromInfo(info);
      final isActive = info.entitlements.active.containsKey(entitlementId);
      if (!isActive) {
        _log('구매 응답에 권한 없음 — RevenueCat Entitlement($entitlementId) 상품 연결 확인');
        return const PurchaseResult(
          success: false,
          error: '결제는 처리됐지만 구독 권한을 확인하지 못했어요. 앱을 다시 열거나 "구매 복원"을 눌러 주세요.',
        );
      }
      return const PurchaseResult(success: true);
    } on PlatformException catch (e) {
      final code = PurchasesErrorHelper.getErrorCode(e);
      if (code == PurchasesErrorCode.purchaseCancelledError) {
        return const PurchaseResult(success: false, error: 'cancelled');
      }
      // RevenueCat's PlatformException.message is vendor/English text (store
      // response codes etc.) — never surface it directly. 로그에만 남긴다.
      _log('구매 실패 (${e.code} / $code)', e);
      return PurchaseResult(success: false, error: _messageFor(code));
    } catch (e) {
      _log('구매 실패 (unknown)', e);
      return const PurchaseResult(success: false, error: '결제 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  Future<RestoreResult> restorePurchases() async {
    if (!_initialized) {
      return const RestoreResult(restored: false, error: '결제 모듈이 초기화되지 않았어요.');
    }
    try {
      final info = await Purchases.restorePurchases();
      _updateFromInfo(info);
      return RestoreResult(restored: info.entitlements.active.containsKey(entitlementId));
    } on PlatformException catch (e) {
      final code = PurchasesErrorHelper.getErrorCode(e);
      _log('복원 실패 (${e.code} / $code)', e);
      return RestoreResult(restored: false, error: _messageFor(code));
    } catch (e) {
      _log('복원 실패 (unknown)', e);
      return const RestoreResult(restored: false, error: '구매 내역을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  void Function()? addCustomerInfoListener(
    void Function(CustomerInfo info) callback,
  ) {
    if (!_initialized) return null;
    Purchases.addCustomerInfoUpdateListener(callback);
    return () => Purchases.removeCustomerInfoUpdateListener(callback);
  }

  /// RevenueCat 오류 코드 → 사용자용 한글 안내. 원문은 로그에만 남긴다.
  static String _messageFor(PurchasesErrorCode code) {
    switch (code) {
      case PurchasesErrorCode.networkError:
      case PurchasesErrorCode.offlineConnectionError:
        return '네트워크에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
      case PurchasesErrorCode.storeProblemError:
        return '스토어(App Store/Play)에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.';
      case PurchasesErrorCode.purchaseNotAllowedError:
        return '이 기기에서는 결제가 허용되지 않아요. 기기 설정의 콘텐츠 제한을 확인해 주세요.';
      case PurchasesErrorCode.paymentPendingError:
        return '결제 승인이 진행 중이에요. 승인이 끝나면 자동으로 적용돼요.';
      case PurchasesErrorCode.productNotAvailableForPurchaseError:
        return '지금은 구매할 수 없는 상품이에요. 잠시 후 다시 시도해 주세요.';
      case PurchasesErrorCode.productAlreadyPurchasedError:
        return '이미 구독 중인 상품이에요. "구매 복원"을 눌러 주세요.';
      case PurchasesErrorCode.receiptAlreadyInUseError:
        return '이 구매는 다른 계정에 연결되어 있어요. 해당 계정으로 로그인해 주세요.';
      case PurchasesErrorCode.invalidCredentialsError:
      case PurchasesErrorCode.configurationError:
        return '결제 설정에 문제가 있어요. 문의해 주시면 빠르게 확인할게요.';
      case PurchasesErrorCode.purchaseInvalidError:
        return '결제 정보가 올바르지 않아요. 스토어 결제수단을 확인해 주세요.';
      default:
        return '결제 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
    }
  }
}

class SubscriptionStatus {
  const SubscriptionStatus({
    required this.isActive,
    this.productId,
    this.expiresAt,
  });
  final bool isActive;
  final String? productId;
  final String? expiresAt;
}

class PurchaseResult {
  const PurchaseResult({required this.success, this.error});
  final bool success;
  final String? error;
}

class RestoreResult {
  const RestoreResult({required this.restored, this.error});
  final bool restored;
  final String? error;
}
