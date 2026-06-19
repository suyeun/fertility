import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, SafeAreaView, Linking,
} from 'react-native'
import { router } from 'expo-router'
import { F } from '../../../lib/fonts'

const PINK       = '#ff8fab'
const DARK_ROSE  = '#5a3042'
const MUTED      = '#b07080'
const BORDER     = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

// ── 병원 데이터 ──────────────────────────────────────────────────
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

// ── 비용·지원 데이터 ─────────────────────────────────────────────
const COST_INFO = [
  {
    title: '인공수정 (IUI)',
    gov: '3회까지 지원',
    selfPay: '20~50만원/회',
    note: '건강보험 적용 시 본인부담 약 20~30%',
  },
  {
    title: '체외수정 (IVF)',
    gov: '신선배아 9회, 동결배아 7회',
    selfPay: '300~500만원/회',
    note: '지원 후 본인부담 약 30~50%',
  },
  {
    title: '동결이식 (FET)',
    gov: 'IVF 지원 횟수에 포함',
    selfPay: '70~150만원/회',
    note: '신선배아보다 비용 낮음',
  },
]

// ── 정보 콘텐츠 데이터 ───────────────────────────────────────────
const INFO_CATEGORIES = ['전체', '시술 이해', '생활 습관', '검사·수치', '심리·감정', '식단']

const INFO_ARTICLES = [
  {
    id: 'a1',
    category: '시술 이해',
    emoji: '🔬',
    title: 'IVF 시험관 시술, 처음이라면 꼭 알아야 할 5단계',
    summary: '과배란 유도 → 채취 → 수정 → 배양 → 이식까지, 각 단계에서 무엇을 준비해야 하는지 알기 쉽게 정리했어요.',
    readMin: 5,
    tags: ['IVF', '입문'],
    bgColor: '#ede9fe',
    textColor: '#6d28d9',
  },
  {
    id: 'a2',
    category: '시술 이해',
    emoji: '💫',
    title: 'IUI와 IVF, 나에게 맞는 시술은?',
    summary: '인공수정과 시험관의 차이, 성공률, 비용을 비교해서 어떤 상황에 어떤 시술이 적합한지 설명해드려요.',
    readMin: 4,
    tags: ['IUI', 'IVF', '비교'],
    bgColor: '#fce7f3',
    textColor: '#be185d',
  },
  {
    id: 'a3',
    category: '시술 이해',
    emoji: '❄️',
    title: '동결이식(FET)이 신선배아보다 성공률이 높을 수 있는 이유',
    summary: '자궁 내막 환경, 호르몬 안정성 측면에서 FET가 왜 더 유리한 경우가 있는지 근거와 함께 설명해요.',
    readMin: 6,
    tags: ['FET', '성공률'],
    bgColor: '#e0f2fe',
    textColor: '#0369a1',
  },
  {
    id: 'a4',
    category: '생활 습관',
    emoji: '🏃‍♀️',
    title: '난임 시술 중 운동, 어느 정도까지 해도 될까?',
    summary: '시술 단계별로 권장·주의해야 할 운동 강도를 정리했어요. 과배란 중 과격한 운동이 위험한 이유도 함께요.',
    readMin: 3,
    tags: ['운동', '생활'],
    bgColor: '#dcfce7',
    textColor: '#15803d',
  },
  {
    id: 'a5',
    category: '생활 습관',
    emoji: '😴',
    title: '수면이 난임에 영향을 미친다? 수면 호르몬과 임신의 관계',
    summary: '멜라토닌과 생식 호르몬의 연관성, 수면 부족이 배란과 착상에 미치는 영향을 알아봐요.',
    readMin: 4,
    tags: ['수면', '호르몬'],
    bgColor: '#fef3c7',
    textColor: '#92400e',
  },
  {
    id: 'a6',
    category: '검사·수치',
    emoji: '🧪',
    title: 'AMH 수치, 낮다고 포기하지 마세요',
    summary: 'AMH가 난소예비력의 전부가 아닌 이유, 낮은 AMH에서도 임신에 성공하는 방법을 정리했어요.',
    readMin: 5,
    tags: ['AMH', '난소예비력'],
    bgColor: '#fce7f3',
    textColor: '#be185d',
  },
  {
    id: 'a7',
    category: '검사·수치',
    emoji: '📊',
    title: '호르몬 검사 결과지 읽는 법 — FSH, LH, E2 완벽 정리',
    summary: '병원에서 받은 혈액검사 결과지에 있는 수치들이 무엇을 의미하는지, 정상 범위와 함께 설명해요.',
    readMin: 7,
    tags: ['호르몬', '혈액검사'],
    bgColor: '#ede9fe',
    textColor: '#6d28d9',
  },
  {
    id: 'a8',
    category: '심리·감정',
    emoji: '💙',
    title: '난임 치료 중 우울감, 정상인가요?',
    summary: '난임 환자의 40%가 경험하는 심리적 어려움. 이 감정이 자연스러운 이유와 혼자 버티지 않아도 되는 방법을 공유해요.',
    readMin: 4,
    tags: ['심리', '정서'],
    bgColor: '#e0f2fe',
    textColor: '#0369a1',
  },
  {
    id: 'a9',
    category: '심리·감정',
    emoji: '👫',
    title: '파트너와 난임을 함께 극복하는 대화법',
    summary: '시술 중 부부 갈등이 생기는 흔한 패턴과, 서로를 지지하는 구체적인 대화 방법을 소개해요.',
    readMin: 5,
    tags: ['부부', '소통'],
    bgColor: '#fce7f3',
    textColor: '#be185d',
  },
  {
    id: 'a10',
    category: '식단',
    emoji: '🥦',
    title: '배란을 돕는 음식 vs 피해야 할 음식',
    summary: '항산화 식품, 엽산이 풍부한 음식, 반대로 난임에 영향을 줄 수 있는 음식과 카페인 섭취량 기준을 정리했어요.',
    readMin: 4,
    tags: ['식단', '배란'],
    bgColor: '#dcfce7',
    textColor: '#15803d',
  },
  {
    id: 'a11',
    category: '식단',
    emoji: '💊',
    title: '엽산, 언제부터 얼마나 먹어야 할까?',
    summary: '임신 준비 전부터 먹어야 하는 이유, 권장 용량, 천연 엽산 vs 합성 엽산 차이까지 알기 쉽게 정리했어요.',
    readMin: 3,
    tags: ['영양제', '엽산'],
    bgColor: '#fef3c7',
    textColor: '#92400e',
  },
  {
    id: 'a12',
    category: '식단',
    emoji: '🐟',
    title: '오메가3와 코엔자임Q10, 난임에 정말 효과 있을까?',
    summary: '난임 관련 영양제 중 실제 연구로 효과가 입증된 것과 과대광고인 것을 구분해서 알려드려요.',
    readMin: 5,
    tags: ['영양제', '근거'],
    bgColor: '#e0f2fe',
    textColor: '#0369a1',
  },
]

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function InfoScreen() {
  const [activeTab, setActiveTab]         = useState<'hospitals' | 'cost' | 'info'>('hospitals')
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [searchText, setSearchText]         = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [expandedArticle, setExpandedArticle]   = useState<string | null>(null)

  const filteredHospitals = HOSPITALS.filter(h => {
    const regionMatch = selectedRegion === '전체' || h.region === selectedRegion
    const searchMatch = !searchText || h.name.includes(searchText) || h.address.includes(searchText)
    return regionMatch && searchMatch
  })

  const filteredArticles = INFO_ARTICLES.filter(a =>
    selectedCategory === '전체' || a.category === selectedCategory
  )

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 정보</Text>
        <Text style={styles.headerSub}>난임 병원 · 비용 · 지원 · 유용한 정보</Text>
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        {(['hospitals', 'cost', 'info'] as const).map((tab, i) => {
          const labels = ['병원 찾기', '비용·지원', '정보']
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {labels[i]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── 병원 찾기 탭 ── */}
        {activeTab === 'hospitals' && (
          <>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="병원명, 지역으로 검색"
                placeholderTextColor={MUTED}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {REGIONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.filterChip, selectedRegion === r && styles.filterChipActive]}
                  onPress={() => setSelectedRegion(r)}
                >
                  <Text style={[styles.filterChipText, selectedRegion === r && styles.filterChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                💡 아래 정보는 참고용이에요. 실제 비용·대기는 병원에 직접 확인하세요.
              </Text>
            </View>

            {filteredHospitals.map(h => (
              <View key={h.id} style={styles.hospitalCard}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hospitalName}>{h.name}</Text>
                    <Text style={styles.hospitalAddr}>{h.region} · {h.address}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.ratingNum}>⭐ {h.rating}</Text>
                    <Text style={styles.ratingCount}>리뷰 {h.reviewCount}개</Text>
                  </View>
                </View>
                <Text style={styles.hospitalNote}>{h.note}</Text>
                <View style={styles.chipRow}>
                  {h.specialties.map(s => (
                    <View key={s} style={styles.specialtyChip}>
                      <Text style={styles.specialtyText}>{s}</Text>
                    </View>
                  ))}
                  {h.tags.map(t => (
                    <View key={t} style={styles.tagChip}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.costText}>💰 {h.avgCost}</Text>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${h.phone}`)}
                  >
                    <Text style={styles.callBtnText}>📞 전화</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {filteredHospitals.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>검색 결과가 없어요</Text>
              </View>
            )}
          </>
        )}

        {/* ── 비용·지원 탭 ── */}
        {activeTab === 'cost' && (
          <>
            <View style={styles.supportCard}>
              <Text style={styles.supportTitle}>🇰🇷 정부 난임 시술비 지원</Text>
              <Text style={styles.supportSub}>기준 중위소득 180% 이하 가구 대상</Text>
              {COST_INFO.map((c, i) => (
                <View key={i} style={styles.costRow}>
                  <Text style={styles.costTitle}>{c.title}</Text>
                  <View style={styles.costDetail}>
                    <Text style={styles.costLabel}>지원 횟수</Text>
                    <Text style={styles.costVal}>{c.gov}</Text>
                  </View>
                  <View style={styles.costDetail}>
                    <Text style={styles.costLabel}>비지원 시 자비</Text>
                    <Text style={styles.costVal}>{c.selfPay}</Text>
                  </View>
                  <Text style={styles.costNote}>{c.note}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => Linking.openURL('https://www.bokjiro.go.kr')}
              >
                <Text style={styles.linkBtnText}>복지로에서 신청하기 →</Text>
              </TouchableOpacity>
            </View>

            {/* 신청 절차 */}
            <View style={styles.processCard}>
              <Text style={styles.processTitle}>📋 지원 신청 절차</Text>
              {[
                { step: '1', label: '난임 진단서 발급', desc: '난임 전문의에게 진단서 발급' },
                { step: '2', label: '주민센터 방문 신청', desc: '또는 복지로 온라인 신청' },
                { step: '3', label: '지원 결정 통보', desc: '소득 확인 후 보통 2~3주 소요' },
                { step: '4', label: '시술 후 비용 청구', desc: '지정 의료기관에서 급여 적용' },
              ].map(p => (
                <View key={p.step} style={styles.processRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>{p.step}</Text>
                  </View>
                  <View>
                    <Text style={styles.stepLabel}>{p.label}</Text>
                    <Text style={styles.stepDesc}>{p.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* AI 상담 연계 */}
            <TouchableOpacity
              style={styles.aiCard}
              onPress={() => router.push('/(tabs)/chat' as any)}
            >
              <Text style={styles.aiCardTitle}>🤖 지원 신청이 헷갈리세요?</Text>
              <Text style={styles.aiCardSub}>AI 봄이에게 내 상황에 맞는 지원 정보를 물어보세요</Text>
              <Text style={styles.aiCardLink}>AI 상담 시작하기 →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── 정보 탭 ── */}
        {activeTab === 'info' && (
          <>
            {/* 카테고리 필터 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {INFO_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.filterChip, selectedCategory === c && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(c)}
                >
                  <Text style={[styles.filterChipText, selectedCategory === c && styles.filterChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 추천 아티클 */}
            {filteredArticles.map(a => (
              <TouchableOpacity
                key={a.id}
                style={styles.articleCard}
                onPress={() => setExpandedArticle(expandedArticle === a.id ? null : a.id)}
                activeOpacity={0.85}
              >
                <View style={styles.articleTop}>
                  <View style={[styles.articleEmojiBadge, { backgroundColor: a.bgColor }]}>
                    <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.articleMeta}>
                      <View style={[styles.categoryBadge, { backgroundColor: a.bgColor }]}>
                        <Text style={[styles.categoryBadgeText, { color: a.textColor }]}>{a.category}</Text>
                      </View>
                      <Text style={styles.readMin}>📖 {a.readMin}분</Text>
                    </View>
                    <Text style={styles.articleTitle}>{a.title}</Text>
                  </View>
                </View>

                {expandedArticle === a.id && (
                  <>
                    <Text style={styles.articleSummary}>{a.summary}</Text>
                    <View style={styles.articleTags}>
                      {a.tags.map(t => (
                        <View key={t} style={[styles.articleTag, { borderColor: a.textColor }]}>
                          <Text style={[styles.articleTagText, { color: a.textColor }]}>#{t}</Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity style={[styles.readBtn, { backgroundColor: a.bgColor }]}>
                      <Text style={[styles.readBtnText, { color: a.textColor }]}>전체 내용 보기 →</Text>
                    </TouchableOpacity>
                  </>
                )}

                <Text style={styles.articleToggle}>
                  {expandedArticle === a.id ? '접기 ▲' : '더보기 ▼'}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: LIGHT_PINK },
  header:  { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  headerTitle: { fontFamily: F.bold,    fontSize: 20, color: DARK_ROSE },
  headerSub:   { fontFamily: F.regular, fontSize: 12, color: MUTED, marginTop: 2 },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:     { backgroundColor: PINK },
  tabText:       { fontFamily: F.semiBold, fontSize: 12, color: MUTED },
  tabTextActive: { fontFamily: F.semiBold, fontSize: 12, color: '#fff' },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  // 검색 & 필터
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontFamily: F.regular, fontSize: 13, color: DARK_ROSE },

  chipScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  filterChip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, marginRight: 8 },
  filterChipActive:   { backgroundColor: PINK, borderColor: PINK },
  filterChipText:     { fontFamily: F.semiBold, fontSize: 12, color: MUTED },
  filterChipTextActive: { color: '#fff' },

  banner: { backgroundColor: '#fff8e1', borderRadius: 10, padding: 10 },
  bannerText: { fontFamily: F.regular, fontSize: 11, color: '#92400e', lineHeight: 16 },

  // 병원 카드
  hospitalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#ffb3c6', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  hospitalName:  { fontFamily: F.bold,    fontSize: 15, color: DARK_ROSE },
  hospitalAddr:  { fontFamily: F.regular, fontSize: 11, color: MUTED, marginTop: 2 },
  ratingNum:     { fontFamily: F.bold,    fontSize: 12, color: DARK_ROSE },
  ratingCount:   { fontFamily: F.regular, fontSize: 10, color: MUTED },
  hospitalNote:  { fontFamily: F.regular, fontSize: 12, color: MUTED, marginBottom: 8 },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  specialtyChip: { backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  specialtyText: { fontFamily: F.semiBold, fontSize: 11, color: '#6d28d9' },
  tagChip:       { backgroundColor: LIGHT_PINK, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BORDER },
  tagText:       { fontFamily: F.regular, fontSize: 11, color: MUTED },
  cardBottom:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costText:      { fontFamily: F.semiBold, fontSize: 12, color: DARK_ROSE },
  callBtn:       { backgroundColor: LIGHT_PINK, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: BORDER },
  callBtnText:   { fontFamily: F.semiBold, fontSize: 12, color: PINK },

  empty:     { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: F.regular, fontSize: 14, color: MUTED },

  // 비용·지원
  supportCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  supportTitle: { fontFamily: F.bold,    fontSize: 15, color: DARK_ROSE, marginBottom: 4 },
  supportSub:   { fontFamily: F.regular, fontSize: 12, color: MUTED, marginBottom: 14 },
  costRow:    { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12, marginTop: 12 },
  costTitle:  { fontFamily: F.bold,    fontSize: 13, color: DARK_ROSE, marginBottom: 6 },
  costDetail: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  costLabel:  { fontFamily: F.regular,  fontSize: 12, color: MUTED },
  costVal:    { fontFamily: F.semiBold, fontSize: 12, color: DARK_ROSE },
  costNote:   { fontFamily: F.regular,  fontSize: 11, color: MUTED, marginTop: 4, fontStyle: 'italic' },
  linkBtn:    { marginTop: 14, backgroundColor: PINK, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  linkBtnText:{ fontFamily: F.bold, fontSize: 13, color: '#fff' },

  processCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  processTitle:{ fontFamily: F.bold,    fontSize: 14, color: DARK_ROSE, marginBottom: 14 },
  processRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepBadge:   { width: 28, height: 28, borderRadius: 14, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNum:     { fontFamily: F.bold,    fontSize: 13, color: '#fff' },
  stepLabel:   { fontFamily: F.semiBold, fontSize: 13, color: DARK_ROSE, marginBottom: 2 },
  stepDesc:    { fontFamily: F.regular,  fontSize: 11, color: MUTED },

  aiCard: { backgroundColor: '#ede9fe', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#c4b5fd' },
  aiCardTitle: { fontFamily: F.bold,    fontSize: 14, color: '#5b21b6', marginBottom: 4 },
  aiCardSub:   { fontFamily: F.regular, fontSize: 12, color: '#6d28d9', lineHeight: 18, marginBottom: 8 },
  aiCardLink:  { fontFamily: F.semiBold, fontSize: 12, color: '#7c3aed' },

  // 정보 아티클
  articleCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  articleTop:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 4 },
  articleEmojiBadge: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  articleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  categoryBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  categoryBadgeText: { fontFamily: F.semiBold, fontSize: 10 },
  readMin:     { fontFamily: F.regular, fontSize: 10, color: MUTED },
  articleTitle:{ fontFamily: F.bold, fontSize: 13, color: DARK_ROSE, lineHeight: 18 },
  articleSummary: {
    fontFamily: F.regular, fontSize: 13, color: '#5a3042cc',
    lineHeight: 20, marginTop: 10, marginBottom: 10,
  },
  articleTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  articleTag:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  articleTagText: { fontFamily: F.semiBold, fontSize: 11 },
  readBtn:     { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 6 },
  readBtnText: { fontFamily: F.bold, fontSize: 13 },
  articleToggle: { fontFamily: F.regular, fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 6 },
})
