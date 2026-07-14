import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, SafeAreaView, Linking,
  ActivityIndicator, Modal, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { router } from 'expo-router'
import { F } from '../../../lib/fonts'
import { infoApi, hospitalsApi, articlesApi, type AffiliateProductsMap, type Hospital, type MedicalArticle, type HospitalSpecialty } from '@fertility/shared'

const PINK       = '#ff8fab'
const DARK_ROSE  = '#5a3042'
const MUTED      = '#b07080'
const BORDER     = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

// ── 필터 옵션 ──────────────────────────────────────────────────
const REGIONS = ['전체', '서울', '경기', '인천', '부산', '대구', '대전', '광주', '기타']
const SPECIALTIES = ['전체', 'IVF', 'IUI', 'FET', 'PGT', '남성난임']
const INFO_CATEGORIES = ['전체', '시술 이해', '생활 습관', '검사·수치', '심리·감정', '식단']

// ── 카테고리 스타일 매핑 ──────────────────────────────────────────
const CATEGORY_META: Record<string, { emoji: string; bgColor: string; textColor: string }> = {
  '시술 이해': { emoji: '🔬', bgColor: '#ede9fe', textColor: '#6d28d9' },
  '생활 습관': { emoji: '🌿', bgColor: '#dcfce7', textColor: '#15803d' },
  '검사·수치': { emoji: '📊', bgColor: '#e0f2fe', textColor: '#0369a1' },
  '심리·감정': { emoji: '💙', bgColor: '#fce7f3', textColor: '#be185d' },
  '식단':      { emoji: '🥗', bgColor: '#fef3c7', textColor: '#92400e' },
}

// ── 비용·지원 정적 정보 ─────────────────────────────────────────────
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

// ── 제휴 상품 타입 ────────────────────────────────────────────────
interface AffiliateProduct {
  name: string
  desc: string
  platform: string
  url: string
}

export default function InfoScreen() {
  const [activeTab, setActiveTab]         = useState<'hospitals' | 'cost' | 'info'>('hospitals')
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [selectedSpecialty, setSelectedSpecialty] = useState('전체')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [searchText, setSearchText]         = useState('')
  const [expandedArticle, setExpandedArticle]   = useState<string | null>(null)
  
  // 백엔드 연동 데이터 상태
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [articles, setArticles] = useState<MedicalArticle[]>([])
  const [loadingHospitals, setLoadingHospitals] = useState(false)
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [remoteProducts, setRemoteProducts]     = useState<AffiliateProductsMap | null>(null)

  // 우리 병원 등록 제안 모달 상태
  const [suggestModalVisible, setSuggestModalVisible] = useState(false)
  const [suggestName, setSuggestName] = useState('')
  const [suggestRegion, setSuggestRegion] = useState('서울')
  const [suggestAddress, setSuggestAddress] = useState('')
  const [suggestPhone, setSuggestPhone] = useState('')
  const [suggestSpecialties, setSuggestSpecialties] = useState<HospitalSpecialty[]>([])
  const [suggestNote, setSuggestNote] = useState('')
  const [submittingSuggest, setSubmittingSuggest] = useState(false)

  // 제휴 상품 로드
  useEffect(() => {
    infoApi.getProducts().then(setRemoteProducts).catch(() => {})
  }, [])

  // 병원 API 호출
  useEffect(() => {
    let active = true
    if (activeTab !== 'hospitals') return

    setLoadingHospitals(true)
    hospitalsApi.getAll({
      region: selectedRegion === '전체' ? undefined : selectedRegion,
      specialty: selectedSpecialty === '전체' ? undefined : selectedSpecialty,
      search: searchText || undefined,
    }).then(res => {
      if (active) setHospitals(res)
    }).catch(err => {
      console.warn('병원 목록 조회 실패:', err)
    }).finally(() => {
      if (active) setLoadingHospitals(false)
    })

    return () => { active = false }
  }, [selectedRegion, selectedSpecialty, searchText, activeTab])

  // 아티클 API 호출
  useEffect(() => {
    let active = true
    if (activeTab !== 'info') return

    setLoadingArticles(true)
    articlesApi.getAll({
      category: selectedCategory === '전체' ? undefined : selectedCategory,
      search: searchText || undefined,
    }).then(res => {
      if (active) setArticles(res)
    }).catch(err => {
      console.warn('아티클 목록 조회 실패:', err)
    }).finally(() => {
      if (active) setLoadingArticles(false)
    })

    return () => { active = false }
  }, [selectedCategory, searchText, activeTab])

  const getProducts = (article: MedicalArticle): AffiliateProduct[] =>
    remoteProducts?.[article.id] ?? article.products ?? []

  // 병원 등록 제안 제출
  const handleSuggestSubmit = async () => {
    if (!suggestName.trim()) {
      Alert.alert('필수 입력', '병원 이름을 입력해주세요.')
      return
    }
    try {
      setSubmittingSuggest(true)
      await hospitalsApi.suggest({
        name: suggestName,
        region: suggestRegion,
        address: suggestAddress,
        phone: suggestPhone,
        specialties: suggestSpecialties,
        note: suggestNote,
      })
      Alert.alert('등록 완료 💕', '소중한 의견 감사드립니다. 검토 후 등록에 반영하겠습니다.')
      setSuggestModalVisible(false)
      // 초기화
      setSuggestName('')
      setSuggestAddress('')
      setSuggestPhone('')
      setSuggestNote('')
      setSuggestSpecialties([])
    } catch (e: any) {
      Alert.alert('등록 실패', e?.message || '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmittingSuggest(false)
    }
  };

  const toggleSuggestSpecialty = (spec: HospitalSpecialty) => {
    if (suggestSpecialties.includes(spec)) {
      setSuggestSpecialties(suggestSpecialties.filter(s => s !== spec))
    } else {
      setSuggestSpecialties([...suggestSpecialties, spec])
    }
  }

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
                placeholder="등록된 병원명, 지역으로 검색"
                placeholderTextColor={MUTED}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* 지역 필터 */}
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

            {/* 시술 종류 필터 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {SPECIALTIES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChip, selectedSpecialty === s && styles.filterChipActiveSpecialty]}
                  onPress={() => setSelectedSpecialty(s)}
                >
                  <Text style={[styles.filterChipText, selectedSpecialty === s && styles.filterChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                💡 아래 정보는 단순 참고용입니다. 정확한 시술 및 비용 내용은 각 의료기관에 직접 문의하세요.
              </Text>
            </View>

            {loadingHospitals ? (
              <ActivityIndicator color={PINK} style={{ marginVertical: 20 }} />
            ) : (
              hospitals.map(h => (
                <View key={h.id} style={styles.hospitalCard}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hospitalName}>{h.name}</Text>
                      <Text style={styles.hospitalAddr}>{h.region} · {h.address}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.ratingNum}>⭐ {h.rating ?? 0.0}</Text>
                      <Text style={styles.ratingCount}>리뷰 {h.reviewCount ?? 0}개</Text>
                    </View>
                  </View>
                  {h.note ? <Text style={styles.hospitalNote}>{h.note}</Text> : null}
                  <View style={styles.chipRow}>
                    {h.specialties?.map(s => (
                      <View key={s} style={styles.specialtyChip}>
                        <Text style={styles.specialtyText}>{s}</Text>
                      </View>
                    ))}
                    {h.tags?.map(t => (
                      <View key={t} style={styles.tagChip}>
                        <Text style={styles.tagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.costText}>💰 {h.avgCost || '평균 비용 정보 없음'}</Text>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => Linking.openURL(`tel:${h.phone}`)}
                    >
                      <Text style={styles.callBtnText}>📞 전화</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {!loadingHospitals && hospitals.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>가까운 지역에 등록된 병원이 없어요</Text>
              </View>
            )}

            {/* 우리 병원 등록 제안 버튼 */}
            <TouchableOpacity
              style={styles.suggestCtaBtn}
              onPress={() => setSuggestModalVisible(true)}
            >
              <Text style={styles.suggestCtaBtnText}>🏥 다니는 병원이 없으신가요? 등록 요청하기</Text>
            </TouchableOpacity>

            {/* 법적/윤리적 가드레일 면책 조항 */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                ⚠️ 본 서비스는 정보 제공 목적으로만 제공되며, 의료기관을 알선·추천하거나 의사의 전문적인 진단 및 상담을 대신하지 않습니다. 정확한 진료와 시술 계획은 반드시 전문의와 상담하시기 바랍니다.
              </Text>
            </View>
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
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="아티클 제목 또는 태그로 검색"
                placeholderTextColor={MUTED}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

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
            {loadingArticles ? (
              <ActivityIndicator color={PINK} style={{ marginVertical: 20 }} />
            ) : (
              articles.map(a => {
                const meta = CATEGORY_META[a.category] ?? CATEGORY_META['시술 이해']
                const products = getProducts(a)
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={styles.articleCard}
                    onPress={() => setExpandedArticle(expandedArticle === a.id ? null : a.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.articleTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.articleMeta}>
                          <View style={[styles.categoryBadge, { backgroundColor: meta.bgColor }]}>
                            <Text style={[styles.categoryBadgeText, { color: meta.textColor }]}>{a.category}</Text>
                          </View>
                          
                          {/* 실명 자문의 크레딧 표기 */}
                          {a.authorName ? (
                            <View style={styles.authorBadge}>
                              <Text style={styles.authorBadgeText}>🩺 자문: {a.authorName} {a.authorAffiliation ? `(${a.authorAffiliation})` : ''}</Text>
                            </View>
                          ) : null}

                          {products.length > 0 && (
                            <View style={styles.productBadge}>
                              <Text style={styles.productBadgeText}>🛍️ 추천 제품</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.articleTitle}>{a.title}</Text>
                      </View>
                    </View>

                    {expandedArticle === a.id && (
                      <>
                        <Text style={styles.articleSummary}>{a.summary}</Text>
                        
                        {/* 상세 컨텐츠 출력 */}
                        {a.content ? (
                          <Text style={styles.articleContent}>{a.content}</Text>
                        ) : null}

                        <View style={styles.articleTags}>
                          {a.tags.map(t => (
                            <View key={t} style={[styles.articleTag, { borderColor: meta.textColor }]}>
                              <Text style={[styles.articleTagText, { color: meta.textColor }]}>#{t}</Text>
                            </View>
                          ))}
                        </View>

                        {products.length > 0 && (
                          <View style={styles.productSection}>
                            <Text style={styles.productSectionTitle}>🛍️ 아티클 관련 추천 제품</Text>
                            {products.map((p, i) => (
                              <TouchableOpacity
                                key={i}
                                style={styles.productCard}
                                onPress={() => Linking.openURL(p.url)}
                                activeOpacity={0.75}
                              >
                                <Text style={styles.productIcon}>🛍️</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                                  <Text style={styles.productDesc} numberOfLines={1}>{p.desc}</Text>
                                </View>
                                <View style={styles.platformBadge}>
                                  <Text style={styles.platformBadgeText}>{p.platform}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    )}

                    <Text style={styles.articleToggle}>
                      {expandedArticle === a.id ? '접기 ▲' : '더보기 ▼'}
                    </Text>
                  </TouchableOpacity>
                )
              })
            )}

            {!loadingArticles && articles.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>검색된 정보 아티클이 없어요</Text>
              </View>
            )}

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                ⚠️ 본 아티클은 의학적 지침을 제공하기 위함이 아니며 참고용 정보입니다. 건강 상의 이상 혹은 시술 과정에서의 상담은 전적으로 의학 전문가와의 직접 진료를 통해서 결정되어야 합니다.
              </Text>
            </View>
          </>
        )}

      </ScrollView>

      {/* ── 병원 등록 제의 모달 ── */}
      <Modal
        visible={suggestModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSuggestModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🏥 다니시는 병원 등록 요청</Text>
            <Text style={styles.modalDesc}>
              BOM에 등록되어 있지 않은 병원이 있다면 알려주세요. 확인 후 정성껏 업데이트하겠습니다.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>병원명 *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="예: 강남마리아여성의원"
                  placeholderTextColor={MUTED}
                  value={suggestName}
                  onChangeText={setSuggestName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>지역 *</Text>
                <View style={styles.regionSelector}>
                  {REGIONS.slice(1).map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.regionSelectChip, suggestRegion === r && styles.regionSelectChipActive]}
                      onPress={() => setSuggestRegion(r)}
                    >
                      <Text style={[styles.regionSelectChipText, suggestRegion === r && styles.regionSelectChipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>병원 주소 (선택)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="예: 서울시 강남구 도산대로 418"
                  placeholderTextColor={MUTED}
                  value={suggestAddress}
                  onChangeText={setSuggestAddress}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>전화번호 (선택)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="예: 02-1234-5678"
                  placeholderTextColor={MUTED}
                  value={suggestPhone}
                  onChangeText={setSuggestPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>주요 시술 분야 (중복 선택)</Text>
                <View style={styles.regionSelector}>
                  {['IVF', 'IUI', 'FET', 'PGT', '남성난임'].map(s => {
                    const isSel = suggestSpecialties.includes(s as HospitalSpecialty)
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.regionSelectChip, isSel && styles.regionSelectChipActive]}
                        onPress={() => toggleSuggestSpecialty(s as HospitalSpecialty)}
                      >
                        <Text style={[styles.regionSelectChipText, isSel && styles.regionSelectChipTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>남기실 말씀 (선택)</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  placeholder="추가하고 싶은 의료진 이름이나 정보를 자유롭게 적어주세요."
                  placeholderTextColor={MUTED}
                  value={suggestNote}
                  onChangeText={setSuggestNote}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setSuggestModalVisible(false)}
                disabled={submittingSuggest}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleSuggestSubmit}
                disabled={submittingSuggest}
              >
                {submittingSuggest ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>제출하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  chipScroll: { marginHorizontal: -20, paddingHorizontal: 20, marginVertical: 2 },
  filterChip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, marginRight: 8 },
  filterChipActive:   { backgroundColor: PINK, borderColor: PINK },
  filterChipActiveSpecialty: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
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

  suggestCtaBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  suggestCtaBtnText: { fontFamily: F.bold, fontSize: 12, color: MUTED },

  disclaimerBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  disclaimerText: { fontFamily: F.regular, fontSize: 10, color: '#64748b', lineHeight: 15 },

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
  articleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  categoryBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  categoryBadgeText: { fontFamily: F.semiBold, fontSize: 10 },
  authorBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  authorBadgeText: { fontFamily: F.semiBold, fontSize: 9, color: '#475569' },
  articleTitle:{ fontFamily: F.bold, fontSize: 13, color: DARK_ROSE, lineHeight: 18 },
  articleSummary: {
    fontFamily: F.regular, fontSize: 13, color: '#5a3042cc',
    lineHeight: 20, marginTop: 10, marginBottom: 10,
  },
  articleContent: {
    fontFamily: F.regular, fontSize: 12, color: '#475569',
    lineHeight: 18, marginBottom: 12,
  },
  articleTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  articleTag:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  articleTagText: { fontFamily: F.semiBold, fontSize: 11 },
  articleToggle: { fontFamily: F.regular, fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 6 },

  // 제휴 상품
  productSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, gap: 8 },
  productSectionTitle: { fontFamily: F.semiBold, fontSize: 11, color: MUTED, marginBottom: 2 },
  productCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  productIcon:    { fontSize: 18 },
  productName:    { fontFamily: F.semiBold, fontSize: 12, color: DARK_ROSE },
  productDesc:    { fontFamily: F.regular,  fontSize: 11, color: MUTED, marginTop: 1 },
  platformBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: LIGHT_PINK },
  platformBadgeText: { fontFamily: F.bold, fontSize: 10, color: PINK },
  productBadge:     { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: LIGHT_PINK, borderWidth: 1, borderColor: BORDER },
  productBadgeText: { fontFamily: F.semiBold, fontSize: 9, color: MUTED },

  // 모달 스타일
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    width: '90%', maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  modalTitle:  { fontFamily: F.bold, fontSize: 16, color: DARK_ROSE, marginBottom: 6 },
  modalDesc:   { fontFamily: F.regular, fontSize: 11, color: MUTED, lineHeight: 16, marginBottom: 14 },
  modalScroll: { flexGrow: 0, marginBottom: 14 },
  formGroup: { marginBottom: 12 },
  formLabel: { fontFamily: F.semiBold, fontSize: 12, color: DARK_ROSE, marginBottom: 4 },
  formInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    fontFamily: F.regular, fontSize: 12, color: DARK_ROSE,
  },
  formInputMultiline: { textAlignVertical: 'top', height: 60 },
  regionSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  regionSelectChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  regionSelectChipActive: { backgroundColor: PINK, borderColor: PINK },
  regionSelectChipText: { fontFamily: F.regular, fontSize: 11, color: '#475569' },
  regionSelectChipTextActive: { color: '#fff', fontFamily: F.bold },
  modalBtns:   { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, backgroundColor: LIGHT_PINK, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  modalCancelText:  { fontFamily: F.semiBold, fontSize: 13, color: DARK_ROSE },
  modalConfirm:     { flex: 1, backgroundColor: DARK_ROSE, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  modalConfirmText: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
})
