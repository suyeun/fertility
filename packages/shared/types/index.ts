// ============================
// 공유 타입 정의
// apps/web 과 apps/mobile 둘 다 import해서 사용
// ============================

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

export interface CycleDay {
  date: string        // YYYY-MM-DD
  phase: CyclePhase
  isOvulation: boolean
  isFertileWindow: boolean
  isMenstruation: boolean
  dayOfCycle: number
}

export interface MenstrualCycle {
  id: string
  userId: string
  startDate: string
  endDate?: string
  cycleLength: number   // 평균 주기 (일)
  periodLength: number  // 생리 기간 (일)
  notes?: string
  createdAt: string
}

export interface HormoneRecord {
  id: string
  userId: string
  recordedAt: string
  amh?: number        // AMH (ng/mL)
  fsh?: number        // FSH (mIU/mL)
  lh?: number         // LH (mIU/mL)
  estradiol?: number  // 에스트라디올 (pg/mL)
  progesterone?: number // 황체호르몬 (ng/mL)
  bbt?: number        // 기초체온 (Basal Body Temperature)
  opkIndex?: number   // 배란테스트기 수치 (0 ~ 10)
  cervicalMucus?: 'dry' | 'sticky' | 'creamy' | 'eggwhite' // 자궁경부점액
  weight?: number     // 몸무게 (kg)
  sleepHours?: number // 수면 시간 (hours)
  
  // 시술 수치 추가
  follicleSize?: number          // 난포 크기 (mm)
  endometriumThickness?: number  // 자궁내막 두께 (mm)
  retrievedOocytesCount?: number // 채취 난자 수 (개)
  embryoGrade?: string           // 수정란 등급 (예: A, 1등급)
  hcgLevel?: number              // hCG 임신 수치 (mIU/mL)
  
  intercourse?: boolean          // 부부 관계 여부
  
  notes?: string
}

export type TreatmentType = 'IVF' | 'IUI' | 'FET' | 'monitoring' | 'other'
export type TreatmentStatus = 'scheduled' | 'completed' | 'cancelled'

export interface TreatmentSchedule {
  id: string
  userId: string
  type: TreatmentType
  title: string
  scheduledAt: string
  status: TreatmentStatus
  hospitalName?: string
  notes?: string
  medications?: Medication[]
}

export interface Medication {
  name: string
  dose: string
  times: string[]   // ['08:00', '20:00']
  startDate: string
  endDate?: string
}

export type Mood = 'great' | 'good' | 'neutral' | 'sad' | 'anxious' | 'hopeful'

export interface DiaryEntry {
  id: string
  userId: string
  date: string
  mood: Mood
  content: string
  aiAnalysis?: string   // Claude가 분석한 감정 패턴
  createdAt: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  dateOfBirth?: string
  partnerName?: string
  treatmentStage?: 'natural' | 'iui' | 'ivf' | 'fet' | 'pregnant'
  averageCycleLength: number    // 기본값: 28
  averagePeriodLength: number   // 기본값: 5
  subscriptionStatus: 'trial' | 'active' | 'cancelled'
  trialEndsAt?: string
  createdAt: string
}

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ============================
// 비밀 대화방 타입
// ============================

export type SecretTopicTag = 'pain' | 'relationship' | 'procedure' | 'mental' | 'contraception' | 'etc'

export interface SecretPost {
  id: string
  authorToken: string   // hash(uid) — 작성자 식별용, 절대 화면 미표시
  anonymousName: string // 화면에 표시되는 익명 닉네임
  topicTag: SecretTopicTag
  content: string
  likes: string[]       // authorToken 배열 (uid 미포함)
  commentsCount: number
  createdAt: string
}

export interface SecretComment {
  id: string
  postId: string
  authorToken: string
  anonymousName: string
  isAuthor: boolean     // 댓글 작성자 = 포스트 작성자 여부
  content: string
  createdAt: string
}
