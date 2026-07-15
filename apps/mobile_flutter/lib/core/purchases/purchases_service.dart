import 'dart:io';

import 'package:flutter/services.dart' show PlatformException;
import 'package:purchases_flutter/purchases_flutter.dart';

/// Port of apps/mobile/lib/purchases.ts — RevenueCat wrapper.
/// Product IDs / entitlement must match what's registered in App Store
/// Connect / Google Play Console + the RevenueCat dashboard.
class PurchasesService {
  PurchasesService._();
  static final instance = PurchasesService._();

  static const productIdMonthly = 'bom_monthly';
  static const productIdAnnual = 'bom_annual';
  static const entitlementId = 'bom_premium';

  bool _initialized = false;
  bool get isInitialized => _initialized;

  Future<void> initPurchases({String? userId}) async {
    if (_initialized) return;

    final apiKey = Platform.isIOS
        ? const String.fromEnvironment('RC_API_KEY_IOS')
        : const String.fromEnvironment('RC_API_KEY_ANDROID');
    if (apiKey.isEmpty) return;

    await Purchases.setLogLevel(LogLevel.warn);
    await Purchases.configure(PurchasesConfiguration(apiKey));

    if (userId != null) {
      await Purchases.logIn(userId);
    }

    _initialized = true;
  }

  Future<void> identifyUser(String userId) async {
    if (!_initialized) return;
    await Purchases.logIn(userId);
  }

  Future<SubscriptionStatus> getSubscriptionStatus() async {
    if (!_initialized) return const SubscriptionStatus(isActive: false);
    try {
      final info = await Purchases.getCustomerInfo();
      final entitlement = info.entitlements.active[entitlementId];
      if (entitlement != null) {
        return SubscriptionStatus(
          isActive: true,
          productId: entitlement.productIdentifier,
          expiresAt: entitlement.expirationDate,
        );
      }
      return const SubscriptionStatus(isActive: false);
    } catch (_) {
      return const SubscriptionStatus(isActive: false);
    }
  }

  Future<List<Package>> getOfferings() async {
    if (!_initialized) return [];
    try {
      final offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages ?? [];
    } catch (_) {
      return [];
    }
  }

  Future<PurchaseResult> purchasePackage(Package pkg) async {
    if (!_initialized) {
      return const PurchaseResult(success: false, error: '결제 모듈이 초기화되지 않았어요.');
    }
    try {
      final info = await Purchases.purchasePackage(pkg);
      final isActive = info.entitlements.active.containsKey(entitlementId);
      return PurchaseResult(success: isActive);
    } on PlatformException catch (e) {
      final errorCode = PurchasesErrorHelper.getErrorCode(e);
      if (errorCode == PurchasesErrorCode.purchaseCancelledError) {
        return const PurchaseResult(success: false, error: 'cancelled');
      }
      // RevenueCat's PlatformException.message is vendor/English text (store
      // response codes etc.) — never surface it directly, always the Korean fallback.
      return const PurchaseResult(
        success: false,
        error: '결제 중 오류가 발생했어요.',
      );
    }
  }

  Future<bool> restorePurchases() async {
    if (!_initialized) return false;
    try {
      final info = await Purchases.restorePurchases();
      return info.entitlements.active.containsKey(entitlementId);
    } catch (_) {
      return false;
    }
  }

  void Function()? addCustomerInfoListener(
    void Function(CustomerInfo info) callback,
  ) {
    if (!_initialized) return null;
    Purchases.addCustomerInfoUpdateListener(callback);
    return () => Purchases.removeCustomerInfoUpdateListener(callback);
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
