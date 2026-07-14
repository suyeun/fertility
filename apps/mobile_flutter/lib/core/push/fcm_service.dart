import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/misc_api.dart';

/// Native FCM registration — mirrors apps/mobile/lib/notifications.ts's
/// registerPushToken(), but sends a raw FCM token instead of an Expo push
/// token. The backend already dual-supports both token types (see
/// apps/backend/src/notifications/notifications.service.ts's
/// isExpoPushToken() branch), so no backend change is required.
class FcmService {
  FcmService._();
  static final instance = FcmService._();

  NotificationsApi? _notificationsApi;
  final _localPlugin = FlutterLocalNotificationsPlugin();
  bool _foregroundHandlerSet = false;

  void configure(NotificationsApi notificationsApi) {
    _notificationsApi = notificationsApi;
  }

  Future<void> registerToken() async {
    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;

      final token = await messaging.getToken();
      if (token == null) return;

      final platform = Platform.isIOS ? 'ios' : 'android';
      await _notificationsApi?.registerToken(token, platform);

      _setupForegroundHandler();
    } catch (_) {
      // Push token registration failure is non-fatal — swallow, matches RN.
    }
  }

  void _setupForegroundHandler() {
    if (_foregroundHandlerSet) return;
    _foregroundHandlerSet = true;
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notification = message.notification;
      if (notification == null) return;
      _localPlugin.show(
        message.hashCode & 0x7fffffff,
        notification.title,
        notification.body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'bom_push',
            '푸시 알림',
            importance: Importance.high,
          ),
          iOS: DarwinNotificationDetails(),
        ),
      );
    });
  }
}
