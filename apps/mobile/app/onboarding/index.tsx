import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native'
import { router } from 'expo-router'
import {
  useOnboarding,
  MODE_OPTIONS,
  CLINIC_STAGE_OPTIONS,
  CYCLE_GUIDE,
  type OnboardingData,
  type TreatmentStage,
  type UserMode,
} from '@fertility/shared'
import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { usersApi, cyclesApi } from '@fertility/shared'

// ============================
// 완료 화면
// ============================
const MODE_CONFIG: Record<UserMode, { emoji: string; color: string; title: string; desc: string }> = {
  NATURAL: {
    emoji: '🌱', color: '#22c55e',
    title: '자연 임신 준비\n파트너가 생겼어요!',
    desc: '배란일 예측, 기초체온(BBT), 배란테스트기(OPK) 기록으로 가임기를 잡아드려요.',
  },
  CLINIC: {
    emoji: '🏥', color: '#8b5cf6',
    title: '시술 전 과정을\n함께할게요!',
    desc: '시술 일정·약물 알림, 호르몬 수치 기록, 커뮤니티까지 모두 열렸어요.',
  },
}

function CompleteScreen({ data, user }: { data: OnboardingData; user: any }) {
  const mode: UserMode = data.mode ?? 'NATURAL'
  const stage = data.treatmentStage ?? 'natural'
  const cfg = MODE_CONFIG[mode]
  const [saving, setSaving] = useState(false)

  const handleStart = async () => {
    if (!user) return
    setSaving(true)
    try {
      await usersApi.updateProfile({
        currentMode: mode,
        treatmentStage: stage,
        averageCycleLength: data.cycleLength,
      })
      const currentCycles = await cyclesApi.getAll()
      if (currentCycles.length === 0) {
        await cyclesApi.save({
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cycleLength: data.cycleLength,
          periodLength: 5,
        })
      }
      router.replace('/')
    } catch (err) {
      console.error('모바일 온보딩 저장 실패:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.completeWrap}>
      <View style={[styles.completeIcon, { backgroundColor: cfg.color + '22' }]}>
        <Text style={styles.completeEmoji}>{cfg.emoji}</Text>
      </View>
      <Text style={styles.completeTitle}>{cfg.title}</Text>
      <Text style={styles.completeDesc}>{cfg.desc}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>설정 정보</Text>
        <Text style={styles.infoBoxRow}>
          모드: <Text style={styles.infoVal}>{mode === 'NATURAL' ? '🌱 자연 임신 준비' : '🏥 병원 시술'}</Text>
        </Text>
        <Text style={styles.infoBoxRow}>
          주기: <Text style={styles.infoVal}>{data.cycleLength}일</Text>
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: cfg.color }]}
        onPress={handleStart}
        activeOpacity={0.85}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.startBtnText}>시작하기 →</Text>
        }
      </TouchableOpacity>
      <Text style={styles.changeNote}>언제든지 설정에서 모드를 변경할 수 있어요</Text>
    </View>
  )
}

// ============================
// Step 3 — 주기 설정
// ============================
function StepCycle({ stage, cycleLength, onChange, onNext }: {
  stage: TreatmentStage | null
  cycleLength: number
  onChange: (v: number) => void
  onNext: () => void
}) {
  const guide = stage ? CYCLE_GUIDE[stage] : '평균 생리 주기를 입력해 주세요'
  const presets = [24, 26, 28, 30, 32, 35, 38, 40]

  return (
    <View>
      <Text style={styles.q}>생리 주기가{'\n'}며칠인가요?</Text>
      <Text style={styles.qSub}>{guide}</Text>

      <View style={styles.cycleRow}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(21, cycleLength - 1))}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.bigNum}>{cycleLength}</Text>
          <Text style={styles.bigNumUnit}>일</Text>
        </View>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.min(45, cycleLength + 1))}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipRow}>
        {presets.map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.chip, cycleLength === n && styles.chipActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.chipText, cycleLength === n && styles.chipTextActive]}>{n}일</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.note}>정확하지 않아도 괜찮아요 — 나중에 언제든지 수정할 수 있어요</Text>

      <TouchableOpacity style={styles.completeBtn} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.completeBtnText}>다음 →</Text>
      </TouchableOpacity>
    </View>
  )
}

// ============================
// 메인 온보딩 스크린
// ============================
export default function OnboardingScreen() {
  const { step, data, totalSteps, selectMode, setStage, setCycleLength, goBack } = useOnboarding()
  const [done, setDone] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const { loadUser } = await import('../../lib/auth')
      const u = await loadUser()
      if (u) setUser(u)
    }
    init()
  }, [])

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} bounces={false}>
      <View style={styles.card}>
        {!done && (
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>🌸</Text>
            <Text style={styles.logoText}>BOM</Text>
          </View>
        )}

        {done ? (
          <CompleteScreen data={data} user={user} />
        ) : (
          <>
            <ProgressBar step={step} totalSteps={totalSteps} onBack={goBack} />

            {/* Step 1: 모드 선택 */}
            {step === 1 && (
              <View>
                <Text style={styles.q}>지금 어떻게{'\n'}임신을 준비하고 있나요?</Text>
                <Text style={styles.qSub}>선택에 따라 맞춤 기능을 바로 열어드려요 🌸</Text>
                {MODE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.optionBtn}
                    onPress={() => selectMode(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: opt.color + '18' }]}>
                      <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                    <Text style={{ color: '#ffd6e0', fontSize: 16 }}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Step 2: CLINIC 전용 — 시술 단계 선택 */}
            {step === 2 && (
              <View>
                <Text style={styles.q}>어떤 시술을{'\n'}진행 중이세요?</Text>
                <Text style={styles.qSub}>시술 단계에 맞는 기록·알림 기능을 열어드릴게요</Text>
                {CLINIC_STAGE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.optionBtn}
                    onPress={() => setStage(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: opt.color + '18' }]}>
                      <Text style={{ fontSize: 22 }}>{opt.emoji}</Text>
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Step 3 (NATURAL: Step 2): 주기 입력 */}
            {step === 3 && (
              <StepCycle
                stage={data.treatmentStage}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff8f9' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 28, padding: 24,
    borderWidth: 0.5, borderColor: '#ffd6e0',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 4 },
  logoEmoji: { fontSize: 22 },
  logoText: { fontSize: 18, fontWeight: '700', color: '#ff8fab' },
  q: { fontSize: 22, fontWeight: '700', color: '#5a3042', lineHeight: 30, marginBottom: 6 },
  qSub: { fontSize: 13, color: '#b07080', marginBottom: 20, lineHeight: 20 },

  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#ffd6e0', marginBottom: 8,
  },
  optionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#5a3042' },
  optionSub: { fontSize: 11, color: '#b07080', marginTop: 2 },

  cycleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffd6e0', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, color: '#c0005a' },
  bigNum: { fontSize: 64, fontWeight: '700', color: '#ff8fab' },
  bigNumUnit: { fontSize: 16, color: '#b07080', textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: '#ffd6e0', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#ff8fab', borderColor: '#ff8fab' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#8c5060' },
  chipTextActive: { color: '#fff' },
  note: { fontSize: 11, color: '#c4a0ae', textAlign: 'center', marginBottom: 20 },
  completeBtn: { backgroundColor: '#ff8fab', borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  completeWrap: { alignItems: 'center', gap: 16 },
  completeIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  completeEmoji: { fontSize: 48 },
  completeTitle: { fontSize: 22, fontWeight: '700', color: '#5a3042', textAlign: 'center', lineHeight: 30 },
  completeDesc: { fontSize: 14, color: '#b07080', textAlign: 'center', lineHeight: 22 },
  infoBox: { width: '100%', backgroundColor: '#fff0f4', borderRadius: 16, padding: 16, gap: 4 },
  infoBoxTitle: { fontSize: 12, fontWeight: '700', color: '#ff8fab', marginBottom: 4 },
  infoBoxRow: { fontSize: 13, color: '#8c5060' },
  infoVal: { fontWeight: '700', color: '#5a3042' },
  startBtn: { width: '100%', borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  changeNote: { fontSize: 12, color: '#c4a0ae' },
})
