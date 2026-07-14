import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../models/treatment.dart';
import 'fcm_service.dart';

const _medChannelId = 'bom_medication';
const _appointmentChannelId = 'bom_appointment';
const _dailyChannelId = 'bom_daily';
const _dailyBbtId = 990001;

/// Port of apps/mobile/lib/notifications.ts's local-notification half
/// (medication / D-1 appointment / daily BBT reminders), using
/// flutter_local_notifications instead of expo-notifications.
class LocalNotifications {
  LocalNotifications._();
  static final instance = LocalNotifications._();

  final _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> _ensureInit() async {
    if (_initialized) return;
    tzdata.initializeTimeZones();
    try {
      tz.setLocalLocation(tz.getLocation(DateTime.now().timeZoneName));
    } catch (_) {
      // Fall back to UTC offset if the platform's tz name isn't in the db;
      // schedules still fire at the right wall-clock time via TZDateTime.from.
    }

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    await _plugin.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
    );

    if (Platform.isAndroid) {
      final androidPlugin = _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _medChannelId,
          '약물 복용 알림',
          importance: Importance.high,
        ),
      );
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _appointmentChannelId,
          '시술 일정 알림',
          importance: Importance.high,
        ),
      );
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _dailyChannelId,
          '일일 기록 독려',
          importance: Importance.defaultImportance,
        ),
      );
    }
    _initialized = true;
  }

  Future<bool> hasNotificationPermission() async {
    if (Platform.isAndroid) {
      final androidPlugin = _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      return await androidPlugin?.areNotificationsEnabled() ?? false;
    }
    if (Platform.isIOS) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool('bom_notif_permission') ?? false;
    }
    return false;
  }

  Future<bool> requestNotificationPermission() async {
    await _ensureInit();
    bool granted = false;
    if (Platform.isAndroid) {
      final androidPlugin = _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      granted = await androidPlugin?.requestNotificationsPermission() ?? false;
    } else if (Platform.isIOS) {
      final iosPlugin = _plugin
          .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin
          >();
      granted =
          await iosPlugin?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          ) ??
          false;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('bom_notif_permission', granted);
    }
    return granted;
  }

  Future<void> registerPushToken() async {
    // Wired to FCM in fcm_service.dart; kept here as a thin pass-through so
    // callers (settings/login) have one entry point, matching the RN app's
    // registerPushToken() call sites.
    await FcmService.instance.registerToken();
  }

  Future<void> scheduleDailyBBTReminder() async {
    await _ensureInit();
    final pending = await _plugin.pendingNotificationRequests();
    if (pending.any((n) => n.id == _dailyBbtId)) return;

    final now = tz.TZDateTime.now(tz.local);
    var trigger = tz.TZDateTime(tz.local, now.year, now.month, now.day, 7);
    if (trigger.isBefore(now)) trigger = trigger.add(const Duration(days: 1));

    await _plugin.zonedSchedule(
      _dailyBbtId,
      '🌡️ 오늘 기초체온 기록했나요?',
      '매일 기록이 정확한 배란일 예측에 도움이 돼요 💕',
      trigger,
      const NotificationDetails(
        android: AndroidNotificationDetails(_dailyChannelId, '일일 기록 독려'),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  Future<void> cancelDailyBBTReminder() async {
    await _ensureInit();
    await _plugin.cancel(_dailyBbtId);
  }

  Future<bool> isDailyBBTScheduled() async {
    await _ensureInit();
    final pending = await _plugin.pendingNotificationRequests();
    return pending.any((n) => n.id == _dailyBbtId);
  }

  Future<bool> isMedicationReminderScheduled() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList('bom_med_notif_ids') ?? const []).isNotEmpty;
  }

  Future<void> cancelMedicationReminders() async {
    await _ensureInit();
    final prefs = await SharedPreferences.getInstance();
    final ids = prefs.getStringList('bom_med_notif_ids') ?? const [];
    for (final id in ids) {
      await _plugin.cancel(int.parse(id));
    }
    await prefs.setStringList('bom_med_notif_ids', []);
  }

  Future<void> cancelAllScheduled() async {
    await _ensureInit();
    await _plugin.cancelAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('bom_med_notif_ids', []);
    await prefs.setStringList('bom_appointment_notif_ids', []);
  }

  /// Cancels previously scheduled medication/appointment alerts and
  /// reschedules from the given (still-`scheduled`) treatment schedules.
  Future<void> rescheduleMedicationAlerts(
    List<TreatmentSchedule> schedules,
  ) async {
    await _ensureInit();
    final prefs = await SharedPreferences.getInstance();

    for (final key in ['bom_med_notif_ids', 'bom_appointment_notif_ids']) {
      final ids = prefs.getStringList(key) ?? const [];
      for (final id in ids) {
        await _plugin.cancel(int.parse(id));
      }
      await prefs.setStringList(key, []);
    }

    final medIds = <int>[];
    final apptIds = <int>[];

    final upcoming = schedules.where((s) => s.status == 'scheduled');
    for (final schedule in upcoming) {
      final apptId = await _scheduleAppointmentReminder(schedule);
      if (apptId != null) apptIds.add(apptId);

      for (final med in schedule.medications ?? const <Medication>[]) {
        final ids = await _scheduleMedicationReminder(med);
        medIds.addAll(ids);
      }
    }

    await prefs.setStringList(
      'bom_med_notif_ids',
      medIds.map((e) => e.toString()).toList(),
    );
    await prefs.setStringList(
      'bom_appointment_notif_ids',
      apptIds.map((e) => e.toString()).toList(),
    );
  }

  Future<int?> _scheduleAppointmentReminder(TreatmentSchedule schedule) async {
    final scheduledAt = DateTime.tryParse(schedule.scheduledAt);
    if (scheduledAt == null) return null;

    final dayBefore = scheduledAt.subtract(const Duration(days: 1));
    var trigger = DateTime(dayBefore.year, dayBefore.month, dayBefore.day, 9);
    if (trigger.isBefore(DateTime.now())) return null;

    final id = ('appt_${schedule.id}').hashCode & 0x7fffffff;
    final hospitalSuffix = schedule.hospitalName != null
        ? ' · ${schedule.hospitalName}'
        : '';
    await _plugin.zonedSchedule(
      id,
      '내일 ${schedule.title} 일정이 있어요 🌸',
      '${scheduledAt.month}월 ${scheduledAt.day}일 ${scheduledAt.hour}시 예정$hospitalSuffix',
      tz.TZDateTime.from(trigger, tz.local),
      const NotificationDetails(
        android: AndroidNotificationDetails(_appointmentChannelId, '시술 일정 알림'),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
    return id;
  }

  Future<List<int>> _scheduleMedicationReminder(Medication med) async {
    final endDate = med.endDate != null
        ? DateTime.tryParse(med.endDate!)
        : null;
    final now = DateTime.now();
    if (endDate != null && endDate.isBefore(now)) return const [];

    final ids = <int>[];
    for (final timeStr in med.times) {
      final parts = timeStr.split(':');
      if (parts.length != 2) continue;
      final hour = int.tryParse(parts[0]);
      final minute = int.tryParse(parts[1]);
      if (hour == null || minute == null) continue;

      var trigger = tz.TZDateTime(
        tz.local,
        now.year,
        now.month,
        now.day,
        hour,
        minute,
      );
      if (trigger.isBefore(tz.TZDateTime.now(tz.local))) {
        trigger = trigger.add(const Duration(days: 1));
      }

      final id = ('med_${med.name}_${med.dose}_$timeStr').hashCode & 0x7fffffff;
      await _plugin.zonedSchedule(
        id,
        '💊 약 복용 알림',
        '$timeStr — ${med.name} ${med.dose} 복용 시간이에요',
        trigger,
        const NotificationDetails(
          android: AndroidNotificationDetails(_medChannelId, '약물 복용 알림'),
          iOS: DarwinNotificationDetails(),
        ),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: DateTimeComponents.time,
      );
      ids.add(id);
    }
    return ids;
  }

  Future<void> initNotifications(List<TreatmentSchedule> schedules) async {
    final granted = await requestNotificationPermission();
    if (!granted) return;
    await Future.wait([
      registerPushToken(),
      scheduleDailyBBTReminder(),
      rescheduleMedicationAlerts(schedules),
    ]);
  }
}
