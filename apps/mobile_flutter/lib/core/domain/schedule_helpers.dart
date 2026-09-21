import 'package:flutter/material.dart';

import '../models/enums.dart';

/// Port of packages/shared/lib/scheduleHelpers.ts.
class ScheduleChip {
  const ScheduleChip({
    required this.value,
    required this.label,
    required this.backendType,
    required this.icon,
  });

  final String value;
  final String label;
  final TreatmentType backendType; // IVF | IUI | FET | monitoring | other
  final IconData icon;
}

class ScheduleChipsResult {
  const ScheduleChipsResult({required this.chips, required this.defaultValue});
  final List<ScheduleChip> chips;
  final String? defaultValue;
}

ScheduleChipsResult getScheduleChips(TreatmentMode mode) {
  if (mode == 'natural') {
    return const ScheduleChipsResult(
      chips: [
        ScheduleChip(
          value: 'period',
          label: '생리 시작',
          backendType: 'other',
          icon: Icons.water_drop_rounded,
        ),
        ScheduleChip(
          value: 'ovulation',
          label: '배란 확인',
          backendType: 'other',
          icon: Icons.egg_rounded,
        ),
        ScheduleChip(
          value: 'intercourse',
          label: '관계일',
          backendType: 'other',
          icon: Icons.favorite_rounded,
        ),
        ScheduleChip(
          value: 'hospital',
          label: '병원 방문',
          backendType: 'other',
          icon: Icons.local_hospital_rounded,
        ),
        ScheduleChip(
          value: 'other',
          label: '기타',
          backendType: 'other',
          icon: Icons.event_rounded,
        ),
      ],
      defaultValue: null,
    );
  }
  if (mode == 'pregnant') {
    return const ScheduleChipsResult(
      chips: [
        ScheduleChip(
          value: 'prenatal',
          label: '산전 진찰',
          backendType: 'other',
          icon: Icons.local_hospital_rounded,
        ),
        ScheduleChip(
          value: 'monitoring',
          label: '초음파',
          backendType: 'monitoring',
          icon: Icons.monitor_heart_rounded,
        ),
        ScheduleChip(
          value: 'bloodtest',
          label: '검사',
          backendType: 'monitoring',
          icon: Icons.science_rounded,
        ),
        ScheduleChip(
          value: 'other',
          label: '기타',
          backendType: 'other',
          icon: Icons.event_rounded,
        ),
      ],
      defaultValue: 'prenatal',
    );
  }
  if (mode == 'iui') {
    return const ScheduleChipsResult(
      chips: [
        ScheduleChip(
          value: 'iui',
          label: '인공수정',
          backendType: 'IUI',
          icon: Icons.medical_services_rounded,
        ),
        ScheduleChip(
          value: 'monitoring',
          label: '초음파',
          backendType: 'monitoring',
          icon: Icons.monitor_heart_rounded,
        ),
        ScheduleChip(
          value: 'bloodtest',
          label: '채혈',
          backendType: 'monitoring',
          icon: Icons.science_rounded,
        ),
        ScheduleChip(
          value: 'injection',
          label: '주사',
          backendType: 'other',
          icon: Icons.vaccines_rounded,
        ),
        ScheduleChip(
          value: 'other',
          label: '기타',
          backendType: 'other',
          icon: Icons.event_rounded,
        ),
      ],
      defaultValue: 'iui',
    );
  }
  return const ScheduleChipsResult(
    chips: [
      ScheduleChip(value: 'ivf', label: '시험관', backendType: 'IVF', icon: Icons.biotech_rounded),
      ScheduleChip(
        value: 'monitoring',
        label: '초음파',
        backendType: 'monitoring',
        icon: Icons.monitor_heart_rounded,
      ),
      ScheduleChip(
        value: 'bloodtest',
        label: '채혈',
        backendType: 'monitoring',
        icon: Icons.science_rounded,
      ),
      ScheduleChip(
        value: 'transfer',
        label: '이식',
        backendType: 'FET',
        icon: Icons.eco_rounded,
      ),
      ScheduleChip(
        value: 'retrieval',
        label: '채취',
        backendType: 'IVF',
        icon: Icons.egg_rounded,
      ),
      ScheduleChip(
        value: 'injection',
        label: '주사',
        backendType: 'other',
        icon: Icons.vaccines_rounded,
      ),
      ScheduleChip(
        value: 'other',
        label: '기타',
        backendType: 'other',
        icon: Icons.event_rounded,
      ),
    ],
    defaultValue: 'ivf',
  );
}

class StageSuggestion {
  const StageSuggestion({
    required this.nextStage,
    required this.label,
    required this.message,
  });
  final CurrentStage nextStage;
  final String label;
  final String message;
}

StageSuggestion? getNextStageSuggestion(
  String scheduleValue,
  CurrentStage currentStage,
  TreatmentMode mode,
) {
  if (mode == 'natural' || mode == 'pregnant') return null;

  switch (scheduleValue) {
    case 'transfer':
      return const StageSuggestion(
        nextStage: 'luteal',
        label: '황체기',
        message: '이식이 완료됐어요. 황체기 단계로 이동할까요?',
      );
    case 'retrieval':
      return const StageSuggestion(
        nextStage: 'culture',
        label: '배양',
        message: '채취가 완료됐어요. 배양 단계로 이동할까요?',
      );
    case 'iui':
      return const StageSuggestion(
        nextStage: 'luteal',
        label: '황체기',
        message: '인공수정이 완료됐어요. 황체기 단계로 이동할까요?',
      );
    default:
      return null;
  }
}

class MarkerStyle {
  const MarkerStyle({
    required this.icon,
    required this.color,
    required this.label,
  });
  final IconData icon;
  final String color; // hex string, e.g. '#ff8fab'
  final String label;
}

MarkerStyle getScheduleMarkerStyle(String scheduleType, [String? title]) {
  switch (scheduleType) {
    case 'injection':
      return const MarkerStyle(
        icon: Icons.circle_rounded,
        color: '#4c759f',
        label: '주사',
      );
    case 'bloodtest':
      return const MarkerStyle(
        icon: Icons.circle_rounded,
        color: '#8675d4',
        label: '채혈',
      );
    case 'monitoring':
      return const MarkerStyle(
        icon: Icons.circle_rounded,
        color: '#8675d4',
        label: '초음파',
      );
    case 'iui':
      return const MarkerStyle(
        icon: Icons.star_rounded,
        color: '#e19796',
        label: '인공수정',
      );
    case 'transfer':
      return const MarkerStyle(
        icon: Icons.favorite_rounded,
        color: '#2dd4bf',
        label: '이식',
      );
    case 'retrieval':
      return const MarkerStyle(
        icon: Icons.adjust_rounded,
        color: '#f97316',
        label: '채취',
      );
    case 'IUI':
      return const MarkerStyle(
        icon: Icons.star_rounded,
        color: '#e19796',
        label: '인공수정',
      );
    case 'IVF':
      return const MarkerStyle(
        icon: Icons.star_rounded,
        color: '#e19796',
        label: '시험관',
      );
    case 'FET':
      return const MarkerStyle(
        icon: Icons.favorite_rounded,
        color: '#2dd4bf',
        label: '이식',
      );
    default:
      return const MarkerStyle(
        icon: Icons.circle_rounded,
        color: '#94a3b8',
        label: '일정',
      );
  }
}
