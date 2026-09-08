import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api/misc_api.dart';
import '../core/theme/app_theme.dart';
import '../state/providers.dart';

/// 관리자 사이트 `banners` 컬렉션 연동 이벤트 배너 슬라이더.
///
/// 백엔드(`GET /api/banners`)를 경유해 배너를 조회하고, 화면이 떠 있는 동안
/// 주기적으로 갱신해 관리자 변경(숨김 포함)을 앱 배포 없이 반영한다.
/// 활성 배너가 없으면 아무 공간도 차지하지 않는다.
class EventBannerSlider extends ConsumerStatefulWidget {
  const EventBannerSlider({
    super.key,
    this.position = 'home',
    this.height = 110.0,
  });

  /// 'home' 또는 'settings'
  final String position;
  final double height;

  @override
  ConsumerState<EventBannerSlider> createState() => _EventBannerSliderState();
}

class _EventBannerSliderState extends ConsumerState<EventBannerSlider> {
  static const _refreshInterval = Duration(seconds: 60);

  late final PageController _pageController;
  Timer? _autoSlideTimer;
  Timer? _refreshTimer;
  List<EventBanner> _banners = [];
  int _currentPage = 0;

  /// 노출 집계 — 위젯 생명주기 동안 배너당 1회, 비식별.
  final Set<String> _impressedIds = {};

  void _recordImpression(int index) {
    if (index < 0 || index >= _banners.length) return;
    final b = _banners[index];
    if (!b.isAd || !_impressedIds.add(b.id)) return;
    ref
        .read(adsApiProvider)
        .sendEvent(type: 'impression', target: 'banner', targetId: b.id);
  }

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _load();
    _refreshTimer = Timer.periodic(_refreshInterval, (_) => _load());
  }

  @override
  void dispose() {
    _autoSlideTimer?.cancel();
    _refreshTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final banners = await ref
          .read(bannersApiProvider)
          .getBanners(widget.position);
      if (!mounted) return;
      setState(() {
        _banners = banners;
        if (_currentPage >= banners.length) _currentPage = 0;
      });
      _recordImpression(_currentPage);
      _restartAutoSlide();
    } catch (_) {
      // 네트워크 오류 시 기존 상태 유지 (배너는 비필수 콘텐츠)
    }
  }

  void _restartAutoSlide() {
    _autoSlideTimer?.cancel();
    if (_banners.length <= 1) return;
    _autoSlideTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_pageController.hasClients) return;
      _currentPage = (_currentPage + 1) % _banners.length;
      _recordImpression(_currentPage);
      _pageController.animateToPage(
        _currentPage,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    });
  }

  Color _parseColor(String colorStr) {
    if (colorStr.startsWith('#')) {
      try {
        return Color(int.parse(colorStr.replaceFirst('#', 'FF'), radix: 16));
      } catch (_) {}
    }
    return AppColors.primary;
  }

  Future<void> _handleTap(EventBanner banner) async {
    if (banner.isAd) {
      ref
          .read(adsApiProvider)
          .sendEvent(type: 'click', target: 'banner', targetId: banner.id);
    }
    final linkUrl = banner.linkUrl;
    if (linkUrl.isEmpty) return;
    final uri = Uri.tryParse(linkUrl);
    if (uri == null) return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_banners.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      height: widget.height,
      child: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() => _currentPage = index);
              _recordImpression(index);
            },
            itemCount: _banners.length,
            itemBuilder: (context, index) {
              final banner = _banners[index];
              final bgColor = _parseColor(banner.bgColor);
              return GestureDetector(
                onTap: () => _handleTap(banner),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: bgColor.withValues(alpha: 0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (banner.isAd)
                        Container(
                          margin: const EdgeInsets.only(bottom: 4),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 1,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.25),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '광고',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      Text(
                        banner.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (banner.subTitle.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          banner.subTitle,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
          if (_banners.length > 1)
            Positioned(
              bottom: 10,
              right: 14,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(_banners.length, (i) {
                  final isActive = i == _currentPage;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 2.5),
                    width: isActive ? 16 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: isActive
                          ? Colors.white
                          : Colors.white.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  );
                }),
              ),
            ),
        ],
      ),
    );
  }
}
