import 'package:flutter/material.dart';

import '../../core/domain/calendar_data.dart';

class DayMarker {
  const DayMarker({required this.color, this.icon});
  final Color color;
  final IconData? icon;
}

/// Port of apps/mobile/components/calendar/DayCell.tsx.
class DayCell extends StatelessWidget {
  const DayCell({
    super.key,
    required this.day,
    required this.isSelected,
    this.hasIntercourse = false,
    this.markers,
    required this.onTap,
    required this.cellWidth,
  });

  final CalendarDay day;
  final bool isSelected;
  final bool hasIntercourse;
  final List<DayMarker>? markers;
  final void Function(DateTime date) onTap;
  final double cellWidth;

  @override
  Widget build(BuildContext context) {
    final cycleInfo = day.cycleInfo;
    final isOvulation = cycleInfo?.isOvulation ?? false;
    final isMenstruation = cycleInfo?.isMenstruation ?? false;
    final isFertile = (cycleInfo?.isFertileWindow ?? false) && !isOvulation;

    Color? bgColor;
    Color borderColor = Colors.transparent;
    double borderWidth = 0;
    bool dashed = false;

    if (isOvulation) {
      bgColor = const Color(0xFFFFE4EC);
      borderColor = const Color(0xFFFFB3C6);
      borderWidth = 1;
    } else if (isMenstruation) {
      bgColor = const Color(0xFFFEE2E2);
      borderColor = const Color(0xFFFCA5A5);
      borderWidth = 1;
    } else if (isFertile) {
      bgColor = const Color(0xFFEDE9FE);
      borderColor = const Color(0xFFC4B5FD);
      borderWidth = 1;
      dashed = true;
    }

    if (isSelected) {
      borderColor = const Color(0xFFFF4D7D);
      borderWidth = 2;
    } else if (day.isToday) {
      borderColor = const Color(0xFFFF8FAB);
      borderWidth = 2;
    }

    Color numColor = const Color(0xFF5A3042);
    FontWeight numWeight = FontWeight.w600;
    if (isOvulation) {
      numColor = const Color(0xFFBE185D);
      numWeight = FontWeight.w700;
    } else if (isMenstruation) {
      numColor = const Color(0xFFB91C1C);
      numWeight = FontWeight.w700;
    } else if (isFertile) {
      numColor = const Color(0xFF6D28D9);
      numWeight = FontWeight.w700;
    } else if (day.isToday) {
      numColor = const Color(0xFFFF4D7D);
      numWeight = FontWeight.w700;
    }

    String? badge;
    bool ovulationBadge = false;
    Color badgeColor = Colors.transparent;
    Color badgeFg = numColor;
    double badgeFontSize = 9;
    if (isOvulation) {
      ovulationBadge = true;
      badgeFontSize = 11;
    } else if (isMenstruation) {
      badge = '생리';
      badgeColor = const Color(0xFFFECACA);
      badgeFg = const Color(0xFFB91C1C);
    } else if (isFertile) {
      badge = '가임';
      badgeColor = const Color(0xFFDDD6FE);
      badgeFg = const Color(0xFF5B21B6);
    }

    final visibleMarkers = (markers != null && markers!.length > 3)
        ? markers!.take(3).toList()
        : markers;

    return GestureDetector(
      onTap: () => onTap(day.date),
      child: Opacity(
        opacity: day.isCurrentMonth ? 1.0 : 0.28,
        child: Container(
          width: cellWidth,
          height: 56,
          margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
          padding: const EdgeInsets.only(top: 6, bottom: 4),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(12),
            border: borderWidth > 0
                ? Border.all(
                    color: borderColor,
                    width: borderWidth,
                    style: dashed ? BorderStyle.solid : BorderStyle.solid,
                  )
                : null,
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${day.dayNum}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: numWeight,
                      color: numColor,
                      height: 1.2,
                    ),
                  ),
                  if (hasIntercourse)
                    const Padding(
                      padding: EdgeInsets.only(left: 2),
                      child: Icon(
                        Icons.favorite_rounded,
                        size: 7,
                        color: Color(0xFFFB7185),
                      ),
                    ),
                ],
              ),
              if (ovulationBadge)
                Container(
                  margin: const EdgeInsets.only(top: 3),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: badgeColor,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Icon(
                    Icons.local_florist_rounded,
                    size: badgeFontSize,
                    color: badgeFg,
                  ),
                )
              else if (badge != null)
                Container(
                  margin: const EdgeInsets.only(top: 3),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: badgeColor,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    badge,
                    style: TextStyle(
                      fontSize: badgeFontSize,
                      fontWeight: FontWeight.w700,
                      color: badgeFg,
                      height: 1.1,
                    ),
                  ),
                )
              else if (day.isToday &&
                  (visibleMarkers == null || visibleMarkers.isEmpty))
                Container(
                  margin: const EdgeInsets.only(top: 3),
                  width: 4,
                  height: 4,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFF4D7D),
                    shape: BoxShape.circle,
                  ),
                ),
              if (visibleMarkers != null && visibleMarkers.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 3),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ...visibleMarkers.map(
                        (m) => Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 1),
                          child: m.icon != null
                              ? Icon(m.icon!, size: 7, color: m.color)
                              : Container(
                                  width: 5,
                                  height: 5,
                                  decoration: BoxDecoration(
                                    color: m.color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                        ),
                      ),
                      if (markers!.length > 3)
                        Text(
                          '${markers!.length - 3}+',
                          style: const TextStyle(
                            fontSize: 5,
                            color: Color(0xFF9CA3AF),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
