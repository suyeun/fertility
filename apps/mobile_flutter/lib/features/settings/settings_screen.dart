import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/domain/clinic_gate.dart';
import '../../core/domain/mode_helpers.dart';
import '../../core/domain/pregnancy.dart';
import '../../core/models/models.dart' hide SubscriptionStatus;
import '../../core/push/local_notifications.dart';
import '../../core/purchases/purchases_service.dart';
import '../../core/theme/app_theme.dart';
import '../../state/auth_controller.dart';
import '../../state/profile_controller.dart';
import '../../state/providers.dart';
import '../onboarding/onboarding_data.dart';
import '../../widgets/event_banner_slider.dart';
import '../../widgets/paywall_modal.dart';

enum ModeChangeSheetKind { mode, stage, confirmNatural }

/// Port of apps/mobile/app/settings/index.tsx.
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _notifPermission = false;
  bool _dailyBbt = false;
  bool _medReminder = false;
  bool _subsidyReminder = true;
  bool _checkingPermission = false;
  SubscriptionStatus _subStatus = const SubscriptionStatus(isActive: false);
  bool _loading = true;

  ModeChangeSheetKind? _sheet;
  String? _pendingMode;
  bool _modeSaving = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      await ref.read(profileControllerProvider.notifier).syncProfile();
    } catch (_) {}

    final hasPermission = await LocalNotifications.instance
        .hasNotificationPermission();
    final dailyScheduled = await LocalNotifications.instance
        .isDailyBBTScheduled();
    final medScheduled = await LocalNotifications.instance
        .isMedicationReminderScheduled();
    final subsidyReminderEnabled = await LocalNotifications.instance
        .isSubsidyReminderEnabled();
    final sub = await PurchasesService.instance.getSubscriptionStatus();

    if (mounted) {
      setState(() {
        _notifPermission = hasPermission;
        _dailyBbt = dailyScheduled;
        _medReminder = medScheduled;
        _subsidyReminder = subsidyReminderEnabled;
        _subStatus = sub;
        _loading = false;
      });
    }
  }

  Future<void> _handlePaywallSuccess() async {
    final sub = await PurchasesService.instance.getSubscriptionStatus();
    if (mounted) setState(() => _subStatus = sub);
  }

  Future<void> _handleNotifToggle(bool value) async {
    setState(() => _checkingPermission = true);
    if (value) {
      final granted = await LocalNotifications.instance
          .requestNotificationPermission();
      setState(() => _notifPermission = granted);
      if (granted) {
        await LocalNotifications.instance.registerPushToken();
        if (_dailyBbt) {
          await LocalNotifications.instance.scheduleDailyBBTReminder();
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('기기 설정에서 BOM 앱의 알림을 허용해 주세요.')),
        );
      }
    } else {
      await LocalNotifications.instance.cancelAllScheduled();
      setState(() {
        _notifPermission = false;
        _dailyBbt = false;
        _medReminder = false;
      });
    }
    if (mounted) setState(() => _checkingPermission = false);
  }

  Future<void> _handleDailyBbtToggle(bool value) async {
    if (!_notifPermission) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('먼저 알림을 활성화해 주세요.')));
      return;
    }
    setState(() => _dailyBbt = value);
    if (value) {
      await LocalNotifications.instance.scheduleDailyBBTReminder();
    } else {
      await LocalNotifications.instance.cancelDailyBBTReminder();
    }
  }

  Future<void> _handleMedReminderToggle(bool value) async {
    if (!_notifPermission) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('먼저 알림을 활성화해 주세요.')));
      return;
    }
    if (!canUseClinicScheduler(
      ClinicFeature.medicationReminder,
      ClinicGateContext(isPremium: _subStatus.isActive),
    )) {
      _openPaywall(PaywallSource.medicationReminder);
      return;
    }
    setState(() => _medReminder = value);
    if (value) {
      try {
        final schedules = await ref.read(treatmentApiProvider).getAll();
        await LocalNotifications.instance.rescheduleMedicationAlerts(schedules);
      } catch (_) {}
    } else {
      await LocalNotifications.instance.cancelMedicationReminders();
    }
  }

  Future<void> _handleSubsidyReminderToggle(bool value) async {
    if (!_notifPermission) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('먼저 알림을 활성화해 주세요.')));
      return;
    }
    if (!_subStatus.isActive) {
      _openPaywall(PaywallSource.subsidyCalculator);
      return;
    }
    setState(() => _subsidyReminder = value);
    await LocalNotifications.instance.setSubsidyReminderEnabled(value);
    if (value) {
      try {
        final schedules = await ref.read(treatmentApiProvider).getAll();
        final subsidyProfile = await ref.read(subsidyApiProvider).getProfile();
        await LocalNotifications.instance.rescheduleSubsidyAlerts(
          schedules,
          applications: subsidyProfile.applications,
        );
      } catch (_) {}
    }
  }

  void _openPaywall(PaywallSource source) {
    showPaywallModal(context, source: source, onSuccess: _handlePaywallSuccess);
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('로그아웃'),
        content: const Text('로그아웃 하시겠어요?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('로그아웃', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
    }
  }

  UserProfile? get _profile => ref.watch(profileControllerProvider);
  TreatmentMode get _currentMode => _profile?.treatmentStage ?? 'natural';
  CurrentStage get _currentStage => _profile?.currentStage;

  void _closeSheet() {
    setState(() {
      _sheet = null;
      _pendingMode = null;
    });
    ref.read(profileControllerProvider.notifier).syncProfile();
  }

  void _handleModeSelect(String mode) {
    if (mode == _currentMode) {
      _closeSheet();
      return;
    }
    if (mode == 'pregnant') {
      _closeSheet();
      context.push('/pregnancy-setup');
      return;
    }
    if (mode == 'natural') {
      setState(() {
        _pendingMode = 'natural';
        _sheet = ModeChangeSheetKind.confirmNatural;
      });
    } else {
      setState(() {
        _pendingMode = mode;
        _sheet = ModeChangeSheetKind.stage;
      });
    }
  }

  Future<void> _confirmToNatural() async {
    setState(() => _modeSaving = true);
    final profile = ref.read(profileControllerProvider);
    if (profile != null) {
      ref.read(profileControllerProvider.notifier).setMode('NATURAL');
      ref.read(profileControllerProvider.notifier).setCurrentStage(null);
      await ref
          .read(profileControllerProvider.notifier)
          .saveProfile(
            ref
                .read(profileControllerProvider)!
                .copyWith(
                  treatmentStage: 'natural',
                  currentMode: 'NATURAL',
                  pregnancyLmpDate: null,
                  pregnancyConfirmedAt: null,
                ),
          );
    }
    setState(() => _modeSaving = false);
    _closeSheet();
  }

  Future<void> _handleStageSelect(String? stage) async {
    final targetMode = _pendingMode ?? _currentMode;
    setState(() => _modeSaving = true);
    final profile = ref.read(profileControllerProvider);
    if (profile != null) {
      ref.read(profileControllerProvider.notifier).setMode('CLINIC');
      ref
          .read(profileControllerProvider.notifier)
          .setCurrentStage(stage, startedAt: _todayStr());
      await ref
          .read(profileControllerProvider.notifier)
          .saveProfile(
            ref
                .read(profileControllerProvider)!
                .copyWith(
                  treatmentStage: targetMode,
                  currentMode: 'CLINIC',
                  pregnancyLmpDate: null,
                  pregnancyConfirmedAt: null,
                ),
          );
    }
    setState(() => _modeSaving = false);
    _closeSheet();
  }

  static String _todayStr() {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    final profile = _profile;
    final modeLabel = settingsModeOptions
        .firstWhere(
          (m) => m.value == _currentMode,
          orElse: () => modeOptions.first,
        )
        .label;
    final isPremium = _subStatus.isActive;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(
                        Icons.chevron_left,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const Text(
                      '설정',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(width: 40),
                  ],
                ),
                const SizedBox(height: 10),
                const EventBannerSlider(position: 'settings', height: 95),
                if (profile != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.primaryLight),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: const BoxDecoration(
                            color: AppColors.surfaceAlt,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: const Text(
                            '🌷',
                            style: TextStyle(fontSize: 20),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                profile.name,
                                style: const TextStyle(
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                modeLabel,
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                _sectionTitle(Icons.medical_information_rounded, '나의 치료 정보'),
                _row(
                  label: '현재 모드',
                  desc: modeLabel,
                  cta: '변경 ›',
                  onTap: () =>
                      setState(() => _sheet = ModeChangeSheetKind.mode),
                ),
                if (_currentMode == 'pregnant')
                  _row(
                    label: '주수 기준일',
                    desc: _profile?.pregnancyLmpDate != null
                        ? '${_profile!.pregnancyLmpDate} · ${gestationalAge(DateTime.parse(_profile!.pregnancyLmpDate!)).label}'
                        : '미설정 — 탭해서 설정',
                    cta: '변경 ›',
                    onTap: () => context.push('/pregnancy-setup'),
                  ),
                if (_currentMode == 'pregnant')
                  _row(
                    label: '시술 기록 요약',
                    desc: '회차별 일정·수치를 정리해 병원에 공유',
                    cta: '열기 ›',
                    onTap: () => context.push('/treatment-summary'),
                  ),
                if (isTreatmentMode(_currentMode))
                  _row(
                    label: '현재 단계',
                    desc: _currentStage != null
                        ? getStageLabelKo(_currentMode, _currentStage)
                        : '아직 미설정 — 탭해서 설정',
                    cta: '변경 ›',
                    onTap: () =>
                        setState(() => _sheet = ModeChangeSheetKind.stage),
                  ),
                const SizedBox(height: 20),
                _sectionTitle(Icons.favorite_rounded, '부부 공유'),
                _row(
                  label: '배우자 연결 관리',
                  desc: '배우자 초대 및 연결 상태 설정',
                  cta: '이동 ›',
                  onTap: () => context.push('/couple'),
                ),
                const SizedBox(height: 20),
                _sectionTitle(Icons.notifications_rounded, '알림 설정'),
                _switchRow(
                  label: '앱 알림 활성화',
                  desc: '시술 일정·약물·기록 독려 알림',
                  value: _notifPermission,
                  onChanged: _checkingPermission ? null : _handleNotifToggle,
                  loading: _checkingPermission,
                ),
                _switchRow(
                  label: '매일 아침 기초체온 알림',
                  desc: '매일 오전 7시 BBT 기록 독려',
                  value: _dailyBbt,
                  onChanged: _notifPermission ? _handleDailyBbtToggle : null,
                  disabled: !_notifPermission,
                ),
                if (isPremium)
                  _switchRow(
                    label: '약물 복용 알림',
                    desc: '등록된 약물 정시 투약 알림',
                    value: _medReminder,
                    onChanged: _notifPermission
                        ? _handleMedReminderToggle
                        : null,
                    disabled: !_notifPermission,
                  )
                else
                  _row(
                    label: '약물 복용 알림',
                    labelColor: AppColors.primary,
                    desc: '프리미엄으로 정시 투약 알림 활성화',
                    cta: '켜기 ›',
                    background: AppColors.surface,
                    onTap: () => _openPaywall(PaywallSource.medicationReminder),
                  ),
                if (isPremium)
                  _switchRow(
                    label: '지원금 마감 알림',
                    desc: '지원결정통지서 발급·청구 서류 준비 알림',
                    value: _subsidyReminder,
                    onChanged: _notifPermission
                        ? _handleSubsidyReminderToggle
                        : null,
                    disabled: !_notifPermission,
                  )
                else
                  _row(
                    label: '지원금 마감 알림',
                    labelColor: AppColors.primary,
                    desc: '프리미엄으로 지원금 마감 알림 활성화',
                    cta: '켜기 ›',
                    background: AppColors.surface,
                    onTap: () => _openPaywall(PaywallSource.subsidyCalculator),
                  ),
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(top: 4),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Text(
                    '시술 D-1 알림은 시술 일정을 등록하면 자동으로 스케줄링돼요.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                      height: 1.5,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                _sectionTitle(Icons.workspace_premium_rounded, '구독'),
                if (_subStatus.isActive)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.accentGreenLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.accentGreen.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '✅ 프리미엄 구독 중',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.accentGreen,
                          ),
                        ),
                        if (_subStatus.expiresAt != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              '${_formatExpiry(_subStatus.expiresAt!)} 자동 갱신',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.accentGreen.withValues(alpha: 0.85),
                              ),
                            ),
                          ),
                      ],
                    ),
                  )
                else
                  GestureDetector(
                    onTap: () => context.push('/subscription'),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Row(
                            children: [
                              Icon(
                                Icons.workspace_premium_rounded,
                                size: 16,
                                color: Colors.white,
                              ),
                              SizedBox(width: 6),
                              Text(
                                '프리미엄 구독하기',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            '›',
                            style: TextStyle(
                              fontSize: 18,
                              color: Color(0xB3FFFFFF),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 20),
                _sectionTitle(Icons.person_rounded, '계정'),
                GestureDetector(
                  onTap: _handleLogout,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                    ),
                    child: const Text(
                      '로그아웃',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.error,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                _sectionTitle(Icons.description_rounded, '약관 및 정책'),
                _row(
                  label: '이용약관',
                  cta: '›',
                  onTap: () => launchUrl(
                    Uri.parse(
                      'https://cuboid-string-459.notion.site/BOM-3ab4e4079c788019b0e9e946d351ca7f',
                    ),
                  ),
                ),
                _row(
                  label: '개인정보처리방침',
                  cta: '›',
                  onTap: () => launchUrl(
                    Uri.parse(
                      'https://cuboid-string-459.notion.site/Lunera-3864e4079c7880699f4cf6ac9f9c7952',
                    ),
                  ),
                ),
              ],
            ),
            if (_sheet != null) _buildSheet(),
          ],
        ),
      ),
    );
  }

  String _formatExpiry(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return '${dt.year}.${dt.month}.${dt.day}';
  }

  Widget _sectionTitle(IconData icon, String text) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(
      children: [
        Icon(icon, size: 15, color: AppColors.primary),
        const SizedBox(width: 6),
        Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
      ],
    ),
  );

  Widget _row({
    required String label,
    Color? labelColor,
    String? desc,
    required String cta,
    Color background = Colors.white,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.primaryLight),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: labelColor ?? AppColors.textDark,
                      ),
                    ),
                    if (desc != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          desc,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Text(
                cta,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _switchRow({
    required String label,
    required String desc,
    required bool value,
    required void Function(bool)? onChanged,
    bool disabled = false,
    bool loading = false,
  }) {
    return Opacity(
      opacity: disabled ? 0.4 : 1,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primaryLight),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textDark,
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      desc,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  )
                : Switch(
                    value: value,
                    onChanged: onChanged,
                    activeThumbColor: AppColors.primary,
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildSheet() {
    Widget content;
    String title;
    String? subtitle;

    switch (_sheet!) {
      case ModeChangeSheetKind.mode:
        title = '치료 모드 변경';
        subtitle = '현재 상황에 맞는 모드를 선택해주세요';
        content = Column(
          children: settingsModeOptions
              .map(
                (opt) => _optionButton(
                  emoji: opt.emoji,
                  label: opt.label,
                  sub: opt.sub,
                  iconBg: opt.color.withValues(alpha: 0.1),
                  selected: _currentMode == opt.value,
                  onTap: _modeSaving
                      ? null
                      : () => _handleModeSelect(opt.value),
                ),
              )
              .toList(),
        );
        break;
      case ModeChangeSheetKind.stage:
        final mode = _pendingMode ?? _currentMode;
        title = '${mode == 'iui' ? '인공수정(IUI)' : '시험관(IVF)'} 단계 선택';
        subtitle = '현재 진행 중인 단계를 선택해주세요';
        final options = mode == 'iui' ? iuiStageOptions : ivfStageOptions;
        content = Column(
          children: options
              .map(
                (opt) => _optionButton(
                  emoji: opt.emoji,
                  label: opt.label,
                  iconBg: AppColors.surface,
                  dashed: opt.value == null,
                  selected: _currentStage == opt.value && _pendingMode == null,
                  onTap: _modeSaving
                      ? null
                      : () => _handleStageSelect(opt.value),
                ),
              )
              .toList(),
        );
        break;
      case ModeChangeSheetKind.confirmNatural:
        title = '자연임신 모드로 변경';
        subtitle = null;
        content = Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primaryLight),
              ),
              child: const Text(
                '시술 관련 기록은 모두 유지됩니다.\n모드만 자연임신 준비로 변경할게요.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textDark,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _modeSaving ? null : _confirmToNatural,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentGreen,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                ),
                child: _modeSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('자연임신 모드로 변경'),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _closeSheet,
              child: const Text(
                '취소',
                style: TextStyle(color: AppColors.textMuted),
              ),
            ),
          ],
        );
        break;
    }

    return Positioned.fill(
      child: GestureDetector(
        onTap: _closeSheet,
        child: Container(
          color: Colors.black.withValues(alpha: 0.4),
          child: GestureDetector(
            onTap: () {},
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.85,
                ),
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(2),
                        ),
                        margin: const EdgeInsets.only(bottom: 16),
                      ),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textDark,
                        ),
                      ),
                      if (subtitle != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4, bottom: 16),
                          child: Text(
                            subtitle,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                      if (subtitle == null) const SizedBox(height: 16),
                      content,
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _optionButton({
    required String emoji,
    required String label,
    String? sub,
    required Color iconBg,
    bool dashed = false,
    bool selected = false,
    VoidCallback? onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? AppColors.surface : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected
                  ? AppColors.primary
                  : AppColors.primaryLight,
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(emoji, style: const TextStyle(fontSize: 22)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: selected
                            ? AppColors.primaryDark
                            : (dashed
                                  ? AppColors.textMuted
                                  : AppColors.textDark),
                      ),
                    ),
                    if (sub != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          sub,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (selected)
                Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
