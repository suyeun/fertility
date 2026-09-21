import 'package:flutter/material.dart';

/// Port of packages/shared/hooks/useOnboarding.ts — pure step/data model.
class ModeOption {
  const ModeOption({
    required this.value,
    required this.emoji,
    required this.label,
    required this.sub,
    required this.color,
  });
  final String value; // natural | iui | ivf
  final String emoji;
  final String label;
  final String sub;
  final Color color;
}

const modeOptions = [
  ModeOption(
    value: 'natural',
    emoji: '🌱',
    label: '자연임신 준비 중이에요',
    sub: '배란일 추적, 기초체온 기록으로 가임기를 잡아드려요',
    color: Color(0xFF22C55E),
  ),
  ModeOption(
    value: 'iui',
    emoji: '💉',
    label: '인공수정(IUI) 치료 중이에요',
    sub: '시술 일정, 배란 모니터링, 수치 관리를 도와드려요',
    color: Color(0xFF3B82F6),
  ),
  ModeOption(
    value: 'ivf',
    emoji: '🔬',
    label: '시험관(IVF) 치료 중이에요',
    sub: '난포 모니터링, 채취·이식 일정 관리를 도와드려요',
    color: Color(0xFF8B5CF6),
  ),
];

/// 설정 화면 전용 — 온보딩에는 노출하지 않는 "임신 확인" 옵션을 덧붙인 목록.
const pregnantModeOption = ModeOption(
  value: 'pregnant',
  emoji: '🤍',
  label: '임신을 확인했어요',
  sub: '임신 주수·산전 검사 일정·출산 지원 안내로 전환해요',
  color: Color(0xFFE19796),
);
const settingsModeOptions = [...modeOptions, pregnantModeOption];

class StageOption {
  const StageOption({
    required this.value,
    required this.emoji,
    required this.label,
  });
  final String? value;
  final String emoji;
  final String label;
}

const iuiStageOptions = [
  StageOption(value: 'stimulation', emoji: '💊', label: '과배란 유도 중'),
  StageOption(value: 'monitoring', emoji: '🔍', label: '배란 모니터링 중'),
  StageOption(value: 'procedure', emoji: '🏥', label: '시술 예정 / 당일'),
  StageOption(value: 'luteal', emoji: '🌙', label: '황체기 중'),
  StageOption(value: 'result', emoji: '🧪', label: '판정 대기 중'),
  StageOption(value: null, emoji: '❓', label: '아직 시작 전 / 잘 모르겠어요'),
];

const ivfStageOptions = [
  StageOption(value: 'stimulation', emoji: '💊', label: '과배란 유도 중'),
  StageOption(value: 'monitoring', emoji: '🔍', label: '난포 모니터링 중'),
  StageOption(value: 'retrieval', emoji: '🥚', label: '난자 채취 예정'),
  StageOption(value: 'culture', emoji: '🧫', label: '수정 · 배양 중'),
  StageOption(value: 'transfer', emoji: '🌸', label: '이식 예정 / 당일'),
  StageOption(value: 'luteal', emoji: '🌙', label: '황체기 중'),
  StageOption(value: 'result', emoji: '🧪', label: '판정 대기 중 (β-hCG)'),
  StageOption(value: null, emoji: '❓', label: '아직 시작 전 / 잘 모르겠어요'),
];

const cycleGuide = {
  'natural': '자연 생리 주기를 입력해 주세요',
  'iui': 'IUI 시술 전 마지막 자연 주기를 참고해서 입력해 주세요',
  'ivf': '시술 전 마지막 자연 주기를 참고해서 입력해 주세요',
};

class OnboardingData {
  OnboardingData({
    this.treatmentMode,
    this.currentStage,
    this.cycleLength = 28,
  });
  final String? treatmentMode;
  final String? currentStage;
  final int cycleLength;

  OnboardingData copyWith({
    String? treatmentMode,
    String? currentStage,
    int? cycleLength,
    bool clearStage = false,
  }) {
    return OnboardingData(
      treatmentMode: treatmentMode ?? this.treatmentMode,
      currentStage: clearStage ? null : (currentStage ?? this.currentStage),
      cycleLength: cycleLength ?? this.cycleLength,
    );
  }
}

/// Flow: natural → Step1 → Step3(cycle). iui/ivf → Step1 → Step2(stage) → Step3(cycle).
class OnboardingFlow extends ChangeNotifier {
  int step = 1;
  OnboardingData data = OnboardingData();

  int get totalSteps => data.treatmentMode == 'natural' ? 2 : 3;
  int get displayStep =>
      (data.treatmentMode == 'natural' && step == 3) ? 2 : step;

  void selectMode(String mode) {
    data = data.copyWith(treatmentMode: mode, clearStage: true);
    step = mode == 'natural' ? 3 : 2;
    notifyListeners();
  }

  void setCurrentStage(String? stage) {
    data = OnboardingData(
      treatmentMode: data.treatmentMode,
      currentStage: stage,
      cycleLength: data.cycleLength,
    );
    step = 3;
    notifyListeners();
  }

  void setCycleLength(int v) {
    data = data.copyWith(cycleLength: v);
    notifyListeners();
  }

  void goBack() {
    if (step == 3) {
      step = data.treatmentMode == 'natural' ? 1 : 2;
    } else if (step == 2) {
      step = 1;
    }
    notifyListeners();
  }
}
