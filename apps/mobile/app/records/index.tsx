// apps/mobile/app/records/index.tsx
import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { hormonesApi, diaryApi, usersApi } from '@fertility/shared'
import type { HormoneRecord, DiaryEntry, Mood, UserProfile } from '@fertility/shared'

type HormoneType = 'amh' | 'fsh' | 'lh' | 'estradiol' | 'progesterone' | 'bbt' | 'opkIndex'

export default function RecordsScreen() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<'hormone' | 'diary'>('hormone')
  const [subTab, setSubTab] = useState<'daily' | 'medical' | 'procedure'>('daily')

  // 호르몬 관련 상태
  const [records, setRecords] = useState<HormoneRecord[]>([])
  const [loadingHormones, setLoadingHormones] = useState(true)
  const [selectedHormone, setSelectedHormone] = useState<HormoneType>('bbt')

  // 입력 폼 상태 (호르몬 및 홈케어 지표)
  const [isHormoneModalOpen, setIsHormoneModalOpen] = useState(false)
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().split('T')[0])
  const [amh, setAmh] = useState('')
  const [fsh, setFsh] = useState('')
  const [lh, setLh] = useState('')
  const [estradiol, setEstradiol] = useState('')
  const [progesterone, setProgesterone] = useState('')
  const [bbt, setBbt] = useState('')
  const [opkIndex, setOpkIndex] = useState('')
  const [cervicalMucus, setCervicalMucus] = useState<'dry' | 'sticky' | 'creamy' | 'eggwhite' | ''>('')
  const [weight, setWeight] = useState('')
  const [sleepHours, setSleepHours] = useState('')

  // 시술 지표 상태
  const [follicleSize, setFollicleSize] = useState('')
  const [endometriumThickness, setEndometriumThickness] = useState('')
  const [retrievedOocytesCount, setRetrievedOocytesCount] = useState('')
  const [embryoGrade, setEmbryoGrade] = useState('')
  const [hcgLevel, setHcgLevel] = useState('')

  const [hormoneNotes, setHormoneNotes] = useState('')
  const [savingHormone, setSavingHormone] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleUpgradeStage = async (targetStage: 'iui' | 'ivf') => {
    if (!user) return
    setIsUpgrading(true)
    try {
      await usersApi.updateProfile({
        treatmentStage: targetStage
      })
      const p = await usersApi.getProfile()
      setProfile(p)
      setSubTab(targetStage === 'iui' ? 'medical' : 'procedure')
    } catch (err) {
      console.error('단계 업그레이드 실패:', err)
    } finally {
      setIsUpgrading(false)
    }
  }

  const saveDailyField = async (field: keyof HormoneRecord, value: any) => {
    if (!user) return
    try {
      const todayRecord = records.find(r => r.recordedAt === todayStr)
      const recordId = todayRecord?.id || 'daily_' + Math.random().toString(36).substring(2, 9)
      
      const updatedRecord: Partial<HormoneRecord> = {
        ...todayRecord,
        id: recordId,
        userId: user.uid,
        recordedAt: todayStr,
        [field]: value === '' ? undefined : value
      }
      
      await hormonesApi.save(updatedRecord)
      await fetchRecords(user.uid)
    } catch (err) {
      console.error('일상 수치 저장 실패:', err)
    }
  }

  // 아코디언 상태
  const [showHospitalHormones, setShowHospitalHormones] = useState(false)
  const [showNaturalIndicators, setShowNaturalIndicators] = useState(false)

  // 일기 관련 상태
  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  const [loadingDiaries, setLoadingDiaries] = useState(true)
  const [selectedMood, setSelectedMood] = useState<Mood>('neutral')
  const [diaryContent, setDiaryContent] = useState('')
  const [aiFeedback, setAiFeedback] = useState('')
  const [savingDiary, setSavingDiary] = useState(false)
  const [diaryError, setDiaryError] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  const fetchRecords = async (userId: string) => {
    try {
      const data = await hormonesApi.getAll()
      setRecords(data)
    } catch (err) {
      console.error('호르몬 기록 로드 실패:', err)
    } finally {
      setLoadingHormones(false)
    }
  }

  const fetchDiaries = async (userId: string) => {
    try {
      const res = await diaryApi.getAll()
      const data = Array.isArray(res) ? res : (res?.data ?? [])
      setDiaries(data)

      const todayEntry = data.find((d: any) => d.date === todayStr)
      if (todayEntry) {
        setSelectedMood(todayEntry.mood)
        setDiaryContent(todayEntry.content)
        setAiFeedback(todayEntry.aiAnalysis || '')
      }
    } catch (err) {
      console.error('일기 로드 실패:', err)
    } finally {
      setLoadingDiaries(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { loadStoredToken, loadUser } = await import('../../lib/auth')
        const token = await loadStoredToken()
        if (!token) return
        const u = await loadUser()
        if (!u) return
        setUser(u)
        setLoadingHormones(true)
        setLoadingDiaries(true)
        const p = await usersApi.getProfile()
        setProfile(p)
        setSelectedHormone(p?.treatmentStage === 'natural' ? 'bbt' : 'amh')
        await Promise.all([fetchRecords(u.uid), fetchDiaries(u.uid)])
      } catch (e) {
        setLoadingHormones(false)
        setLoadingDiaries(false)
      }
    }
    init()
  }, [])

  const handleHormoneSubmit = async () => {
    if (!user) return
    setSavingHormone(true)
    try {
      await hormonesApi.save({
        recordedAt,
        amh: amh ? Number(amh) : undefined,
        fsh: fsh ? Number(fsh) : undefined,
        lh: lh ? Number(lh) : undefined,
        estradiol: estradiol ? Number(estradiol) : undefined,
        progesterone: progesterone ? Number(progesterone) : undefined,
        bbt: bbt ? Number(bbt) : undefined,
        opkIndex: opkIndex ? Number(opkIndex) : undefined,
        cervicalMucus: cervicalMucus ? cervicalMucus as any : undefined,
        weight: weight ? Number(weight) : undefined,
        sleepHours: sleepHours ? Number(sleepHours) : undefined,
        
        follicleSize: follicleSize ? Number(follicleSize) : undefined,
        endometriumThickness: endometriumThickness ? Number(endometriumThickness) : undefined,
        retrievedOocytesCount: retrievedOocytesCount ? Number(retrievedOocytesCount) : undefined,
        embryoGrade: embryoGrade || undefined,
        hcgLevel: hcgLevel ? Number(hcgLevel) : undefined,
        
        notes: hormoneNotes
      })
      await fetchRecords(user.uid)
      setIsHormoneModalOpen(false)
      setAmh('')
      setFsh('')
      setLh('')
      setEstradiol('')
      setProgesterone('')
      setBbt('')
      setOpkIndex('')
      setCervicalMucus('')
      setWeight('')
      setSleepHours('')
      setFollicleSize('')
      setEndometriumThickness('')
      setRetrievedOocytesCount('')
      setEmbryoGrade('')
      setHcgLevel('')
      setHormoneNotes('')
    } catch (err) {
      console.error(err)
    } finally {
      setSavingHormone(false)
    }
  }

  const handleSaveDiary = async () => {
    if (!user) return
    if (!diaryContent.trim()) {
      setDiaryError('오늘의 마음 일기 내용을 작성해 주세요.')
      return
    }

    setSavingDiary(true)
    setDiaryError(null)

    try {
      let aiAnalysis = ''
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
        const response = await fetch(`${apiUrl}/api/ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: `다음 일기를 쓴 사용자의 감정을 따뜻하게 공감하고, 힘이 나는 응원 편지를 2-3문장으로 다정하게 써주세요. 의학적 판단은 금지입니다:\n\n"${diaryContent}"`,
                timestamp: new Date().toISOString()
              }
            ]
          })
        })

        if (response.ok) {
          aiAnalysis = await response.text()
        } else {
          aiAnalysis = getLocalMockFeedback(selectedMood)
        }
      } catch (err) {
        aiAnalysis = getLocalMockFeedback(selectedMood)
      }

      setAiFeedback(aiAnalysis)

      await diaryApi.save(todayStr, {
        mood: selectedMood,
        content: diaryContent,
        aiAnalysis
      })

      await fetchDiaries(user.uid)
    } catch (err: any) {
      setDiaryError(err.message || '일기 저장에 실패했습니다.')
    } finally {
      setSavingDiary(false)
    }
  }

  const getLocalMockFeedback = (mood: Mood): string => {
    const defaultMessages: Record<Mood, string[]> = {
      great: [
        "오늘 하루 마음 가득 기쁨을 느끼셨다니 저도 무척 행복합니다! 이 밝고 건강한 호르몬이 몸속 곳곳에 머물며 소중한 새 생명을 맞이할 최상의 상태를 만들어 줄 거예요.",
        "기쁨이 넘치는 편안한 에너지가 참 소중합니다. 온전히 마음껏 행복해하시는 것만으로도 당신의 자궁과 몸은 아주 기쁘게 반응하고 있어요. 이 행복함이 계속되길 바라요."
      ],
      good: [
        "차분하고 평온하게 보낸 하루만큼 귀중한 것은 없습니다. 안정된 심박수와 호르몬은 착상을 돕고 자궁을 포근하게 만들어 줍니다. 참 좋은 상태를 잘 유지하고 계십니다.",
        "무리하지 않고 만족스러운 소소한 일상을 꾸리셨네요. 편안한 숨결과 함께 스스로를 듬뿍 사랑하고 아껴주는 오늘처럼, 하루하루 건강을 쌓아가 보세요."
      ],
      neutral: [
        "무탈하고 일상적인 보통의 오늘에 감사합니다. 특별한 일이 없어도 당신의 몸과 세포들은 아기라는 새싹을 싹틔우기 위해 매 순간 힘껏 일하고 있답니다. 든든한 준비를 잘 이어가고 계십니다.",
        "평범하게 하루가 흘러간 것에 만족합니다. 잔잔한 호수 같은 무던한 정서 상태가 임신 준비 과정에 아주 든든한 밑거름이 되어 줍니다. 편안한 밤 보내세요."
      ],
      sad: [
        "마음이 쓸쓸하고 슬퍼지는 날도 있는 법입니다. 다 괜찮으니 억지로 참거나 강해지려 하지 말고 슬픈 마음에 충분히 귀 기울여주세요. 당신은 이미 너무나 잘하고 있습니다.",
        "기다림이 깊어지면 누구나 지치고 서럽습니다. 오늘은 스스로에게 가장 다정하고 따뜻한 위로를 선물해주세요. 당신이 흘린 땀방울과 눈물은 반드시 기적으로 보답받을 것입니다."
      ],
      anxious: [
        "다가오는 시술이나 결과에 온 신경이 쓰여 불안한 것은 너무 당연합니다. 그러나 미래의 걱정은 잠시 떼어두고, 깊은 들숨과 날숨을 3번만 쉬어보세요. 당신의 몸은 생각보다 강하고 지혜롭습니다.",
        "불안함은 아기를 무척이나 간절히 품고 싶어하는 귀여운 사랑의 또 다른 모습입니다. 불안이 찾아올 땐 따뜻한 온수 샤ワー를 하고 푹 자도록 해요."
      ],
      hopeful: [
        "희망과 긍정적인 기대는 임신 준비에 가장 반짝이는 빛입니다! 다가올 따사로운 기적을 향한 기대가 당신의 온 몸에 활력 넘치는 비타민이 되어 줄 거예요.",
        "긍정적인 마음을 품고 매 단계를 성실히 밟아가는 당신의 발걸음을 힘껏 응원합니다. 바라시던 그 따사로운 봄소식이 곧 품안에 안길 것을 믿어 의심치 않습니다."
      ],
      excited: [
        "설레는 마음이 온몸에 넘치는 하루네요! 두근거림과 기대감이 가득한 이 에너지가 당신의 몸에 긍정적인 활력을 불어넣고 있어요. 소중한 설렘을 오래 간직하세요.",
        "가슴 뛰는 감정은 참 아름다운 신호예요. 임신 준비의 여정 속에서 이런 설렘을 느낀다는 것 자체가 얼마나 소중한지 몰라요. 오늘의 이 두근거림을 기억해두세요."
      ],
      tired: [
        "몸도 마음도 지쳐있는 날이죠. 충분히 쉬어도 괜찮아요. 오늘은 무리하지 말고 따뜻한 차 한 잔과 함께 몸이 회복할 시간을 주세요. 내일은 더 가벼운 하루가 될 거예요.",
        "피로함은 당신이 지금껏 얼마나 열심히 살아왔는지 보여주는 증거예요. 오늘만큼은 스스로에게 충분한 휴식을 선물하세요. 잘 쉬어야 다시 힘을 낼 수 있으니까요."
      ],
      angry: [
        "화가 나는 건 당연한 감정이에요. 억누르지 말고 잠시 깊게 숨을 들이쉬어보세요. 감정을 인정하고 나면 한결 가벼워질 거예요. 당신의 감정은 모두 소중합니다.",
        "힘든 상황에서 화가 나는 것은 자연스러운 반응이에요. 감정을 충분히 느끼고 나서, 따뜻한 물로 씻어내듯 조금씩 내려놓아 보세요. 당신 편인 봄이가 응원하고 있어요."
      ],
      sick: [
        "몸이 아프면 마음도 쉽게 지치죠. 충분한 수분과 휴식이 지금 가장 중요해요. 오늘은 몸의 신호에 귀 기울이고 조심히 쉬어가세요. 빨리 나아지기를 바라요.",
        "아픈 몸이 하루빨리 회복되기를 진심으로 바라요. 무리하지 말고 따뜻하게 지내세요. 몸이 스스로 회복할 수 있도록 충분한 쉼을 주는 것도 임신 준비의 소중한 일부예요."
      ]
    }
    const pool = defaultMessages[mood] || defaultMessages['neutral']
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const hormoneMeta: Record<HormoneType, { name: string; unit: string; desc: string; normal: string; maxLimit: number }> = {
    amh: {
      name: 'AMH (난소 예비능)',
      unit: 'ng/mL',
      desc: '난소 내 남아있는 난자의 개수(나이)를 가늠하는 지표입니다.',
      normal: '2.0 ~ 4.0 ng/mL',
      maxLimit: 10
    },
    fsh: {
      name: 'FSH (여포 자극 호르몬)',
      unit: 'mIU/mL',
      desc: '난포 성장을 촉진하며, 난소 기능 저하 시 자극을 위해 수치가 올라갑니다.',
      normal: '3.5 ~ 12.5 mIU/mL',
      maxLimit: 25
    },
    lh: {
      name: 'LH (황체 형성 호르몬)',
      unit: 'mIU/mL',
      desc: '난포를 터뜨려 배란을 유도하는 호르몬입니다.',
      normal: '2.4 ~ 12.6 mIU/mL',
      maxLimit: 25
    },
    estradiol: {
      name: 'E2 (에스트로겐)',
      unit: 'pg/mL',
      desc: '자궁 내막을 두껍게 만드는 여성호르몬입니다.',
      normal: '25 ~ 172 pg/mL',
      maxLimit: 300
    },
    progesterone: {
      name: 'PROG (황체호르몬)',
      unit: 'ng/mL',
      desc: '착상 환경을 유지하고 임신을 돕는 호르몬입니다.',
      normal: '1.8 ~ 24.0 ng/mL (배란 후)',
      maxLimit: 40
    },
    bbt: {
      name: '기초체온 (BBT)',
      unit: '°C',
      desc: '매일 아침 눈뜬 직후 움직이지 않고 측정하는 구강 체온입니다. 저온기와 고온기의 흐름을 파악하여 배란일을 예측합니다.',
      normal: '저온기 36.1 ~ 36.4°C / 고온기 36.5 ~ 37.0°C',
      maxLimit: 38
    },
    opkIndex: {
      name: '배란테스트기 (OPK)',
      unit: 'Level',
      desc: '소변 내 황체형성호르몬(LH) 농도 진하기를 0 ~ 10 단계 수치로 진단하여 배란 피크를 파악합니다.',
      normal: '양성(피크): 9 ~ 10 Level',
      maxLimit: 10
    }
  }

  // 최신 수치 및 비교 값 계산
  const latestRecord = records[0]
  const prevRecord = records[1]
  const currentVal = latestRecord ? latestRecord[selectedHormone] : undefined
  const prevVal = prevRecord ? prevRecord[selectedHormone] : undefined

  let percentChange = ''
  if (currentVal !== undefined && prevVal !== undefined && prevVal > 0) {
    const diff = currentVal - prevVal
    const pct = ((diff / prevVal) * 100).toFixed(0)
    percentChange = diff >= 0 ? `지난 검사 대비 +${pct}% ▲` : `지난 검사 대비 ${pct}% ▼`
  }

  const moods: { value: Mood; icon: string; label: string }[] = [
    { value: 'great', icon: '😄', label: '행복' },
    { value: 'good', icon: '😊', label: '평온' },
    { value: 'neutral', icon: '😐', label: '보통' },
    { value: 'sad', icon: '😢', label: '슬픔' },
    { value: 'anxious', icon: '😰', label: '불안' },
    { value: 'hopeful', icon: '💫', label: '기대' }
  ]

  const loadingAny = activeTab === 'hormone' ? loadingHormones : loadingDiaries

  if (loadingAny) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#be123c" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* 상단 탭 스위처 */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.switcherTab, activeTab === 'hormone' && styles.activeSwitcherTab]}
            onPress={() => setActiveTab('hormone')}
          >
            <Text style={[styles.switcherTabText, activeTab === 'hormone' && styles.activeSwitcherTabText]}>
              🧪 신체 수치 기록
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switcherTab, activeTab === 'diary' && styles.activeSwitcherTab]}
            onPress={() => setActiveTab('diary')}
          >
            <Text style={[styles.switcherTabText, activeTab === 'diary' && styles.activeSwitcherTabText]}>
              💌 마음 일기 기록
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'hormone' ? (
          // 🧪 신체 수치 기록 탭 내용
          <View style={styles.tabContent}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>오늘의 신체 기록 📊</Text>
                <Text style={styles.subtitle}>매일의 신체 변화와 시기별 검사·시술 수치를 기록합니다</Text>
              </View>
              {subTab !== 'daily' && (
                <TouchableOpacity style={styles.addBtn} onPress={() => setIsHormoneModalOpen(true)}>
                  <Text style={styles.addBtnText}>수치 상세 등록</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 대분류 서브 탭 */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <TouchableOpacity
                onPress={() => setSubTab('daily')}
                style={[
                  styles.subTabButton,
                  subTab === 'daily' && styles.activeSubTabButton
                ]}
              >
                <Text style={[styles.subTabButtonText, subTab === 'daily' && styles.activeSubTabButtonText]}>일상 기록</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setSubTab('medical')}
                style={[
                  styles.subTabButton,
                  subTab === 'medical' && styles.activeSubTabButton
                ]}
              >
                <Text style={[styles.subTabButtonText, subTab === 'medical' && styles.activeSubTabButtonText]}>
                  검사 수치 {profile?.treatmentStage === 'natural' && '🔒'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setSubTab('procedure')}
                style={[
                  styles.subTabButton,
                  subTab === 'procedure' && styles.activeSubTabButton
                ]}
              >
                <Text style={[styles.subTabButtonText, subTab === 'procedure' && styles.activeSubTabButtonText]}>
                  시술 수치 {(profile?.treatmentStage === 'natural' || profile?.treatmentStage === 'iui') && '🔒'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 서브 탭 컨텐츠 분기 */}
            {subTab === 'daily' && (
              // [1] 일상 기록 탭
              <View style={{ gap: 12 }}>
                {(() => {
                  const todayRecord = records.find(r => r.recordedAt === todayStr)
                  return (
                    <View style={styles.dailyRecordContainer}>
                      {/* 기초체온 BBT */}
                      <View style={styles.dailyRow}>
                        <Text style={styles.dailyRowLabel}>🌡️ 기초체온</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            style={styles.dailyInput}
                            keyboardType="numeric"
                            placeholder="36.5"
                            value={todayRecord?.bbt !== undefined ? String(todayRecord.bbt) : bbt}
                            onChangeText={(val) => {
                              setBbt(val)
                              saveDailyField('bbt', val ? Number(val) : '')
                            }}
                          />
                          <Text style={styles.dailyInputUnit}>°C 입력</Text>
                        </View>
                      </View>

                      {/* 배란 테스트기 */}
                      <View style={styles.dailyRow}>
                        <Text style={styles.dailyRowLabel}>🥚 배란 테스트기</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => {
                              const val = todayRecord?.opkIndex === 10 ? '' : 10
                              saveDailyField('opkIndex', val)
                            }}
                            style={[
                              styles.opkBtn,
                              todayRecord?.opkIndex === 10 && { backgroundColor: '#e11d48', borderColor: '#e11d48' }
                            ]}
                          >
                            <Text style={[styles.opkBtnText, todayRecord?.opkIndex === 10 && { color: '#fff' }]}>양성 (피크)</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              const val = todayRecord?.opkIndex === 1 ? '' : 1
                              saveDailyField('opkIndex', val)
                            }}
                            style={[
                              styles.opkBtn,
                              todayRecord?.opkIndex === 1 && { backgroundColor: '#6b7280', borderColor: '#6b7280' }
                            ]}
                          >
                            <Text style={[styles.opkBtnText, todayRecord?.opkIndex === 1 && { color: '#fff' }]}>음성</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* 몸무게 */}
                      <View style={styles.dailyRow}>
                        <Text style={styles.dailyRowLabel}>⚖️ 몸무게</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            style={styles.dailyInput}
                            keyboardType="numeric"
                            placeholder="50"
                            value={todayRecord?.weight !== undefined ? String(todayRecord.weight) : weight}
                            onChangeText={(val) => {
                              setWeight(val)
                              saveDailyField('weight', val ? Number(val) : '')
                            }}
                          />
                          <Text style={styles.dailyInputUnit}>kg 입력</Text>
                        </View>
                      </View>

                      {/* 수면 시간 */}
                      <View style={styles.dailyRow}>
                        <Text style={styles.dailyRowLabel}>😴 수면 시간</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            style={styles.dailyInput}
                            keyboardType="numeric"
                            placeholder="8"
                            value={todayRecord?.sleepHours !== undefined ? String(todayRecord.sleepHours) : sleepHours}
                            onChangeText={(val) => {
                              setSleepHours(val)
                              saveDailyField('sleepHours', val ? Number(val) : '')
                            }}
                          />
                          <Text style={styles.dailyInputUnit}>시간 입력</Text>
                        </View>
                      </View>
                    </View>
                  )
                })()}

                {/* 하단 넛지 배너 */}
                <View style={styles.nudgeBanner}>
                  <Text style={styles.nudgeEmoji}>💡</Text>
                  <Text style={styles.nudgeText}>
                    기초체온을 매일 기록하면 배란일 예측이 훨씬 정확해져요
                  </Text>
                </View>
              </View>
            )}

            {subTab === 'medical' && (
              // [2] 검사 수치 탭
              <View>
                {profile?.treatmentStage === 'natural' ? (
                  // 잠금 상태 (🔒)
                  <View style={styles.lockOverlay}>
                    <Text style={styles.lockIcon}>🔒</Text>
                    <Text style={styles.lockTitle}>
                      AMH, FSH 등 병원 검사 결과를 기록하고 싶으신가요?
                    </Text>
                    <Text style={styles.lockDesc}>
                      6개월 이상 임신 준비 중이라면 이 기능이 도움이 돼요.{"\n"}
                      의사 소견 및 호르몬 트렌드 모니터링을 지원합니다.
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleUpgradeStage('iui')}
                      disabled={isUpgrading}
                      style={[styles.upgradeBtn, { backgroundColor: '#c026d3' }]}
                    >
                      {isUpgrading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.upgradeBtnText}>병원 검사 수치 기록 활성화 ✨</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  // 검사 수치 활성화 상태
                  <View style={{ gap: 14 }}>
                    {/* 호르몬 선택 탭 */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
                      {['amh', 'fsh', 'lh', 'estradiol', 'progesterone'].map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.tab, selectedHormone === h && styles.activeTab]}
                          onPress={() => setSelectedHormone(h as any)}
                        >
                          <Text style={[styles.tabText, selectedHormone === h && styles.activeTabText]}>
                            {h.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* 추이 요약 카드 */}
                    <View style={styles.chartCard}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{hormoneMeta[selectedHormone]?.name || '호르몬'}</Text>
                        <Text style={styles.cardUnit}>단위: {hormoneMeta[selectedHormone]?.unit || ''}</Text>
                      </View>

                      {currentVal !== undefined ? (
                        <View style={styles.gaugeContainer}>
                          <View style={styles.valueRow}>
                            <Text style={styles.gaugeValue}>{currentVal}</Text>
                            {percentChange ? (
                              <Text style={[styles.changeText, percentChange.includes('+') ? styles.textUp : styles.textDown]}>
                                {percentChange}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.gaugeBg}>
                            <View
                              style={[
                                styles.gaugeFill,
                                {
                                  width: `${Math.min((currentVal / (hormoneMeta[selectedHormone]?.maxLimit || 10)) * 100, 100)}%`
                                }
                              ]}
                            />
                          </View>
                          <View style={styles.gaugeMinMax}>
                            <Text style={styles.limitText}>0</Text>
                            <Text style={styles.limitText}>{(hormoneMeta[selectedHormone]?.maxLimit || 10)} {hormoneMeta[selectedHormone]?.unit || ''}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.emptyChart}>
                          <Text style={styles.emptyText}>등록된 검사 수치가 없습니다.</Text>
                        </View>
                      )}
                    </View>

                    {/* 호르몬 설명 카드 */}
                    <View style={styles.infoCard}>
                      <Text style={styles.infoTitle}>💡 호르몬 상식 가이드</Text>
                      <Text style={styles.infoDesc}>{hormoneMeta[selectedHormone]?.desc || ''}</Text>
                      <View style={styles.normalRangeBox}>
                        <Text style={styles.rangeLabel}>표준 기준치</Text>
                        <Text style={styles.rangeVal}>{hormoneMeta[selectedHormone]?.normal || ''}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {subTab === 'procedure' && (
              // [3] 시술 수치 탭
              <View>
                {(profile?.treatmentStage === 'natural' || profile?.treatmentStage === 'iui') ? (
                  // 잠금 상태 (🔒)
                  <View style={styles.lockOverlay}>
                    <Text style={styles.lockIcon}>🔒</Text>
                    <Text style={styles.lockTitle}>
                      난포 크기, 자궁내막 두께 등 시술 과정을 기록하고 싶으신가요?
                    </Text>
                    <Text style={styles.lockDesc}>
                      본격적인 시술(시험관/인공수정)을 준비하거나 진행 중이라면 이 기능이 도움이 돼요.{"\n"}
                      이식, 채취 데이터와 약물 일정을 빈틈없이 케어합니다.
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleUpgradeStage('ivf')}
                      disabled={isUpgrading}
                      style={[styles.upgradeBtn, { backgroundColor: '#4f46e5' }]}
                    >
                      {isUpgrading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.upgradeBtnText}>시술 수치 기록 활성화 ✨</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  // 시술 수치 활성화 상태
                  <View style={styles.chartCard}>
                    <Text style={[styles.cardTitle, { color: '#312e81', marginBottom: 12 }]}>💉 시험관 & 인공수정 핵심 지표 관리</Text>
                    {(() => {
                      const procedureRecord = records.find(r => r.follicleSize !== undefined || r.endometriumThickness !== undefined || r.hcgLevel !== undefined)
                      return procedureRecord ? (
                        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                          {procedureRecord.follicleSize !== undefined && (
                            <View style={styles.procedureInfoBox}>
                              <Text style={styles.procedureInfoLabel}>난포 크기</Text>
                              <Text style={styles.procedureInfoVal}>{procedureRecord.follicleSize} mm</Text>
                            </View>
                          )}
                          {procedureRecord.endometriumThickness !== undefined && (
                            <View style={styles.procedureInfoBox}>
                              <Text style={styles.procedureInfoLabel}>자궁내막 두께</Text>
                              <Text style={styles.procedureInfoVal}>{procedureRecord.endometriumThickness} mm</Text>
                            </View>
                          )}
                          {procedureRecord.hcgLevel !== undefined && (
                            <View style={styles.procedureInfoBox}>
                              <Text style={styles.procedureInfoLabel}>hCG 수치</Text>
                              <Text style={styles.procedureInfoVal}>{procedureRecord.hcgLevel} mIU/mL</Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                          <Text style={styles.emptyText}>아직 기록된 시술 데이터가 없습니다.</Text>
                        </View>
                      )
                    })()}
                  </View>
                )}
              </View>
            )}

            {/* 과거 기록 히스토리 */}
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>📋 과거 수치 기록 내역</Text>
              {records.length > 0 ? (
                records.map((r, i) => (
                  <View key={r.id || i} style={styles.historyItem}>
                    <View style={styles.historyHeaderRow}>
                      <Text style={styles.historyDate}>{r.recordedAt}</Text>
                      {r.notes ? <Text style={styles.historyNotes} numberOfLines={1}>"{r.notes}"</Text> : null}
                    </View>
                    <View style={styles.historyValues}>
                      {r.bbt !== undefined && (
                        <View style={[styles.valPill, { backgroundColor: '#ffe4e6', borderColor: '#fda4af' }]}>
                          <Text style={[styles.valPillLabel, { color: '#be123c' }]}>체온</Text>
                          <Text style={[styles.valPillVal, { color: '#9f1239' }]}>{r.bbt}°C</Text>
                        </View>
                      )}
                      {r.opkIndex !== undefined && (
                        <View style={[styles.valPill, { backgroundColor: '#ffe4e6', borderColor: '#fda4af' }]}>
                          <Text style={[styles.valPillLabel, { color: '#be123c' }]}>배테기</Text>
                          <Text style={[styles.valPillVal, { color: '#9f1239' }]}>{r.opkIndex === 10 ? '양성(피크)' : '음성'}</Text>
                        </View>
                      )}
                      {r.cervicalMucus !== undefined && (
                        <View style={[styles.valPill, { backgroundColor: '#ffe4e6', borderColor: '#fda4af' }]}>
                          <Text style={[styles.valPillLabel, { color: '#be123c' }]}>점액</Text>
                          <Text style={[styles.valPillVal, { color: '#9f1239' }]}>
                            {r.cervicalMucus === 'dry' && '건조함'}
                            {r.cervicalMucus === 'sticky' && '끈적함'}
                            {r.cervicalMucus === 'creamy' && '크림'}
                            {r.cervicalMucus === 'eggwhite' && '계란흰자'}
                          </Text>
                        </View>
                      )}
                      {r.weight !== undefined && (
                        <View style={[styles.valPill, { backgroundColor: '#ffe4e6', borderColor: '#fda4af' }]}>
                          <Text style={[styles.valPillLabel, { color: '#be123c' }]}>몸무게</Text>
                          <Text style={[styles.valPillVal, { color: '#9f1239' }]}>{r.weight}kg</Text>
                        </View>
                      )}
                      {r.sleepHours !== undefined && (
                        <View style={[styles.valPill, { backgroundColor: '#ffe4e6', borderColor: '#fda4af' }]}>
                          <Text style={[styles.valPillLabel, { color: '#be123c' }]}>수면</Text>
                          <Text style={[styles.valPillVal, { color: '#9f1239' }]}>{r.sleepHours}시간</Text>
                        </View>
                      )}
                      {r.amh !== undefined && (
                        <View style={styles.valPill}>
                          <Text style={styles.valPillLabel}>AMH</Text>
                          <Text style={styles.valPillVal}>{r.amh}</Text>
                        </View>
                      )}
                      {r.fsh !== undefined && (
                        <View style={styles.valPill}>
                          <Text style={styles.valPillLabel}>FSH</Text>
                          <Text style={styles.valPillVal}>{r.fsh}</Text>
                        </View>
                      )}
                      {r.lh !== undefined && (
                        <View style={styles.valPill}>
                          <Text style={styles.valPillLabel}>LH</Text>
                          <Text style={styles.valPillVal}>{r.lh}</Text>
                        </View>
                      )}
                      {r.estradiol !== undefined && (
                        <View style={styles.valPill}>
                          <Text style={styles.valPillLabel}>E2</Text>
                          <Text style={styles.valPillVal}>{r.estradiol}</Text>
                        </View>
                      )}
                      {r.progesterone !== undefined && (
                        <View style={styles.valPill}>
                          <Text style={styles.valPillLabel}>PROG</Text>
                          <Text style={styles.valPillVal}>{r.progesterone}</Text>
                        </View>
                      )}
                      {r.follicleSize !== undefined && (
                        <View style={[styles.valPill, { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' }]}>
                          <Text style={[styles.valPillLabel, { color: '#4338ca' }]}>난포</Text>
                          <Text style={[styles.valPillVal, { color: '#312e81' }]}>{r.follicleSize}mm</Text>
                        </View>
                      )}
                      {r.endometriumThickness !== undefined && (
                        <View style={[styles.valPill, { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' }]}>
                          <Text style={[styles.valPillLabel, { color: '#4338ca' }]}>내막</Text>
                          <Text style={[styles.valPillVal, { color: '#312e81' }]}>{r.endometriumThickness}mm</Text>
                        </View>
                      )}
                      {r.hcgLevel !== undefined && (
                        <View style={[styles.valPill, { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' }]}>
                          <Text style={[styles.valPillLabel, { color: '#4338ca' }]}>hCG</Text>
                          <Text style={[styles.valPillVal, { color: '#312e81' }]}>{r.hcgLevel}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>히스토리가 비어 있습니다.</Text>
              )}
            </View>
          </View>
        ) : (
          // 💌 마음 일기 기록 탭 내용
          <View style={styles.tabContent}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>오늘의 마음 일기 📝</Text>
                <Text style={styles.subtitle}>시술 중 겪는 미묘한 감정을 기록하고 위로받으세요</Text>
              </View>
            </View>

            {/* 작성 카드 */}
            <View style={styles.card}>
              <Text style={styles.cardPrompt}>오늘 나의 마음 날씨는 어떤가요?</Text>

              {/* 기분 패널 */}
              <View style={styles.moodGrid}>
                {moods.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.moodBtn, selectedMood === m.value && styles.activeMoodBtn]}
                    onPress={() => setSelectedMood(m.value)}
                  >
                    <Text style={styles.moodIcon}>{m.icon}</Text>
                    <Text style={[styles.moodLabel, selectedMood === m.value && styles.activeMoodLabel]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 일기 작성 본문 */}
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={5}
                value={diaryContent}
                onChangeText={(val) => {
                  setDiaryContent(val)
                  if (diaryError) setDiaryError(null)
                }}
                placeholder="시술 준비 과정에서 느끼신 사소한 감정이나 몸의 변화를 차분히 남겨 보세요. 다정히 위로해 드릴게요."
                disabled={savingDiary}
              />

              {diaryError ? <Text style={styles.errorText}>⚠️ {diaryError}</Text> : null}

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveDiary} disabled={savingDiary}>
                {savingDiary ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>일기 등록 & AI 위로 편지 받기</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* AI 피드백 카드 */}
            {aiFeedback ? (
              <View style={styles.aiCard}>
                <View style={styles.aiHeader}>
                  <Text style={styles.aiHeaderTitle}>💌 AI 동반자가 보낸 편지</Text>
                </View>
                <Text style={styles.aiFeedback}>{aiFeedback}</Text>
                <Text style={styles.aiNotice}>
                  * 이 응원은 자가 일기 분석에 따른 멘탈 케어로, 의학적 해석을 대체하지 않습니다.
                </Text>
              </View>
            ) : null}

            {/* 과거 마음 목록 */}
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>📅 과거의 마음 기록들</Text>
              {diaries.length > 0 ? (
                diaries.map((d, i) => (
                  <View key={d.id || i} style={styles.historyItem}>
                    <View style={styles.historyHeaderRow}>
                      <Text style={styles.historyMood}>
                        {d.mood === 'great' && '😄 행복'}
                        {d.mood === 'good' && '😊 평온'}
                        {d.mood === 'neutral' && '😐 보통'}
                        {d.mood === 'sad' && '😢 슬픔'}
                        {d.mood === 'anxious' && '😰 불안'}
                        {d.mood === 'hopeful' && '💫 기대'}
                      </Text>
                      <Text style={styles.historyDate}>{d.date}</Text>
                    </View>
                    <Text style={styles.historyContent}>{d.content}</Text>
                    {d.aiAnalysis ? (
                      <View style={styles.historyAiBox}>
                        <Text style={styles.historyAiText}>💌 {d.aiAnalysis}</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>과거의 마음 기록이 없습니다.</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 호르몬 수치 등록용 모달 */}
      <Modal visible={isHormoneModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>기록 수치 추가 🧬</Text>
              <TouchableOpacity onPress={() => setIsHormoneModalOpen(false)}>
                <Text style={styles.closeBtnText}>닫기</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>기록 날짜 (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={recordedAt}
                  onChangeText={setRecordedAt}
                  placeholder="예: 2026-05-23"
                />
              </View>

              {profile?.treatmentStage === 'natural' ? (
                <>
                  {/* 자연임신 지표 (전면 노출) */}
                  <View style={{ backgroundColor: '#fff5f5', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#ffe4e6', marginBottom: 12, gap: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#881337' }}>🌱 홈케어 지표 기록 (자연임신)</Text>
                    
                    <View style={styles.gridInputs}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>기초체온 (°C)</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: '#fff' }]}
                          value={bbt}
                          onChangeText={setBbt}
                          keyboardType="numeric"
                          placeholder="예: 36.45"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>배란테스트기 (0~10)</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: '#fff' }]}
                          value={opkIndex}
                          onChangeText={setOpkIndex}
                          keyboardType="numeric"
                          placeholder="0 ~ 10"
                        />
                      </View>
                    </View>

                    <View style={styles.gridInputs}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>몸무게 (kg)</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: '#fff' }]}
                          value={weight}
                          onChangeText={setWeight}
                          keyboardType="numeric"
                          placeholder="예: 50"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>수면 시간 (시간)</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: '#fff' }]}
                          value={sleepHours}
                          onChangeText={setSleepHours}
                          keyboardType="numeric"
                          placeholder="예: 8"
                        />
                      </View>
                    </View>

                    <View>
                      <Text style={styles.inputLabel}>자궁경부점액 상태</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[
                          { value: 'dry', label: '건조' },
                          { value: 'sticky', label: '끈적' },
                          { value: 'creamy', label: '크림' },
                          { value: 'eggwhite', label: '흰자' }
                        ].map((item) => (
                          <TouchableOpacity
                            key={item.value}
                            style={{
                              flex: 1,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              backgroundColor: cervicalMucus === item.value ? '#e11d48' : '#fff',
                              borderColor: cervicalMucus === item.value ? '#e11d48' : '#ffe4e6',
                              alignItems: 'center'
                            }}
                            onPress={() => setCervicalMucus(cervicalMucus === item.value ? '' : item.value as any)}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: cervicalMucus === item.value ? '#fff' : '#9f1239' }}>{item.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* 병원 호르몬 수치 아코디언 */}
                  <View style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 18, overflow: 'hidden', marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setShowHospitalHormones(!showHospitalHormones)}
                      style={{ padding: 12, backgroundColor: '#f9fafb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563' }}>🏥 상세 병원 검사 결과 (호르몬) 추가</Text>
                      <Text style={{ fontSize: 10, color: '#9ca3af' }}>{showHospitalHormones ? '접기 ▲' : '펼치기 ▼'}</Text>
                    </TouchableOpacity>
                    {showHospitalHormones && (
                      <View style={{ padding: 12, backgroundColor: '#fff', gap: 10 }}>
                        <View style={styles.gridInputs}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: '#6b7280' }]}>AMH</Text>
                            <TextInput
                              style={styles.input}
                              value={amh}
                              onChangeText={setAmh}
                              keyboardType="numeric"
                              placeholder="예: 1.8"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: '#6b7280' }]}>FSH</Text>
                            <TextInput
                              style={styles.input}
                              value={fsh}
                              onChangeText={setFsh}
                              keyboardType="numeric"
                              placeholder="예: 8.5"
                            />
                          </View>
                        </View>
                        <View style={styles.gridInputs}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: '#6b7280' }]}>LH</Text>
                            <TextInput
                              style={styles.input}
                              value={lh}
                              onChangeText={setLh}
                              keyboardType="numeric"
                              placeholder="예: 5.2"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: '#6b7280' }]}>E2</Text>
                            <TextInput
                              style={styles.input}
                              value={estradiol}
                              onChangeText={setEstradiol}
                              keyboardType="numeric"
                              placeholder="예: 42.0"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: '#6b7280' }]}>PROG</Text>
                            <TextInput
                              style={styles.input}
                              value={progesterone}
                              onChangeText={setProgesterone}
                              keyboardType="numeric"
                              placeholder="예: 1.2"
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <>
                  {/* 호르몬 수치 (전면 노출) */}
                  <View style={styles.gridInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>AMH (ng/mL)</Text>
                      <TextInput
                        style={styles.input}
                        value={amh}
                        onChangeText={setAmh}
                        keyboardType="numeric"
                        placeholder="예: 1.8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>FSH (mIU/mL)</Text>
                      <TextInput
                        style={styles.input}
                        value={fsh}
                        onChangeText={setFsh}
                        keyboardType="numeric"
                        placeholder="예: 8.5"
                      />
                    </View>
                  </View>

                  <View style={styles.gridInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>LH (mIU/mL)</Text>
                      <TextInput
                        style={styles.input}
                        value={lh}
                        onChangeText={setLh}
                        keyboardType="numeric"
                        placeholder="예: 5.2"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>E2 (pg/mL)</Text>
                      <TextInput
                        style={styles.input}
                        value={estradiol}
                        onChangeText={setEstradiol}
                        keyboardType="numeric"
                        placeholder="예: 42.0"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>PROG (ng/mL)</Text>
                      <TextInput
                        style={styles.input}
                        value={progesterone}
                        onChangeText={setProgesterone}
                        keyboardType="numeric"
                        placeholder="예: 1.2"
                      />
                    </View>
                  </View>

                  {/* 자연임신 지표 아코디언 */}
                  <View style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 18, overflow: 'hidden', marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setShowNaturalIndicators(!showNaturalIndicators)}
                      style={{ padding: 12, backgroundColor: '#f9fafb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563' }}>🌱 홈케어 지표 (체온, 배테기, 몸무게, 수면) 추가</Text>
                      <Text style={{ fontSize: 10, color: '#9ca3af' }}>{showNaturalIndicators ? '접기 ▲' : '펼치기 ▼'}</Text>
                    </TouchableOpacity>
                    {showNaturalIndicators && (
                      <View style={{ padding: 12, backgroundColor: '#fff', gap: 10 }}>
                        <View style={styles.gridInputs}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: '#6b7280' }]}>기초체온 (°C)</Text>
                            <TextInput
                              style={styles.input}
                              value={bbt}
                              onChangeText={setBbt}
                              keyboardType="numeric"
                              placeholder="예: 36.45"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: '#6b7280' }]}>배테기 (0~10)</Text>
                            <TextInput
                              style={styles.input}
                              value={opkIndex}
                              onChangeText={setOpkIndex}
                              keyboardType="numeric"
                              placeholder="0 ~ 10"
                            />
                          </View>
                        </View>
                        
                        <View style={styles.gridInputs}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: '#6b7280' }]}>몸무게 (kg)</Text>
                            <TextInput
                              style={styles.input}
                              value={weight}
                              onChangeText={setWeight}
                              keyboardType="numeric"
                              placeholder="예: 50"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: '#6b7280' }]}>수면 시간 (시간)</Text>
                            <TextInput
                              style={styles.input}
                              value={sleepHours}
                              onChangeText={setSleepHours}
                              keyboardType="numeric"
                              placeholder="예: 8"
                            />
                          </View>
                        </View>

                        <View>
                          <Text style={[styles.inputLabel, { color: '#6b7280' }]}>자궁경부점액 상태</Text>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {[
                              { value: 'dry', label: '건조' },
                              { value: 'sticky', label: '끈적' },
                              { value: 'creamy', label: '크림' },
                              { value: 'eggwhite', label: '흰자' }
                            ].map((item) => (
                              <TouchableOpacity
                                key={item.value}
                                style={{
                                  flex: 1,
                                  paddingVertical: 8,
                                  borderRadius: 10,
                                  borderWidth: 1,
                                  backgroundColor: cervicalMucus === item.value ? '#e11d48' : '#fff',
                                  borderColor: cervicalMucus === item.value ? '#e11d48' : '#ffe4e6',
                                  alignItems: 'center'
                                }}
                                onPress={() => setCervicalMucus(cervicalMucus === item.value ? '' : item.value as any)}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '700', color: cervicalMucus === item.value ? '#fff' : '#9f1239' }}>{item.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* 시술 수치 입력 영역 (ivf, fet 단계인 경우 노출) */}
                  {(profile?.treatmentStage === 'ivf' || profile?.treatmentStage === 'fet') && (
                    <View style={{ backgroundColor: '#e0e7ff', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#c7d2fe', marginBottom: 12, gap: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e3a8a' }}>💉 시술 지표 기록 (시험관/동결이식)</Text>
                      <View style={styles.gridInputs}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { color: '#1e3a8a' }]}>난포 크기 (mm)</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: '#fff', borderColor: '#c7d2fe' }]}
                            value={follicleSize}
                            onChangeText={setFollicleSize}
                            keyboardType="numeric"
                            placeholder="예: 18.5"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { color: '#1e3a8a' }]}>자궁내막 두께 (mm)</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: '#fff', borderColor: '#c7d2fe' }]}
                            value={endometriumThickness}
                            onChangeText={setEndometriumThickness}
                            keyboardType="numeric"
                            placeholder="예: 8.2"
                          />
                        </View>
                      </View>
                      <View style={styles.gridInputs}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { color: '#1e3a8a' }]}>채취 난자 수</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: '#fff', borderColor: '#c7d2fe' }]}
                            value={retrievedOocytesCount}
                            onChangeText={setRetrievedOocytesCount}
                            keyboardType="numeric"
                            placeholder="예: 8"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { color: '#1e3a8a' }]}>수정란 등급</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: '#fff', borderColor: '#c7d2fe' }]}
                            value={embryoGrade}
                            onChangeText={setEmbryoGrade}
                            placeholder="예: AA"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.inputLabel, { color: '#1e3a8a' }]}>hCG 수치</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: '#fff', borderColor: '#c7d2fe' }]}
                            value={hcgLevel}
                            onChangeText={setHcgLevel}
                            keyboardType="numeric"
                            placeholder="예: 150"
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>메모 / 특이사항</Text>
                <TextInput
                  style={[styles.input, styles.inputTextArea]}
                  value={hormoneNotes}
                  onChangeText={setHormoneNotes}
                  multiline
                  numberOfLines={3}
                  placeholder="측정 시각, 병원명, 몸 상태 등 특이사항 입력"
                />
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleHormoneSubmit}
                disabled={savingHormone}
              >
                {savingHormone ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>수치 저장하기</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: '#fff1f2' },
  container: { flex: 1 },
  contentContainer: { padding: 16, gap: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff1f2' },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#fff5f5',
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  switcherTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSwitcherTab: {
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#ff8fab',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  switcherTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9c1c3f',
  },
  activeSwitcherTabText: {
    color: '#e11d48',
  },
  tabContent: { gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#881337' },
  subtitle: { fontSize: 10, color: '#fda4af', marginTop: 2 },
  addBtn: { backgroundColor: '#e11d48', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tabsContainer: { flexDirection: 'row', paddingVertical: 4 },
  tab: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    marginRight: 8,
  },
  activeTab: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  tabText: { fontSize: 10, fontWeight: '700', color: '#9f1239' },
  activeTabText: { color: '#fff' },
  chartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#ffe4e6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  cardUnit: { fontSize: 10, color: '#9ca3af' },
  gaugeContainer: { marginTop: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  gaugeValue: { fontSize: 32, fontWeight: '700', color: '#9f1239' },
  changeText: { fontSize: 10, fontWeight: '600' },
  textUp: { color: '#e11d48' },
  textDown: { color: '#2563eb' },
  gaugeBg: { width: '100%', height: 12, backgroundColor: '#ffe4e6', borderRadius: 6, overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: '#e11d48', borderRadius: 6 },
  gaugeMinMax: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  limitText: { fontSize: 9, color: '#9ca3af' },
  emptyChart: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  infoCard: { backgroundColor: '#fff5f5', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#ffe4e6', gap: 8 },
  infoTitle: { fontSize: 12, fontWeight: '700', color: '#881337' },
  infoDesc: { fontSize: 11, color: '#9f1239', lineHeight: 16 },
  normalRangeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  rangeLabel: { fontSize: 10, fontWeight: '700', color: '#be123c' },
  rangeVal: { fontSize: 10, fontWeight: '700', color: '#e11d48' },
  historyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#ffe4e6' },
  historyTitle: { fontSize: 12, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  historyItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyDate: { fontSize: 11, fontWeight: '700', color: '#374151' },
  historyNotes: { fontSize: 10, color: '#9ca3af', fontStyle: 'italic', maxWidth: '60%' },
  historyValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  valPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  valPillLabel: { fontSize: 8, fontWeight: '700', color: '#9ca3af' },
  valPillVal: { fontSize: 9, fontWeight: '700', color: '#4b5563' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#881337' },
  closeBtnText: { fontSize: 11, color: '#9ca3af' },
  formContainer: { gap: 14 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#9f1239', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ffe4e6',
    backgroundColor: '#fff5f5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#374151',
  },
  gridInputs: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  inputTextArea: { height: 70, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#e11d48',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#ffe4e6', gap: 14 },
  cardPrompt: { fontSize: 12, fontWeight: '700', color: '#1f2937' },
  moodGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  moodBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe4e6',
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4
  },
  activeMoodBtn: { backgroundColor: '#ffe4e6', borderColor: '#fda4af' },
  moodIcon: { fontSize: 20 },
  moodLabel: { fontSize: 9, fontWeight: '700', color: '#9c1c3f' },
  activeMoodLabel: { color: '#9f1239', fontWeight: '800' },
  textArea: {
    borderWidth: 1,
    borderColor: '#ffe4e6',
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    padding: 14,
    fontSize: 12,
    color: '#374151',
    height: 100,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  errorText: { fontSize: 10, color: '#dc2626' },
  aiCard: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center' },
  aiHeaderTitle: { fontSize: 12, fontWeight: '700', color: '#881337' },
  aiFeedback: {
    fontSize: 12,
    color: '#9f1239',
    lineHeight: 18,
    fontWeight: '700',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#fca5a5',
  },
  aiNotice: { fontSize: 8, color: '#fda4af', textAlign: 'right' },
  historyMood: { fontSize: 12, fontWeight: '700', color: '#374151' },
  historyContent: { fontSize: 11, color: '#4b5563', lineHeight: 16, backgroundColor: '#f9fafb', padding: 10, borderRadius: 10 },
  historyAiBox: { backgroundColor: '#fff5f5', padding: 10, borderRadius: 10, borderWidth: 0.5, borderColor: '#ffe4e6' },
  historyAiText: { fontSize: 10, color: '#9f1239', lineHeight: 15 },
  subTabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    backgroundColor: '#fff',
  },
  activeSubTabButton: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  subTabButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9f1239',
  },
  activeSubTabButtonText: {
    color: '#fff',
  },
  dailyRecordContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    gap: 12,
  },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fff5f5',
  },
  dailyRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#881337',
  },
  dailyInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#fca5a5',
    width: 60,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: '#881337',
    paddingVertical: 2,
  },
  dailyInputUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#881337',
  },
  opkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    backgroundColor: '#fff5f5',
  },
  opkBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#be123c',
  },
  nudgeBanner: {
    flexDirection: 'row',
    backgroundColor: '#fff0f3',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    alignItems: 'center',
    gap: 8,
  },
  nudgeEmoji: {
    fontSize: 14,
  },
  nudgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#be123c',
    flex: 1,
    lineHeight: 16,
  },
  lockOverlay: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 280,
  },
  lockIcon: {
    fontSize: 32,
  },
  lockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#881337',
    textAlign: 'center',
  },
  lockDesc: {
    fontSize: 11,
    color: '#fda4af',
    textAlign: 'center',
    lineHeight: 16,
  },
  upgradeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 8,
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  procedureInfoBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  procedureInfoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#312e81',
  },
  procedureInfoVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4338ca',
  },
})
