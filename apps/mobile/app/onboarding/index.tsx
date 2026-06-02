import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Pressable, ActivityIndicator
} from 'react-native'
import { router } from 'expo-router'
import {
  useOnboarding,
  resolveUserStage,
  STEP1_OPTIONS,
  STEP2_OPTIONS,
  type OnboardingData,
} from '@fertility/shared'
import { ProgressBar } from '../../components/onboarding/ProgressBar'
import { OptionButton } from '../../components/onboarding/OptionButton'

// ============================
// 완료 화면
// ============================
const STAGE_CONFIG = {
  beginner:     { emoji: '🌱', color: '#ff8fab', title: '임신 준비 파트너가\n생겼어요!',   desc: '배란일 예측, 주기 추적, 임신 팁으로 시작해요.' },
  intermediate: { emoji: '🌸', color: '#c026d3', title: '호르몬 수치도\n같이 관리해요!', desc: 'AMH·FSH 기록, AI 수치 해석이 준비됐어요.' },
  advanced:     { emoji: '💪', color: '#4f46e5', title: '시술 전 과정을\n함께할게요!',   desc: '일정 관리, 약 복용 알림, AI Q&A가 모두 열렸어요.' },
}

import { usersApi, cyclesApi } from '@fertility/shared'

function CompleteScreen({ data, user }: { data: OnboardingData; user: any }) {
  const stage = resolveUserStage(data)
  const cfg = STAGE_CONFIG[stage]
  const [saving, setSaving] = useState(false)

  const handleStart = async () => {
    if (!user) return
    setSaving(true)
    try {
      // 온보딩 답변에 맞는 핵심 치료 단계(treatmentStage) 매핑
      let treatmentStage: 'natural' | 'iui' | 'ivf' | 'fet' | 'pregnant' = 'natural'
      if (data.treatmentExperience === 'iui') {
        treatmentStage = 'iui'
      } else if (data.treatmentExperience === 'ivf') {
        treatmentStage = 'ivf'
      }

      await usersApi.updateProfile({ treatmentStage, averageCycleLength: data.cycleLength })

      const currentCycles = await cyclesApi.getAll()
      if (currentCycles.length === 0) {
        await cyclesApi.save({
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cycleLength: data.cycleLength,
          periodLength: 5,
        })
      }

      // 3단계: 홈 화면으로 대체 이동
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
        <Text style={styles.infoBoxTitle}>선택한 정보</Text>
        <Text style={styles.infoBoxRow}>생리 주기: <Text style={styles.infoVal}>{data.cycleLength}일</Text></Text>
        <Text style={styles.infoBoxRow}>배란 예정일: <Text style={styles.infoVal}>{data.cycleLength - 14}일째</Text></Text>
      </View>
      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: cfg.color }, saving && { opacity: 0.6 }]}
        onPress={handleStart}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startBtnText}>시작하기 →</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.changeNote}>언제든지 설정에서 변경할 수 있어요</Text>
    </View>
  )
}

// ============================
// Step 3 — 주기 슬라이더
// ============================
const CYCLE_OPTIONS = [21, 23, 25, 26, 27, 28, 29, 30, 31, 32, 35, 40, 45]

function Step3({
  cycleLength,
  onChange,
  onComplete,
}: { cycleLength: number; onChange: (v: number) => void; onComplete: () => void }) {
  return (
    <View>
      <Text style={styles.q}>평균 생리 주기가{'\n'}어떻게 되세요?</Text>
      <Text style={styles.qSub}>잘 모르면 28일로 두셔도 돼요 🙂</Text>

      {/* 큰 숫자 */}
      <View style={styles.bigNumRow}>
        <Text style={styles.bigNum}>{cycleLength}</Text>
        <Text style={styles.bigNumUnit}>일</Text>
      </View>
      <Text style={styles.ovNote}>배란일은 약 {cycleLength - 14}일째 예정이에요</Text>

      {/* - / + 버튼으로 슬라이더 대체 (RN Slider 라이브러리 없이) */}
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(21, cycleLength - 1))}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <View style={styles.stepTrack}>
          <View
            style={[
              styles.stepFill,
              { width: `${((cycleLength - 21) / (45 - 21)) * 100}%` },
            ]}
          />
        </View>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.min(45, cycleLength + 1))}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 자주 쓰는 값 */}
      <View style={styles.chipRow}>
        {CYCLE_OPTIONS.map((v) => (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={[styles.chip, cycleLength === v && styles.chipActive]}
          >
            <Text style={[styles.chipText, cycleLength === v && styles.chipTextActive]}>
              {v}일
            </Text>
          </Pressable>
        ))}
      </View>

      <TouchableOpacity style={styles.completeBtn} onPress={onComplete} activeOpacity={0.85}>
        <Text style={styles.completeBtnText}>맞춤 대시보드 시작하기 🎀</Text>
      </TouchableOpacity>
    </View>
  )
}

// ============================
// 메인 온보딩 스크린
// ============================
export default function OnboardingScreen() {
  const {
    step, data,
    setPreparation, setTreatment,
    setCycleLength, goBack,
  } = useOnboarding()
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
        {/* 로고 */}
        {!done && (
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>🌸</Text>
            <Text style={styles.logoText}>꽃봄</Text>
          </View>
        )}

        {done ? (
          <CompleteScreen data={data} user={user} />
        ) : (
          <>
            <ProgressBar step={step} onBack={goBack} />

            {step === 1 && (
              <View>
                <Text style={styles.q}>임신 준비를{'\n'}얼마나 하셨나요?</Text>
                <Text style={styles.qSub}>솔직하게 알려주시면 딱 맞는 기능을 드릴게요 🌸</Text>
                {STEP1_OPTIONS.map((opt) => (
                  <OptionButton key={opt.value} {...opt} onPress={() => setPreparation(opt.value)} />
                ))}
              </View>
            )}

            {step === 2 && (
              <View>
                <Text style={styles.q}>검사나 시술을{'\n'}받아보신 적 있나요?</Text>
                <Text style={styles.qSub}>해당하는 상황을 선택해 주세요</Text>
                {STEP2_OPTIONS.map((opt) => (
                  <OptionButton key={opt.value} {...opt} onPress={() => setTreatment(opt.value)} />
                ))}
              </View>
            )}

            {step === 3 && (
              <Step3
                cycleLength={data.cycleLength}
                onChange={setCycleLength}
                onComplete={() => setDone(true)}
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
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 0.5,
    borderColor: '#ffd6e0',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 4 },
  logoEmoji: { fontSize: 22 },
  logoText: { fontSize: 18, fontWeight: '700', color: '#ff8fab' },
  q: { fontSize: 22, fontWeight: '700', color: '#5a3042', lineHeight: 30, marginBottom: 6 },
  qSub: { fontSize: 13, color: '#b07080', marginBottom: 20, lineHeight: 20 },

  // Step 3
  bigNumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 4 },
  bigNum: { fontSize: 64, fontWeight: '700', color: '#ff8fab' },
  bigNumUnit: { fontSize: 22, color: '#b07080', marginBottom: 10, marginLeft: 4 },
  ovNote: { fontSize: 12, color: '#b07080', textAlign: 'center', marginBottom: 20 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ffd6e0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, color: '#c0005a', lineHeight: 26 },
  stepTrack: {
    flex: 1, height: 8, backgroundColor: '#ffd6e0',
    borderRadius: 4, overflow: 'hidden',
  },
  stepFill: { height: '100%', backgroundColor: '#ff8fab', borderRadius: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 0.5,
    borderColor: '#ffd6e0', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#ff8fab', borderColor: '#ff8fab' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#8c5060' },
  chipTextActive: { color: '#fff' },
  completeBtn: {
    backgroundColor: '#ff8fab', borderRadius: 20,
    paddingVertical: 16, alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Complete
  completeWrap: { alignItems: 'center', gap: 16 },
  completeIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  completeEmoji: { fontSize: 48 },
  completeTitle: { fontSize: 22, fontWeight: '700', color: '#5a3042', textAlign: 'center', lineHeight: 30 },
  completeDesc: { fontSize: 14, color: '#b07080', textAlign: 'center', lineHeight: 22 },
  infoBox: {
    width: '100%', backgroundColor: '#fff0f4',
    borderRadius: 16, padding: 16, gap: 4,
  },
  infoBoxTitle: { fontSize: 12, fontWeight: '700', color: '#ff8fab', marginBottom: 4 },
  infoBoxRow: { fontSize: 13, color: '#8c5060' },
  infoVal: { fontWeight: '700', color: '#5a3042' },
  startBtn: {
    width: '100%', borderRadius: 20,
    paddingVertical: 16, alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  changeNote: { fontSize: 12, color: '#c4a0ae' },
})
