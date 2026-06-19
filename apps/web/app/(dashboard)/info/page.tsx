'use client'

import { useState, useEffect } from 'react'
import { Phone, ChevronDown, ChevronUp, ExternalLink, ShoppingBag } from 'lucide-react'
import { infoApi, type AffiliateProductsMap } from '@fertility/shared'

// ── 병원 데이터 ───────────────────────────────────────────────────
const REGIONS = ['전체', '서울', '경기', '인천', '부산', '대구', '대전', '광주', '기타']

const HOSPITALS = [
  {
    id: '1', name: '차병원 강남', region: '서울',
    address: '서울 강남구 언주로 566',
    specialties: ['IVF', 'IUI', 'PGT'],
    phone: '02-3468-3000',
    avgCost: 'IVF 350~450만',
    rating: 4.5, reviewCount: 128,
    tags: ['대기 짧음', '의사 친절'],
    note: '국내 최대 난임 전문 센터',
  },
  {
    id: '2', name: '마리아병원 강남', region: '서울',
    address: '서울 강남구 도산대로 418',
    specialties: ['IVF', 'IUI', 'FET'],
    phone: '02-2088-6200',
    avgCost: 'IVF 300~400만',
    rating: 4.3, reviewCount: 89,
    tags: ['성공률 높음', '친절한 상담'],
    note: '동결이식 성공률 우수',
  },
  {
    id: '3', name: '제일병원', region: '서울',
    address: '서울 중구 마장로 91',
    specialties: ['IVF', 'IUI'],
    phone: '02-2000-7000',
    avgCost: 'IVF 280~380만',
    rating: 4.2, reviewCount: 64,
    tags: ['합리적 비용'],
    note: '난임 시술 20년 이상 경력',
  },
  {
    id: '4', name: '미즈메디병원', region: '서울',
    address: '서울 강서구 공항대로 389',
    specialties: ['IVF', 'IUI', 'FET'],
    phone: '02-2007-1700',
    avgCost: 'IVF 320~420만',
    rating: 4.4, reviewCount: 102,
    tags: ['접근성 좋음', '주차 편함'],
    note: '강서·김포 지역 최대 난임 센터',
  },
  {
    id: '5', name: '차병원 분당', region: '경기',
    address: '경기 성남시 분당구 야탑로 59',
    specialties: ['IVF', 'IUI', 'PGT'],
    phone: '031-780-5000',
    avgCost: 'IVF 350~450만',
    rating: 4.5, reviewCount: 76,
    tags: ['대기 짧음'],
    note: '분당·판교 지역 난임 전문',
  },
  {
    id: '6', name: '아이유여성병원', region: '경기',
    address: '경기 수원시 팔달구 매산로 39',
    specialties: ['IVF', 'IUI'],
    phone: '031-247-7575',
    avgCost: 'IVF 270~360만',
    rating: 4.1, reviewCount: 45,
    tags: ['합리적 비용', '친절'],
    note: '수원·용인 지역',
  },
]

// ── 비용 데이터 ───────────────────────────────────────────────────
const COST_INFO = [
  { title: '인공수정 (IUI)',    gov: '3회까지 지원',          selfPay: '20~50만원/회',   note: '건강보험 적용 시 본인부담 약 20~30%' },
  { title: '체외수정 (IVF)',    gov: '신선배아 9회, 동결배아 7회', selfPay: '300~500만원/회', note: '지원 후 본인부담 약 30~50%' },
  { title: '동결이식 (FET)',    gov: 'IVF 지원 횟수에 포함',   selfPay: '70~150만원/회',  note: '신선배아보다 비용 낮음' },
]

const STEPS = [
  { step: '1', label: '난임 진단서 발급',   desc: '난임 전문의에게 진단서 발급' },
  { step: '2', label: '주민센터 방문 신청', desc: '또는 복지로 온라인 신청' },
  { step: '3', label: '지원 결정 통보',     desc: '소득 확인 후 보통 2~3주 소요' },
  { step: '4', label: '시술 후 비용 청구',  desc: '지정 의료기관에서 급여 적용' },
]

// ── 정보 아티클 데이터 ────────────────────────────────────────────
const INFO_CATEGORIES = ['전체', '시술 이해', '생활 습관', '검사·수치', '심리·감정', '식단']

const CATEGORY_META: Record<string, { emoji: string; bgColor: string; textColor: string; badgeColor: string }> = {
  '시술 이해': { emoji: '🔬', bgColor: 'bg-violet-50', textColor: 'text-violet-700', badgeColor: 'bg-violet-100' },
  '생활 습관': { emoji: '🌿', bgColor: 'bg-green-50',  textColor: 'text-green-700',  badgeColor: 'bg-green-100'  },
  '검사·수치': { emoji: '📊', bgColor: 'bg-sky-50',    textColor: 'text-sky-700',    badgeColor: 'bg-sky-100'    },
  '심리·감정': { emoji: '💙', bgColor: 'bg-pink-50',   textColor: 'text-pink-700',   badgeColor: 'bg-pink-100'   },
  '식단':      { emoji: '🥗', bgColor: 'bg-amber-50',  textColor: 'text-amber-700',  badgeColor: 'bg-amber-100'  },
}

interface Article {
  id: string
  category: string
  title: string
  summary: string
  readMin: number
  tags: string[]
  products?: AffiliateProduct[]
}

const ARTICLES: Article[] = [
  {
    id: 'a1', category: '시술 이해',
    title: 'IVF 시험관 시술, 처음이라면 꼭 알아야 할 5단계',
    summary: '과배란 유도 → 채취 → 수정 → 배양 → 이식까지, 각 단계에서 무엇을 준비해야 하는지 알기 쉽게 정리했어요.',
    readMin: 5, tags: ['IVF', '입문'],
  },
  {
    id: 'a2', category: '시술 이해',
    title: 'IUI와 IVF, 나에게 맞는 시술은?',
    summary: '인공수정과 시험관의 차이, 성공률, 비용을 비교해서 어떤 상황에 어떤 시술이 적합한지 설명해드려요.',
    readMin: 4, tags: ['IUI', 'IVF', '비교'],
  },
  {
    id: 'a3', category: '시술 이해',
    title: '동결이식(FET)이 신선배아보다 성공률이 높을 수 있는 이유',
    summary: '자궁 내막 환경, 호르몬 안정성 측면에서 FET가 왜 더 유리한 경우가 있는지 근거와 함께 설명해요.',
    readMin: 6, tags: ['FET', '성공률'],
  },
  {
    id: 'a4', category: '생활 습관',
    title: '난임 시술 중 운동, 어느 정도까지 해도 될까?',
    summary: '시술 단계별로 권장·주의해야 할 운동 강도를 정리했어요. 과배란 중 과격한 운동이 위험한 이유도 함께요.',
    readMin: 3, tags: ['운동', '생활'],
  },
  {
    id: 'a5', category: '생활 습관',
    title: '수면이 난임에 영향을 미친다? 수면 호르몬과 임신의 관계',
    summary: '멜라토닌과 생식 호르몬의 연관성, 수면 부족이 배란과 착상에 미치는 영향을 알아봐요.',
    readMin: 4, tags: ['수면', '호르몬'],
  },
  {
    id: 'a6', category: '검사·수치',
    title: 'AMH 수치, 낮다고 포기하지 마세요',
    summary: 'AMH가 난소예비력의 전부가 아닌 이유, 낮은 AMH에서도 임신에 성공하는 방법을 정리했어요.',
    readMin: 5, tags: ['AMH', '난소예비력'],
  },
  {
    id: 'a7', category: '검사·수치',
    title: '호르몬 검사 결과지 읽는 법 — FSH, LH, E2 완벽 정리',
    summary: '병원에서 받은 혈액검사 결과지에 있는 수치들이 무엇을 의미하는지, 정상 범위와 함께 설명해요.',
    readMin: 7, tags: ['호르몬', '혈액검사'],
  },
  {
    id: 'a8', category: '심리·감정',
    title: '난임 치료 중 우울감, 정상인가요?',
    summary: '난임 환자의 40%가 경험하는 심리적 어려움. 이 감정이 자연스러운 이유와 혼자 버티지 않아도 되는 방법을 공유해요.',
    readMin: 4, tags: ['심리', '정서'],
  },
  {
    id: 'a9', category: '심리·감정',
    title: '파트너와 난임을 함께 극복하는 대화법',
    summary: '시술 중 부부 갈등이 생기는 흔한 패턴과, 서로를 지지하는 구체적인 대화 방법을 소개해요.',
    readMin: 5, tags: ['부부', '소통'],
  },
  {
    id: 'a10', category: '식단',
    title: '배란을 돕는 음식 vs 피해야 할 음식',
    summary: '항산화 식품, 엽산이 풍부한 음식, 반대로 난임에 영향을 줄 수 있는 음식과 카페인 섭취량 기준을 정리했어요.',
    readMin: 4, tags: ['식단', '배란'],
    products: [
      { name: '종근당 엽산 5mg', desc: '임신 준비기 권장 고용량 엽산', platform: 'coupang', url: 'https://www.coupang.com/np/search?q=엽산+임신준비' },
      { name: '네이처메이드 엽산', desc: '천연 엽산 400mcg, 미국산', platform: 'naver', url: 'https://search.shopping.naver.com/search/all?query=네이처메이드+엽산' },
    ],
  },
  {
    id: 'a11', category: '식단',
    title: '엽산, 언제부터 얼마나 먹어야 할까?',
    summary: '임신 준비 전부터 먹어야 하는 이유, 권장 용량, 천연 엽산 vs 합성 엽산 차이까지 알기 쉽게 정리했어요.',
    readMin: 3, tags: ['영양제', '엽산'],
    products: [
      { name: '종근당 엽산 5mg', desc: '임신 준비기 권장 고용량 엽산', platform: 'coupang', url: 'https://www.coupang.com/np/search?q=엽산+임신준비' },
      { name: '메가푸드 베이비앤미', desc: '천연 식품형 산전 종합비타민', platform: 'naver', url: 'https://search.shopping.naver.com/search/all?query=메가푸드+베이비앤미' },
    ],
  },
  {
    id: 'a12', category: '식단',
    title: '오메가3와 코엔자임Q10, 난임에 정말 효과 있을까?',
    summary: '난임 관련 영양제 중 실제 연구로 효과가 입증된 것과 과대광고인 것을 구분해서 알려드려요.',
    readMin: 5, tags: ['영양제', '근거'],
    products: [
      { name: '노르딕 내추럴스 오메가3', desc: '생식의학 연구에서 자주 쓰인 rTG형 오메가3', platform: 'coupang', url: 'https://www.coupang.com/np/search?q=노르딕내추럴스+오메가3' },
      { name: '유비퀴놀 코엔자임Q10 100mg', desc: '흡수율 높은 환원형 CoQ10', platform: 'naver', url: 'https://search.shopping.naver.com/search/all?query=유비퀴놀+코큐텐+100mg' },
    ],
  },
]

// ── 제휴 상품 타입 ────────────────────────────────────────────────
interface AffiliateProduct {
  name: string
  desc: string
  platform: string
  url: string
}

type Tab = 'hospitals' | 'cost' | 'info'

export default function InfoPage() {
  const [activeTab, setActiveTab]           = useState<Tab>('hospitals')
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [searchText, setSearchText]         = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [expandedArticle, setExpandedArticle]   = useState<string | null>(null)
  const [remoteProducts, setRemoteProducts]     = useState<AffiliateProductsMap | null>(null)

  useEffect(() => {
    infoApi.getProducts().then(setRemoteProducts).catch(() => {})
  }, [])

  // 서버에서 내려온 제품 데이터 우선, 없으면 하드코딩 fallback
  const getProducts = (article: Article): AffiliateProduct[] =>
    remoteProducts?.[article.id] ?? article.products ?? []

  const filteredHospitals = HOSPITALS.filter(h => {
    const regionMatch = selectedRegion === '전체' || h.region === selectedRegion
    const searchMatch = !searchText || h.name.includes(searchText) || h.address.includes(searchText)
    return regionMatch && searchMatch
  })

  const filteredArticles = ARTICLES.filter(a =>
    selectedCategory === '전체' || a.category === selectedCategory
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'hospitals', label: '병원 찾기' },
    { key: 'cost',      label: '비용·지원' },
    { key: 'info',      label: '정보' },
  ]

  return (
    <div className="max-w-[480px] mx-auto space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-rose-950">📋 정보</h1>
        <p className="text-xs text-rose-400 mt-0.5">난임 병원 · 비용 · 지원 · 유용한 정보</p>
      </div>

      {/* 탭 */}
      <div className="flex bg-white border border-rose-100 rounded-2xl p-1 gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === t.key
                ? 'bg-primary text-white shadow-sm'
                : 'text-rose-400 hover:text-rose-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 병원 찾기 ── */}
      {activeTab === 'hospitals' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="🔍 병원명, 지역으로 검색"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-rose-100 bg-white focus:outline-none focus:border-primary"
          />

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {REGIONS.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRegion(r)}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                  selectedRegion === r
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-rose-400 border-rose-100 hover:border-primary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
            💡 아래 정보는 참고용이에요. 실제 비용·대기는 병원에 직접 확인하세요.
          </div>

          {filteredHospitals.map(h => (
            <div key={h.id} className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-rose-950">{h.name}</p>
                  <p className="text-xs text-rose-400 mt-0.5">{h.region} · {h.address}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-rose-900">⭐ {h.rating}</p>
                  <p className="text-[10px] text-rose-400">리뷰 {h.reviewCount}개</p>
                </div>
              </div>
              <p className="text-xs text-rose-400">{h.note}</p>
              <div className="flex flex-wrap gap-1.5">
                {h.specialties.map(s => (
                  <span key={s} className="px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700 rounded-lg">{s}</span>
                ))}
                {h.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 text-[10px] bg-rose-50 text-rose-400 border border-rose-100 rounded-lg">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-rose-50">
                <span className="text-xs font-semibold text-rose-900">💰 {h.avgCost}</span>
                <a
                  href={`tel:${h.phone}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  <Phone size={11} /> 전화
                </a>
              </div>
            </div>
          ))}

          {filteredHospitals.length === 0 && (
            <div className="text-center py-12 text-sm text-rose-300">검색 결과가 없어요</div>
          )}
        </div>
      )}

      {/* ── 비용·지원 ── */}
      {activeTab === 'cost' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-rose-100 space-y-3">
            <div>
              <p className="font-bold text-sm text-rose-950">🇰🇷 정부 난임 시술비 지원</p>
              <p className="text-xs text-rose-400 mt-0.5">기준 중위소득 180% 이하 가구 대상</p>
            </div>
            {COST_INFO.map((c, i) => (
              <div key={i} className="border-t border-rose-50 pt-3 space-y-1.5">
                <p className="text-sm font-bold text-rose-900">{c.title}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-rose-400">지원 횟수</span>
                  <span className="font-semibold text-rose-900">{c.gov}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-rose-400">비지원 시 자비</span>
                  <span className="font-semibold text-rose-900">{c.selfPay}</span>
                </div>
                <p className="text-[10px] text-rose-300 italic">{c.note}</p>
              </div>
            ))}
            <a
              href="https://www.bokjiro.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 w-full py-3 mt-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-rose-500 transition-colors"
            >
              복지로에서 신청하기 <ExternalLink size={13} />
            </a>
          </div>

          {/* 신청 절차 */}
          <div className="bg-white rounded-2xl p-4 border border-rose-100 space-y-3">
            <p className="font-bold text-sm text-rose-950">📋 지원 신청 절차</p>
            {STEPS.map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">{s.step}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-rose-900">{s.label}</p>
                  <p className="text-xs text-rose-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* AI 연계 */}
          <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
            <p className="font-bold text-sm text-violet-800 mb-1">🤖 지원 신청이 헷갈리세요?</p>
            <p className="text-xs text-violet-600 leading-relaxed mb-3">AI 봄이에게 내 상황에 맞는 지원 정보를 물어보세요</p>
            <a href="/chat" className="text-xs font-semibold text-violet-700 hover:underline">AI 상담 시작하기 →</a>
          </div>
        </div>
      )}

      {/* ── 정보 아티클 ── */}
      {activeTab === 'info' && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {INFO_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                  selectedCategory === c
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-rose-400 border-rose-100 hover:border-primary'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {filteredArticles.map(a => {
            const meta = CATEGORY_META[a.category] ?? CATEGORY_META['시술 이해']
            const products = getProducts(a)
            return (
            <div key={a.id} className="rounded-2xl p-4 border border-rose-100 bg-white space-y-2">
              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg ${meta.badgeColor} ${meta.textColor}`}>
                      {a.category}
                    </span>
                    <span className="text-[10px] text-rose-300">📖 {a.readMin}분</span>
                    {products.length > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-rose-50 text-rose-400 border border-rose-100">
                        🛍️ 추천 제품
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-rose-950 leading-snug">{a.title}</p>
                </div>
              </div>

              {expandedArticle === a.id && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-rose-700/80 leading-relaxed">{a.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.tags.map(t => (
                      <span key={t} className={`px-2 py-0.5 text-[10px] font-semibold border rounded-lg ${meta.textColor} border-current/30`}>
                        #{t}
                      </span>
                    ))}
                  </div>
                  <button className={`w-full py-2.5 text-xs font-bold rounded-xl ${meta.bgColor} ${meta.textColor} hover:opacity-80 transition-opacity`}>
                    전체 내용 보기 →
                  </button>

                  {products.length > 0 && (
                    <div className="pt-2 border-t border-rose-50 space-y-2">
                      <p className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                        <ShoppingBag size={11} /> 아티클 관련 추천 제품
                      </p>
                      {products.map((p, i) => (
                        <a
                          key={i}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white border border-rose-100 hover:border-primary hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">🛍️</span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-rose-900 truncate">{p.name}</p>
                              <p className="text-[10px] text-rose-400 truncate">{p.desc}</p>
                            </div>
                          </div>
                          <span className="shrink-0 px-2 py-1 text-[9px] font-bold rounded-lg bg-rose-50 text-rose-500">
                            {p.platform}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setExpandedArticle(expandedArticle === a.id ? null : a.id)}
                className="flex items-center gap-1 text-[10px] text-rose-300 hover:text-rose-400 ml-auto"
              >
                {expandedArticle === a.id
                  ? <><ChevronUp size={12} /> 접기</>
                  : <><ChevronDown size={12} /> 더보기</>
                }
              </button>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
