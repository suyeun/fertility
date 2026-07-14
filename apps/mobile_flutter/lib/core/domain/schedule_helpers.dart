import '../models/enums.dart';

/// Port of packages/shared/lib/scheduleHelpers.ts.
class ScheduleChip {
  const ScheduleChip({
    required this.value,
    required this.label,
    required this.backendType,
    required this.emoji,
  });

  final String value;
  final String label;
  final TreatmentType backendType; // IVF | IUI | FET | monitoring | other
  final String emoji;
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
          emoji: '🌸',
        ),
        ScheduleChip(
          value: 'ovulation',
          label: '배란 확인',
          backendType: 'other',
          emoji: '🥚',
        ),
        ScheduleChip(
          value: 'intercourse',
          label: '관계일',
          backendType: 'other',
          emoji: '❤️',
        ),
        ScheduleChip(
          value: 'hospital',
          label: '병원 방문',
          backendType: 'other',
          emoji: '🏥',
        ),
        ScheduleChip(
          value: 'other',
          label: '기타',
          backendType: 'other',
          emoji: '📅',
        ),
      ],
      defaultValue: null,
    );
  }
  if (mode == 'iui') {
    return const ScheduleChipsResult(
      chips: [
        ScheduleChip(
          value: 'iui',
          label: '인공수정',
          backendType: 'IUI',
          emoji: '💫',
        ),
        ScheduleChip(
          value: 'monitoring',
          label: '초음파',
          backendType: 'monitoring',
          emoji: '🔊',
        ),
        ScheduleChip(
          value: 'bloodtest',
          label: '채혈',
          backendType: 'monitoring',
          emoji: '🧪',
        ),
        ScheduleChip(
          value: 'injection',
          label: '주사',
          backendType: 'other',
          emoji: '💉',
        ),
        ScheduleChip(
          value: 'other',
          label: '기타',
          backendType: 'other',
          emoji: '📅',
        ),
      ],
      defaultValue: 'iui',
    );
  }
  return const ScheduleChipsResult(
    chips: [
      ScheduleChip(value: 'ivf', label: '시험관', backendType: 'IVF', emoji: '🔬'),
      ScheduleChip(
        value: 'monitoring',
        label: '초음파',
        backendType: 'monitoring',
        emoji: '🔊',
      ),
      ScheduleChip(
        value: 'bloodtest',
        label: '채혈',
        backendType: 'monitoring',
        emoji: '🧪',
      ),
      ScheduleChip(
        value: 'transfer',
        label: '이식',
        backendType: 'FET',
        emoji: '🌱',
      ),
      ScheduleChip(
        value: 'retrieval',
        label: '채취',
        backendType: 'IVF',
        emoji: '🥚',
      ),
      ScheduleChip(
        value: 'injection',
        label: '주사',
        backendType: 'other',
        emoji: '💉',
      ),
      ScheduleChip(
        value: 'other',
        label: '기타',
        backendType: 'other',
        emoji: '📅',
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
  if (mode == 'natural') return null;

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
    required this.emoji,
    required this.color,
    required this.label,
  });
  final String emoji;
  final String color; // hex string, e.g. '#ff8fab'
  final String label;
}

MarkerStyle getScheduleMarkerStyle(String scheduleType, [String? title]) {
  switch (scheduleType) {
    case 'injection':
      return const MarkerStyle(emoji: '●', color: '#60a5fa', label: '주사');
    case 'bloodtest':
      return const MarkerStyle(emoji: '●', color: '#a855f7', label: '채혈');
    case 'monitoring':
      return const MarkerStyle(emoji: '●', color: '#a855f7', label: '초음파');
    case 'iui':
      return const MarkerStyle(emoji: '★', color: '#ff8fab', label: '인공수정');
    case 'transfer':
      return const MarkerStyle(emoji: '♥', color: '#2dd4bf', label: '이식');
    case 'retrieval':
      return const MarkerStyle(emoji: '◎', color: '#f97316', label: '채취');
    case 'IUI':
      return const MarkerStyle(emoji: '★', color: '#ff8fab', label: '인공수정');
    case 'IVF':
      return const MarkerStyle(emoji: '★', color: '#ff8fab', label: '시험관');
    case 'FET':
      return const MarkerStyle(emoji: '♥', color: '#2dd4bf', label: '이식');
    default:
      return const MarkerStyle(emoji: '●', color: '#94a3b8', label: '일정');
  }
}
