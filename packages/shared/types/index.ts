// ============================
// 공유 타입 정의
// apps/web 과 apps/mobile 둘 다 import해서 사용
// ============================

// ============================
// PDF 리포트 명칭 상수
// 의료법상 '소견서', '진단서', '진단 참고서' 사용 금지
// 반드시 '개인 건강 기록지(PHR)' 또는 '자가 기록 데이터 요약본'으로 표기
// ============================
export const PDF_REPORT = {
  // 타이틀 (UI 표시, 파일명, PDF 헤더 공통)
  TITLE_NATURAL:  '개인 건강 기록지 (PHR) — 자연 임신 준비 데이터',
  TITLE_CLINIC:   '개인 건강 기록지 (PHR) — 시술 경과 자가 기록',

  // 부제목
  SUBTITLE:       '자가 기록 데이터 요약본 | BOM 앱 기록 기반',

  // 파일명 (다운로드 시)
  FILENAME_NATURAL: 'BOM_PHR_자연임신준비',
  FILENAME_CLINIC:  'BOM_PHR_시술기록',

  // PDF 하단 면책 고지 (필수 표기)
  DISCLAIMER: '본 문서는 사용자가 BOM 앱에 직접 입력한 자가 기록 데이터의 정돈된 요약본입니다. '
    + '의료 소견서·진단서·처방전이 아니며, 의료적 판단의 근거로 사용될 수 없습니다. '
    + '정확한 진단과 치료는 반드시 담당 전문의와 상담하시기 바랍니다.',

  // 병원 제출용 안내 문구
  HOSPITAL_NOTE: '※ 이 기록지는 환자 본인이 직접 작성·관리한 개인 건강 기록(PHR)입니다. '
    + '진료 참고 자료로 활용하실 수 있습니다.',
} as const

// ============================
// 치료 모드 & 단계 타입
// ============================

export type TreatmentMode = 'natural' | 'iui' | 'ivf'

export type IUIStage =
  | 'stimulation'   // 과배란 유도기
  | 'monitoring'    // 배란 모니터링
  | 'procedure'     // 시술일
  | 'luteal'        // 황체기 / 착상 대기
  | 'result'        // 판정

export type IVFStage =
  | 'stimulation'   // 과배란 유도기
  | 'monitoring'    // 난포 모니터링
  | 'retrieval'     // 난자 채취
  | 'culture'       // 수정 / 배양
  | 'transfer'      // 배아 이식
  | 'luteal'        // 황체기 / 착상 대기
  | 'result'        // 판정 (β-hCG)

export type CurrentStage = IUIStage | IVFStage | null

// ============================

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

// 캘린더 이벤트 구분 — 모드 스위칭 시 데이터 연속성 보장
export type CalendarEventType =
  | 'period'          // 생리
  | 'ovulation'       // 배란 예정
  | 'fertile'         // 가임기
  | 'intercourse'     // 부부관계 (자연임신 모드)
  | 'opk_peak'        // OPK 피크
  | 'clinic_retrieval'   // 난자 채취 (시술 모드)
  | 'clinic_transfer'    // 이식 (시술 모드)
  | 'clinic_monitoring'  // 모니터링 방문 (시술 모드)
  | 'medication'      // 약물 복용 (공통)

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
  
  // 시술 수치 (기존)
  follicleSize?: number          // 난포 크기 (mm) — 레거시
  endometriumThickness?: number  // 자궁내막 두께 (mm) — 레거시
  retrievedOocytesCount?: number // 채취 난자 수 (개) — 레거시
  embryoGrade?: string           // 수정란 등급 — 레거시
  hcgLevel?: number              // β-hCG 수치 (mIU/mL)

  // IUI 자극기
  injectionDrug?: string         // 주사 종류
  injectionDose?: number         // 주사 용량 (IU)
  follicleCount?: number         // 난포 개수 (IUI 자극)

  // IUI 모니터링
  maxFollicle?: number           // 최대 난포 크기 (mm)
  opkResult?: string             // OPK 결과 (negative/positive/strong)

  // IUI 황체기
  suppType?: string              // 황체 보강제 종류
  symptoms?: string              // 증상 (쉼표 구분 또는 JSON)

  // IUI 결과
  judgmentResult?: string        // 판정 결과

  // IVF 자극기
  follicleRight?: number         // 우측 난포 수
  follicleLeft?: number          // 좌측 난포 수

  // IVF 모니터링
  mature18Plus?: number          // 18mm 이상 난포 수

  // IVF 채취
  totalOocytes?: number          // 채취 총 난자 수
  matureOocytes?: number         // 성숙 난자 수 (MII)
  condition?: number             // 당일 컨디션 (1-10 슬라이더)

  // IVF 배양
  twoPN?: number                 // 2PN 수 (정상 수정)
  day3Embryo?: number            // Day3 배아 수
  blastocyst?: number            // 배반포 수
  frozenEmbryo?: number          // 냉동 배아 수

  // IVF 이식
  transferredEmbryos?: number    // 이식 배아 수
  transferMethod?: string        // 이식 방법 (fresh/frozen)

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

export type Mood = 'great' | 'good' | 'excited' | 'hopeful' | 'neutral' | 'tired' | 'anxious' | 'sad' | 'angry' | 'sick'

export interface DiaryEntry {
  id: string
  userId: string
  date: string
  mood: Mood
  content: string
  aiAnalysis?: string   // Claude가 분석한 감정 패턴
  createdAt: string
}

// 앱의 핵심 모드: 자연임신 준비 vs 병원 시술
export type UserMode = 'NATURAL' | 'CLINIC'

export interface UserProfile {
  id: string
  email: string
  name: string
  dateOfBirth?: string
  partnerName?: string
  currentMode: UserMode              // 현재 앱 모드 (기본값: 'NATURAL')
  treatmentStage?: 'natural' | 'iui' | 'ivf' | 'fet' | 'pregnant'
  averageCycleLength: number    // 기본값: 28
  averagePeriodLength: number   // 기본값: 5
  subscriptionStatus: 'trial' | 'active' | 'cancelled'
  trialEndsAt?: string
  subscriptionExpiresAt?: string  // RevenueCat CANCELLATION 이후 실제 만료일
  createdAt: string
}

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ============================
// 커뮤니티 타입 (통합 카테고리 + 필터 태그)
// ============================

export type PostCategory = 'DAILY' | 'CLINIC' | 'INFO'
export type PostTargetMode = 'ALL' | 'NATURAL' | 'CLINIC'

export type PostTag =
  // DAILY (자유수다/일상) → ALL
  | '#감정토닥'
  | '#남편_시댁'
  | '#아무말'
  // CLINIC (시험관/시술) → CLINIC 전용
  | '#시험관_신선'
  | '#시험관_동결'
  | '#인공수정'
  | '#병원추천'
  // INFO (꿀팁/정보공유) → NATURAL or ALL
  | '#배테기_기초체온'
  | '#영양제추천'
  | '#운동_식단'

// 태그 → targetMode 자동 매핑 (글 저장 시 서버에서 세팅)
export const TAG_META: Record<PostTag, { category: PostCategory; targetMode: PostTargetMode }> = {
  '#감정토닥':       { category: 'DAILY',  targetMode: 'ALL'     },
  '#남편_시댁':      { category: 'DAILY',  targetMode: 'ALL'     },
  '#아무말':         { category: 'DAILY',  targetMode: 'ALL'     },
  '#시험관_신선':    { category: 'CLINIC', targetMode: 'CLINIC'  },
  '#시험관_동결':    { category: 'CLINIC', targetMode: 'CLINIC'  },
  '#인공수정':       { category: 'CLINIC', targetMode: 'CLINIC'  },
  '#병원추천':       { category: 'CLINIC', targetMode: 'CLINIC'  },
  '#배테기_기초체온':{ category: 'INFO',   targetMode: 'NATURAL' },
  '#영양제추천':     { category: 'INFO',   targetMode: 'ALL'     },
  '#운동_식단':      { category: 'INFO',   targetMode: 'ALL'     },
}

// 카테고리 탭 순서 — 유저 모드에 따라 동적 정렬
export const CATEGORY_ORDER: Record<UserMode, PostCategory[]> = {
  NATURAL: ['DAILY', 'INFO', 'CLINIC'],
  CLINIC:  ['CLINIC', 'DAILY', 'INFO'],
}

export const CATEGORY_LABEL: Record<PostCategory, { label: string; emoji: string }> = {
  DAILY:  { label: '자유수다/일상',   emoji: '💬' },
  CLINIC: { label: '시험관/시술',     emoji: '🧬' },
  INFO:   { label: '꿀팁/정보공유',   emoji: '💡' },
}

// 카테고리별 익명 여부 — 전체 익명 (프라이버시 보호 정책)
export const CATEGORY_ANONYMOUS: Record<PostCategory, boolean> = {
  DAILY:  true,   // 익명 (감정토닥, 남편/시댁 등 민감 주제)
  CLINIC: true,   // 익명 (시술 이야기)
  INFO:   true,   // 익명 (신체 데이터 질문 부담 완화)
}

export interface CommunityPost {
  id: string
  authorToken: string
  authorName: string      // 실명 or 익명 닉네임 (카테고리에 따라 결정)
  isAnonymous: boolean    // true면 익명 닉네임, false면 실명
  category: PostCategory
  tag: PostTag
  targetMode: PostTargetMode
  content: string
  commentsCount: number
  reactions: { cheer: string[]; empathy: string[]; pray: string[] }
  createdAt: string
  isDeleted?: boolean
}

export interface CommunityComment {
  id: string
  postId: string
  authorToken: string
  authorName: string
  isAnonymous: boolean
  isAuthor: boolean
  content: string
  createdAt: string
}

// ============================
// 비밀 대화방 타입 (레거시 유지)
// ============================

export type SecretTopicTag =
  | 'retrieval'      // 채취 후기
  | 'transfer'       // 이식 후기
  | 'waiting'        // 결과 대기중 (β-hCG)
  | 'luteal'         // 황체기 증상
  | 'stimulation'    // 과배란 유도 중
  | 'mental'         // 멘탈 관리
  | 'relationship'   // 부부/주변 관계
  | 'etc'            // 기타

// 반응 타입 (좋아요 대신)
export type ReactionType = 'cheer' | 'empathy' | 'pray'

export interface Reactions {
  cheer: string[]    // 응원해요 💪
  empathy: string[]  // 공감해요 🤗
  pray: string[]     // 같이기도 🙏
}

export interface SecretPost {
  id: string
  authorToken: string
  anonymousName: string
  topicTag: SecretTopicTag
  content: string
  likes: string[]        // 레거시 (하위 호환)
  reactions?: Reactions  // 신규 반응
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
