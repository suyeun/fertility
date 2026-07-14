import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Bottom tab bar: 홈/캘린더/이야기방/정보 — mirrors
/// apps/mobile/app/(tabs)/_layout.tsx. Chat has no tab (hidden via
/// `href: null` on the RN side) and is only reachable via the home
/// screen's floating AI-상담 button, pushed as a standalone route.
class TabShell extends StatelessWidget {
  const TabShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: navigationShell.currentIndex,
        onTap: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == navigationShell.currentIndex,
        ),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: '홈'),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today_outlined),
            label: '캘린더',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outline),
            label: '이야기방',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.medical_services_outlined),
            label: '정보',
          ),
        ],
      ),
    );
  }
}
