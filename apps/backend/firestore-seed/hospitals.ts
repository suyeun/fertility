/**
 * Firestore 병원 + 아티클 시드 데이터 업로드 스크립트
 *
 * 실행 방법:
 *   npx ts-node --project tsconfig.json apps/backend/firestore-seed/hospitals.ts
 *
 * 환경변수 필요:
 *   FIREBASE_SERVICE_ACCOUNT_JSON 또는 GOOGLE_APPLICATION_CREDENTIALS
 */

import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

// Firebase 초기화
function initFirebase() {
  if (admin.apps.length) return admin.firestore()

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (serviceAccountJson) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    })
  } else {
    // GOOGLE_APPLICATION_CREDENTIALS 환경변수 방식
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
  }
  return admin.firestore()
}

// ── 병원 시드 데이터 ─────────────────────────────────────
const HOSPITALS = [
  {
    id: 'h1', name: '차병원 강남', region: '서울',
    address: '서울 강남구 언주로 566', lat: 37.5107, lng: 127.0458,
    phone: '02-3468-3000', specialties: ['IVF', 'IUI', 'PGT'],
    avgCost: 'IVF 350~450만', rating: 4.5, reviewCount: 128,
    tags: ['대기 짧음', '의사 친절'], note: '국내 최대 난임 전문 센터',
    isVerified: true, website: 'https://www.chamc.co.kr',
  },
  {
    id: 'h2', name: '마리아병원 강남', region: '서울',
    address: '서울 강남구 도산대로 418', lat: 37.5218, lng: 127.0310,
    phone: '02-2088-6200', specialties: ['IVF', 'IUI', 'FET'],
    avgCost: 'IVF 300~400만', rating: 4.3, reviewCount: 89,
    tags: ['성공률 높음', '친절한 상담'], note: '동결이식 성공률 우수',
    isVerified: true,
  },
  {
    id: 'h3', name: '제일병원', region: '서울',
    address: '서울 중구 마장로 91', lat: 37.5638, lng: 127.0218,
    phone: '02-2000-7000', specialties: ['IVF', 'IUI'],
    avgCost: 'IVF 280~380만', rating: 4.2, reviewCount: 64,
    tags: ['합리적 비용'], note: '난임 시술 20년 이상 경력',
    isVerified: true,
  },
  {
    id: 'h4', name: '미즈메디병원', region: '서울',
    address: '서울 강서구 공항대로 389', lat: 37.5680, lng: 126.8358,
    phone: '02-2007-1700', specialties: ['IVF', 'IUI', 'FET'],
    avgCost: 'IVF 320~420만', rating: 4.4, reviewCount: 102,
    tags: ['접근성 좋음', '주차 편함'], note: '강서·김포 지역 최대 난임 센터',
    isVerified: true,
  },
  {
    id: 'h5', name: '차병원 분당', region: '경기',
    address: '경기 성남시 분당구 야탑로 59', lat: 37.4138, lng: 127.1287,
    phone: '031-780-5000', specialties: ['IVF', 'IUI', 'PGT'],
    avgCost: 'IVF 350~450만', rating: 4.5, reviewCount: 76,
    tags: ['대기 짧음'], note: '분당·판교 지역 난임 전문',
    isVerified: true,
  },
  {
    id: 'h6', name: '아이유여성병원', region: '경기',
    address: '경기 수원시 팔달구 매산로 39', lat: 37.2772, lng: 127.0135,
    phone: '031-247-7575', specialties: ['IVF', 'IUI'],
    avgCost: 'IVF 270~360만', rating: 4.1, reviewCount: 45,
    tags: ['합리적 비용', '친절'], note: '수원·용인 지역',
    isVerified: true,
  },
  {
    id: 'h7', name: '인하대병원 난임센터', region: '인천',
    address: '인천 중구 인항로 27', lat: 37.4530, lng: 126.7038,
    phone: '032-890-2600', specialties: ['IVF', 'IUI', 'FET', '남성난임'],
    avgCost: 'IVF 300~400만', rating: 4.2, reviewCount: 38,
    tags: ['남성난임 전문'], note: '인천 지역 주요 난임 센터',
    isVerified: true,
  },
  {
    id: 'h8', name: '부산대병원 난임센터', region: '부산',
    address: '부산 서구 구덕로 179', lat: 35.1031, lng: 129.0126,
    phone: '051-240-7000', specialties: ['IVF', 'IUI', 'FET'],
    avgCost: 'IVF 280~370만', rating: 4.3, reviewCount: 52,
    tags: ['체계적 관리'], note: '부산 대표 난임 전문병원',
    isVerified: true,
  },
]

// ── 아티클 시드 데이터 ────────────────────────────────────
const ARTICLES = [
  {
    id: 'a1', category: '시술 이해', title: 'IVF 시험관 시술, 처음이라면 꼭 알아야 할 5단계',
    summary: '과배란 유도 → 채취 → 수정 → 배양 → 이식까지, 각 단계에서 무엇을 준비해야 하는지 알기 쉽게 정리했어요.',
    readMin: 5, tags: ['IVF', '입문'],
    authorName: null, authorAffiliation: null,
    isVerified: true, publishedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'a2', category: '시술 이해', title: 'IUI와 IVF, 나에게 맞는 시술은?',
    summary: '인공수정과 시험관의 차이, 성공률, 비용을 비교해서 어떤 상황에 어떤 시술이 적합한지 설명해드려요.',
    readMin: 4, tags: ['IUI', 'IVF', '비교'],
    isVerified: true, publishedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'a3', category: '시술 이해', title: '동결이식(FET)이 신선배아보다 성공률이 높을 수 있는 이유',
    summary: '자궁 내막 환경, 호르몬 안정성 측면에서 FET가 왜 더 유리한 경우가 있는지 근거와 함께 설명해요.',
    readMin: 6, tags: ['FET', '성공률'],
    isVerified: true, publishedAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'a4', category: '생활 습관', title: '난임 시술 중 운동, 어느 정도까지 해도 될까?',
    summary: '시술 단계별로 권장·주의해야 할 운동 강도를 정리했어요.',
    readMin: 3, tags: ['운동', '생활'],
    isVerified: true, publishedAt: '2025-02-10T00:00:00Z',
  },
  {
    id: 'a5', category: '생활 습관', title: '수면이 난임에 영향을 미친다? 수면 호르몬과 임신의 관계',
    summary: '멜라토닌과 생식 호르몬의 연관성, 수면 부족이 배란과 착상에 미치는 영향을 알아봐요.',
    readMin: 4, tags: ['수면', '호르몬'],
    isVerified: true, publishedAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 'a6', category: '검사·수치', title: 'AMH 수치, 낮다고 포기하지 마세요',
    summary: 'AMH가 난소예비력의 전부가 아닌 이유, 낮은 AMH에서도 임신에 성공하는 방법을 정리했어요.',
    readMin: 5, tags: ['AMH', '난소예비력'],
    isVerified: true, publishedAt: '2025-03-15T00:00:00Z',
  },
  {
    id: 'a7', category: '검사·수치', title: '호르몬 검사 결과지 읽는 법 — FSH, LH, E2 완벽 정리',
    summary: '병원에서 받은 혈액검사 결과지에 있는 수치들이 무엇을 의미하는지, 정상 범위와 함께 설명해요.',
    readMin: 7, tags: ['호르몬', '혈액검사'],
    isVerified: true, publishedAt: '2025-04-01T00:00:00Z',
  },
  {
    id: 'a8', category: '심리·감정', title: '난임 치료 중 우울감, 정상인가요?',
    summary: '난임 환자의 40%가 경험하는 심리적 어려움. 이 감정이 자연스러운 이유와 혼자 버티지 않아도 되는 방법을 공유해요.',
    readMin: 4, tags: ['심리', '정서'],
    isVerified: true, publishedAt: '2025-04-15T00:00:00Z',
  },
  {
    id: 'a9', category: '심리·감정', title: '파트너와 난임을 함께 극복하는 대화법',
    summary: '시술 중 부부 갈등이 생기는 흔한 패턴과, 서로를 지지하는 구체적인 대화 방법을 소개해요.',
    readMin: 5, tags: ['부부', '소통'],
    isVerified: true, publishedAt: '2025-05-01T00:00:00Z',
  },
  {
    id: 'a10', category: '식단', title: '배란을 돕는 음식 vs 피해야 할 음식',
    summary: '항산화 식품, 엽산이 풍부한 음식, 반대로 난임에 영향을 줄 수 있는 음식과 카페인 섭취량 기준을 정리했어요.',
    readMin: 4, tags: ['식단', '배란'],
    isVerified: true, publishedAt: '2025-05-15T00:00:00Z',
    products: [
      { name: '종근당 엽산 5mg', desc: '임신 준비기 권장 고용량 엽산', platform: 'coupang', url: 'https://www.coupang.com/np/search?q=엽산+임신준비' },
      { name: '네이처메이드 엽산', desc: '천연 엽산 400mcg, 미국산', platform: 'naver', url: 'https://search.shopping.naver.com/search/all?query=네이처메이드+엽산' },
    ],
  },
]

async function seed() {
  const db = initFirebase()
  const batch = db.batch()

  console.log('🏥 병원 데이터 업로드 중...')
  for (const hospital of HOSPITALS) {
    const { id, ...rest } = hospital
    batch.set(db.collection('hospitals').doc(id), { ...rest, createdAt: new Date().toISOString() })
  }

  console.log('📄 아티클 데이터 업로드 중...')
  for (const article of ARTICLES) {
    const { id, ...rest } = article
    batch.set(db.collection('medical_articles').doc(id), rest)
  }

  await batch.commit()
  console.log(`✅ 병원 ${HOSPITALS.length}개, 아티클 ${ARTICLES.length}개 업로드 완료!`)
}

seed().catch(err => {
  console.error('Seed 실패:', err)
  process.exit(1)
})
