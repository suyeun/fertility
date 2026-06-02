import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native'
import { router } from 'expo-router'
import {
  useOnboarding,
  STEP1_OPTIONS,
  CYCLE_GUIDE,
  type OnboardingData,
  type TreatmentStage,
} from '@fertility/shared'
import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { usersApi, cyclesApi } from '@fertility/shared'

// ============================
// 완료 화면
// ============================
const STAGE_CONFIG: Record<TreatmentStage, { emoji: string; color: string; title: string; desc: string }> = {
  natural:  { emoji: '🌱', color: '#22c55e', title: '자연임신 준비\n파트너가 생겼어요!',    desc: '배란일 예측, 주기 추적, BBT·OPK 기록으로 시작해요.' },
  iui:      { emoji: '🧪', color: '#3b82f6', title: 'IUI 시술\n함께 준비할게요!',          desc: '시술 일정·약물 알림, 호르몬 수치 기록이 모두 열렸어요.' },
  ivf:      { emoji: '🧬', color: '#8b5cf6', title: 'IVF 시술\n모든 과정을 함께해요!',     desc: '과배란 유도부터 이식까지 — 일정, 수치, 약물, 감정 모두 기록해요.' },
  fet:      { emoji: '❄️', color: '#06b6d4', title: 'FET 동결이식\n곁에 있을게요!',        desc: '이식 일정, 자궁내막 두께, 황체호르몬 기록을 도와드려요.' },
  pregnant: { emoji: '🌸', color: '#ff8fab', title: '임신을 진심으로\n축하해요!',           desc: '소중한 이 시간, BOM이 함께할게요.' },
}

function CompleteScreen({ data, user }: { data: OnboardingData; user: any }) {
  const stage = data.treatmentStage ?? 'natural'
  const cfg = STAGE_CONFIG[stage]
  const [saving, setSaving] = useState(false)

  const handleStart = async () => {
    if (!user) return
    setSaving(true)
    try {
      await usersApi.updateProfile({ treatmentStage: stage, averageCycleLength: data.cycleLength })
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
        <Text style={styles.infoBoxRow}>치료 단계: <Text style={styles.infoVal}>{cfg.emoji} {stage.toUpperCase()}</Text></Text>
        <Text style={styles.infoBoxRow}>주기 설정: <Text style={styles.infoVal}>{data.cycleLength}일</Text></Text>
      </View>
      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: cfg.color }]}
        onPress={handleStart}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.startBtnText}>시작하기 →</Text>
        }
      </TouchableOpacity>
      <Text style={styles.changeNote}>언제든지 설정에서 변경할 수 있어요</Text>
    </View>
  )
}

// ============================
// Step 2 — 주기 설정
// ============================
function Step2Cycle({ stage, cycleLength, onChange, onNext }: {
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

      {/* 수동 조절 */}
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

      {/* 빠른 선택 */}
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
  const { step, data, setStage, setCycleLength, goBack } = useOnboarding()
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
            <ProgressBar step={step} onBack={goBack} />

            {step === 1 && (
              <View>
                <Text style={styles.q}>지금 어떤 단계에{'\n'}계세요?</Text>
                <Text style={styles.qSub}>현재 상황에 맞는 기능을 바로 열어드릴게요 🌸</Text>
                {STEP1_OPTIONS.map((opt) => (
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

            {step === 2 && (
              <Step2Cycle
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

  // 선택지 버튼
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: '#ffd6e0', marginBottom: 8,
  },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#5a3042' },
  optionSub: { fontSize: 11, color: '#b07080', marginTop: 2 },

  // 주기 설정
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

  // 완료 화면
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
