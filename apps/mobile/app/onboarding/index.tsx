import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import {
  useOnboarding, MODE_OPTIONS, IUI_STAGE_OPTIONS, IVF_STAGE_OPTIONS, CYCLE_GUIDE,
  useUserStore, getStageLabelKo, usersApi,
} from '@fertility/shared'
import type { OnboardingData } from '@fertility/shared'
import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { F } from '../../lib/fonts'

const PINK      = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED     = '#b07080'
const BORDER    = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

// ── 완료 화면 ──────────────────────────────────────────
const MODE_CONFIG = {
  natural: { emoji: '🌱', color: '#22c55e', title: '자연임신 준비\n파트너가 생겼어요!',  desc: '배란일 예측, 기초체온·배란테스트기 기록으로 가임기를 잡아드려요.' },
  iui:     { emoji: '💉', color: '#3b82f6', title: '인공수정 전 과정을\n함께할게요!',     desc: '시술 일정·약물 알림, 배란 모니터링, 수치 기록까지 모두 열렸어요.' },
  ivf:     { emoji: '🔬', color: '#8b5cf6', title: '시험관 전 과정을\n함께할게요!',      desc: '난포 모니터링, 채취·이식 일정, 호르몬 수치 기록까지 모두 열렸어요.' },
}

function CompleteScreen({ data }: { data: OnboardingData }) {
  const { saveProfile } = useUserStore()
  const [saving, setSaving] = useState(false)

  const mode = data.treatmentMode ?? 'natural'
  const config = MODE_CONFIG[mode]
  const userMode = mode === 'natural' ? 'NATURAL' : 'CLINIC'

  const handleStart = async () => {
    setSaving(true)
    try {
      const updated = await usersApi.updateProfile({
        currentMode: userMode,
        treatmentStage: mode,
        currentStage: data.currentStage ?? null,
        averageCycleLength: data.cycleLength,
      })
      if (updated) await saveProfile(updated)
      router.replace('/')
    } catch (err) {
      console.error('온보딩 저장 실패:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={s.completeWrap}>
      <View style={[s.completeIcon, { backgroundColor: config.color + '22' }]}>
        <Text style={s.completeEmoji}>{config.emoji}</Text>
      </View>
      <Text style={s.completeTitle}>{config.title}</Text>
      <Text style={s.completeDesc}>{config.desc}</Text>

      <View style={s.infoBox}>
        <Text style={s.infoBoxTitle}>설정 정보</Text>
        <Text style={s.infoRow}>모드: <Text style={s.infoVal}>{config.emoji} {config.title.split('\n')[0]}</Text></Text>
        {mode !== 'natural' && (
          <Text style={s.infoRow}>
            시술 단계: <Text style={s.infoVal}>
              {data.currentStage ? getStageLabelKo(mode, data.currentStage) : '아직 미설정'}
            </Text>
          </Text>
        )}
        <Text style={s.infoRow}>주기: <Text style={s.infoVal}>{data.cycleLength}일</Text></Text>
      </View>

      <TouchableOpacity
        style={[s.startBtn, { backgroundColor: config.color }]}
        onPress={handleStart}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.startBtnText}>시작하기 →</Text>
        }
      </TouchableOpacity>
      <Text style={s.changeNote}>언제든지 설정에서 모드를 변경할 수 있어요</Text>
    </View>
  )
}

// ── 주기 입력 ──────────────────────────────────────────
function StepCycle({ treatmentMode, cycleLength, onChange, onNext }: {
  treatmentMode: 'natural' | 'iui' | 'ivf' | null
  cycleLength: number
  onChange: (v: number) => void
  onNext: () => void
}) {
  const guide = treatmentMode ? CYCLE_GUIDE[treatmentMode] : '평균 생리 주기를 입력해 주세요'
  const presets = [24, 26, 28, 30, 32, 35, 38, 40]

  return (
    <View>
      <Text style={s.q}>생리 주기가{'\n'}며칠인가요?</Text>
      <Text style={s.qSub}>{guide}</Text>

      <View style={s.cycleRow}>
        <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.max(21, cycleLength - 1))}>
          <Text style={s.stepBtnText}>−</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.bigNum}>{cycleLength}</Text>
          <Text style={s.bigNumUnit}>일</Text>
        </View>
        <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.min(45, cycleLength + 1))}>
          <Text style={s.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={s.chipRow}>
        {presets.map(n => (
          <TouchableOpacity
            key={n}
            style={[s.chip, cycleLength === n && s.chipActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[s.chipText, cycleLength === n && s.chipTextActive]}>{n}일</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.note}>정확하지 않아도 괜찮아요 — 나중에 언제든지 수정할 수 있어요</Text>

      <TouchableOpacity style={s.nextBtn} onPress={onNext} activeOpacity={0.85}>
        <Text style={s.nextBtnText}>다음 →</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── 메인 ──────────────────────────────────────────────
export default function OnboardingScreen() {
  const {
    step, displayStep, data, totalSteps,
    selectMode, setCurrentStage, setCycleLength, goBack,
  } = useOnboarding()
  const [done, setDone] = useState(false)

  // 시술 단계 옵션 (모드에 따라)
  const stageOptions = data.treatmentMode === 'iui' ? IUI_STAGE_OPTIONS : IVF_STAGE_OPTIONS

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} bounces={false}>
      <View style={s.card}>
        {!done && (
          <View style={s.logoRow}>
            <Text style={s.logoEmoji}>🌸</Text>
            <Text style={s.logoText}>BOM</Text>
          </View>
        )}

        {done ? (
          <CompleteScreen data={data} />
        ) : (
          <>
            <ProgressBar step={displayStep} totalSteps={totalSteps} onBack={goBack} />

            {/* Step 1: 모드 선택 */}
            {step === 1 && (
              <View>
                <Text style={s.q}>지금 어떻게{'\n'}임신을 준비하고 있나요?</Text>
                <Text style={s.qSub}>선택에 따라 맞춤 기능을 바로 열어드려요 🌸</Text>
                {MODE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={s.optionBtn}
                    onPress={() => selectMode(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.optionIcon, { backgroundColor: opt.color + '18' }]}>
                      <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                    </View>
                    <View style={s.optionText}>
                      <Text style={s.optionLabel}>{opt.label}</Text>
                      <Text style={s.optionSub}>{opt.sub}</Text>
                    </View>
                    <Text style={{ color: BORDER, fontSize: 16 }}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Step 2: 시술 단계 선택 (IUI / IVF) */}
            {step === 2 && data.treatmentMode && data.treatmentMode !== 'natural' && (
              <View>
                <Text style={s.q}>
                  {data.treatmentMode === 'iui' ? '인공수정(IUI)' : '시험관(IVF)'} 치료{'\n'}어느 단계인가요?
                </Text>
                <Text style={s.qSub}>단계에 맞는 기록·알림 기능을 열어드릴게요</Text>
                {stageOptions.map((opt, i) => {
                  const isUnknown = opt.value === null
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[s.optionBtn, isUnknown && s.optionBtnDashed]}
                      onPress={() => setCurrentStage(opt.value)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.optionIcon, { backgroundColor: LIGHT_PINK }]}>
                        <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                      </View>
                      <Text style={[s.optionLabel, isUnknown && { color: MUTED }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

            {/* Step 3: 주기 입력 */}
            {step === 3 && (
              <StepCycle
                treatmentMode={data.treatmentMode}
                cycleLength={data.cycleLength}
                onChange={setCycleLength}
                onNext={() => setDone(true)}
              />
            )}
          </>
        )}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#fff8f9' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    borderWidth: 0.5, borderColor: BORDER,
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 4 },
  logoEmoji:{ fontSize: 22 },
  logoText: { fontSize: 18, fontFamily: F.bold, color: PINK },

  q:    { fontSize: 22, fontFamily: F.bold, color: DARK_ROSE, lineHeight: 30, marginBottom: 6 },
  qSub: { fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 20 },

  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, marginBottom: 8,
  },
  optionBtnDashed: { borderStyle: 'dashed', borderColor: '#e0c0c8' },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 14, fontFamily: F.semiBold, color: DARK_ROSE },
  optionSub:   { fontSize: 11, color: MUTED, marginTop: 2 },

  cycleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  stepBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  stepBtnText:{ fontSize: 22, color: '#c0005a' },
  bigNum:     { fontSize: 64, fontFamily: F.bold, color: PINK },
  bigNumUnit: { fontSize: 16, color: MUTED, textAlign: 'center' },
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: BORDER, backgroundColor: '#fff' },
  chipActive: { backgroundColor: PINK, borderColor: PINK },
  chipText:   { fontSize: 13, fontFamily: F.semiBold, color: '#8c5060' },
  chipTextActive: { color: '#fff' },
  note:       { fontSize: 11, color: '#c4a0ae', textAlign: 'center', marginBottom: 20 },
  nextBtn:    { backgroundColor: PINK, borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  nextBtnText:{ color: '#fff', fontSize: 16, fontFamily: F.bold },

  completeWrap:  { alignItems: 'center', gap: 16 },
  completeIcon:  { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  completeEmoji: { fontSize: 48 },
  completeTitle: { fontSize: 22, fontFamily: F.bold, color: DARK_ROSE, textAlign: 'center', lineHeight: 30 },
  completeDesc:  { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22 },
  infoBox:       { width: '100%', backgroundColor: LIGHT_PINK, borderRadius: 16, padding: 16, gap: 4 },
  infoBoxTitle:  { fontSize: 12, fontFamily: F.bold, color: PINK, marginBottom: 4 },
  infoRow:       { fontSize: 13, color: '#8c5060' },
  infoVal:       { fontFamily: F.bold, color: DARK_ROSE },
  startBtn:      { width: '100%', borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  startBtnText:  { color: '#fff', fontSize: 16, fontFamily: F.bold },
  changeNote:    { fontSize: 12, color: '#c4a0ae' },
})
