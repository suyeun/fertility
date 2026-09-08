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
const _subsidyChannelId = 'bom_subsidy';
const _dailyBbtId = 990001;

// 지원금 배너 대상 시술 유형 — monitoring/other(초음파·채혈·주사·기타)은 제외.
const _subsidyEligibleTypes = {'IVF', 'IUI', 'FET'};

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
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _subsidyChannelId,
          '지원금 알림',
          importance: Importance.high,
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
    await prefs.setStringList('bom_subsidy_notif_ids', []);
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
      // 배우자 일정의 D-1 리마인더는 백엔드가 배우자용 푸시로 보내므로
      // 기기 로컬 알림은 내 일정에만 잡는다 (중복 방지).
      if (!schedule.isPartnerRecord) {
        final apptId = await _scheduleAppointmentReminder(schedule);
        if (apptId != null) apptIds.add(apptId);
      }

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

  Future<bool> isSubsidyReminderEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('bom_subsidy_notif_enabled') ?? true;
  }

  Future<void> setSubsidyReminderEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('bom_subsidy_notif_enabled', enabled);
    if (!enabled) {
      await _cancelSubsidyAlerts();
    }
  }

  Future<void> _cancelSubsidyAlerts() async {
    await _ensureInit();
    final prefs = await SharedPreferences.getInstance();
    final ids = prefs.getStringList('bom_subsidy_notif_ids') ?? const [];
    for (final id in ids) {
      await _plugin.cancel(int.parse(id));
    }
    await prefs.setStringList('bom_subsidy_notif_ids', []);
  }

  /// 지원금 대상 시술(IVF/FET/IUI) 일정마다 D-7 통지서 발급 알림, D+14 청구 서류
  /// 준비 알림 2건을 예약한다 — 구독자 전용, 설정에서 끌 수 있다.
  Future<void> rescheduleSubsidyAlerts(List<TreatmentSchedule> schedules) async {
    await _ensureInit();
    if (!(await isSubsidyReminderEnabled())) return;
    await _cancelSubsidyAlerts();

    final ids = <int>[];
    final upcoming = schedules.where(
      (s) => s.status == 'scheduled' && _subsidyEligibleTypes.contains(s.type),
    );
    for (final schedule in upcoming) {
      ids.addAll(await _scheduleSubsidyReminders(schedule));
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(
      'bom_subsidy_notif_ids',
      ids.map((e) => e.toString()).toList(),
    );
  }

  Future<List<int>> _scheduleSubsidyReminders(
    TreatmentSchedule schedule,
  ) async {
    final scheduledAt = DateTime.tryParse(schedule.scheduledAt);
    if (scheduledAt == null) return const [];

    final ids = <int>[];
    final now = DateTime.now();

    final noticeTrigger = DateTime(
      scheduledAt.year,
      scheduledAt.month,
      scheduledAt.day,
      9,
    ).subtract(const Duration(days: 7));
    if (noticeTrigger.isAfter(now)) {
      final noticeId = ('subsidy_notice_${schedule.id}').hashCode & 0x7fffffff;
      await _plugin.zonedSchedule(
        noticeId,
        '💰 지원결정통지서, 아직이라면 지금 신청하세요',
        '${schedule.title} 시술 전 발급이 필요해요 (정부24 · e보건소 · 관할 보건소)',
        tz.TZDateTime.from(noticeTrigger, tz.local),
        const NotificationDetails(
          android: AndroidNotificationDetails(_subsidyChannelId, '지원금 알림'),
          iOS: DarwinNotificationDetails(),
        ),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
      ids.add(noticeId);
    }

    final claimTrigger = DateTime(
      scheduledAt.year,
      scheduledAt.month,
      scheduledAt.day,
      9,
    ).add(const Duration(days: 14));
    if (claimTrigger.isAfter(now)) {
      final claimId = ('subsidy_claim_${schedule.id}').hashCode & 0x7fffffff;
      await _plugin.zonedSchedule(
        claimId,
        '📋 시술비 청구 서류를 준비하세요',
        '영수증·세부내역서를 챙겨 지자체에 청구할 시기예요',
        tz.TZDateTime.from(claimTrigger, tz.local),
        const NotificationDetails(
          android: AndroidNotificationDetails(_subsidyChannelId, '지원금 알림'),
          iOS: DarwinNotificationDetails(),
        ),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
      ids.add(claimId);
    }

    return ids;
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

  Future<void> initNotifications(
    List<TreatmentSchedule> schedules, {
    bool isPremium = false,
  }) async {
    final granted = await requestNotificationPermission();
    if (!granted) return;
    await Future.wait([
      registerPushToken(),
      scheduleDailyBBTReminder(),
      rescheduleMedicationAlerts(schedules),
      if (isPremium) rescheduleSubsidyAlerts(schedules),
    ]);
  }
}
