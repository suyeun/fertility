import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import 'core/push/fcm_service.dart';
import 'core/purchases/purchases_service.dart';
import 'core/router/go_router_refresh_stream.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/calendar/calendar_screen.dart';
import 'features/chat/chat_screen.dart';
import 'features/community/community_screen.dart';
import 'features/couple/couple_screen.dart';
import 'features/home/home_screen.dart';
import 'features/hospital/hospital_screen.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/records/records_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/shell/tab_shell.dart';
import 'features/splash/splash_screen.dart';
import 'features/subscription/subscription_screen.dart';
import 'features/subsidy/subsidy_calculator_screen.dart';
import 'state/auth_controller.dart';
import 'state/providers.dart';
import 'widgets/update_modal.dart';

/// Kept in sync with pubspec.yaml's version at release time — mirrors the RN
/// app's hardcoded APP_VERSION constant in lib/useVersionCheck.ts.
const String kAppVersion = '1.0.0';

final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(authControllerProvider.notifier);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: GoRouterRefreshStream(authNotifier.stream),
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      final loc = state.matchedLocation;

      if (authState.status == AuthStatus.unknown) {
        return loc == '/splash' ? null : '/splash';
      }
      if (authState.status == AuthStatus.unauthenticated) {
        return loc == '/login' ? null : '/login';
      }
      if (authState.status == AuthStatus.needsOnboarding) {
        return loc == '/onboarding' ? null : '/onboarding';
      }
      // authenticated
      if (loc == '/splash' || loc == '/login' || loc == '/onboarding') {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/records',
        builder: (context, state) => const RecordsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/subscription',
        builder: (context, state) => const SubscriptionScreen(),
      ),
      GoRoute(
        path: '/couple',
        builder: (context, state) => const CoupleScreen(),
      ),
      GoRoute(path: '/chat', builder: (context, state) => const ChatScreen()),
      GoRoute(
        path: '/subsidy-calculator',
        builder: (context, state) => SubsidyCalculatorScreen(
          initialProcedureKey: state.uri.queryParameters['procedure'],
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            TabShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/calendar',
                builder: (context, state) => const CalendarScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/community',
                builder: (context, state) => const CommunityScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/info',
                builder: (context, state) => const HospitalScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

class BomApp extends ConsumerStatefulWidget {
  const BomApp({super.key});

  @override
  ConsumerState<BomApp> createState() => _BomAppState();
}

class _BomAppState extends ConsumerState<BomApp> {
  String _versionStatus = 'idle';
  String _versionMessage = '';
  String? _storeUrl;
  bool _showOptional = true;

  @override
  void initState() {
    super.initState();
    FcmService.instance.configure(ref.read(notificationsApiProvider));
    PurchasesService.instance.initPurchases();
    _checkVersion();
  }

  Future<void> _checkVersion() async {
    try {
      final platform = Theme.of(context).platform == TargetPlatform.iOS
          ? 'ios'
          : 'android';
      final res = await ref
          .read(versionApiProvider)
          .check(kAppVersion, platform);
      if (mounted) {
        setState(() {
          _versionStatus = res.status;
          _versionMessage = res.message;
          _storeUrl = platform == 'ios' ? res.storeUrlIos : res.storeUrlAndroid;
        });
      }
    } catch (_) {
      // Version check failure is silent — never blocks app usage.
    }
  }

  Future<void> _openStore() async {
    final url = _storeUrl;
    if (url == null) return;
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'BOM',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
      builder: (context, child) {
        return Stack(
          children: [
            if (child != null) child,
            UpdateModalOverlay(
              status: _showOptional ? _versionStatus : 'ok',
              message: _versionMessage,
              onUpdate: _openStore,
              onLater: _versionStatus == 'optional'
                  ? () => setState(() => _showOptional = false)
                  : null,
            ),
          ],
        );
      },
    );
  }
}
