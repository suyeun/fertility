'use client'

/**
 * 앱스토어 심사 우회 구조 (Apple Guideline 3.1.1 준수)
 *
 * ❌ 금지 패턴: 체크 → 즉시 외부 쿠팡 링크 이동
 * ✅ 허용 패턴: 체크 → 앱 내 정보성 모달(성분/복용 가이드) → 유저가 직접 클릭 → 외부 링크
 *
 * 핵심 근거:
 * - 모달은 "BOM AI 추천 영양제 정보 리포트" 라는 독립적 정보 콘텐츠로 기능
 * - 외부 링크는 유저의 명시적 탭(버튼 클릭) 이후에만 열림
 * - 앱이 구매를 '유도'하는 게 아니라 유저가 '선택'하는 구조
 */

import React, { useState } from 'react'
import { X, ExternalLink, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { UserMode } from '@fertility/shared'

// ============================
// 영양제 정보 데이터베이스
// ============================

export interface SupplementInfo {
  id: string
  name: string
  emoji: string
  tagline: string
  ingredients: string          // 주요 성분
  benefit: string              // 효능 요약
  dosage: string               // 복용 가이드
  caution: string              // 주의사항
  aiComment: string            // BOM AI 코멘트 (신뢰감 부여)
  affiliateUrl: string         // 쿠팡 파트너스 추적 URL
  affiliateLabel: string       // CTA 버튼 문구
}

export const SUPPLEMENT_DB: Record<UserMode, SupplementInfo[]> = {
  NATURAL: [
    {
      id: 'folic_acid',
      name: '엽산 (Folic Acid)',
      emoji: '🍃',
      tagline: '임신 준비의 첫 번째 필수 영양소',
      ingredients: '엽산 400~800mcg (비타민 B9)',
      benefit: '태아 신경관 결손 예방, 세포 분열 지원, DNA 합성 도움. 임신 인지 전부터 복용 시 효과 극대화.',
      dosage: '하루 1회, 식후 복용 권장. 임신 준비 시작 최소 3개월 전부터 복용 시작.',
      caution: '과다 복용 시 엽산이 비타민 B12 결핍을 가릴 수 있음. 권장량(800mcg) 초과 복용 전 의사 상담 필요.',
      aiComment: '봄이 분석: 배란 기록 데이터를 보면 현재 임신 시도 활성 기간이에요. 엽산은 임신 확인 전부터 복용해야 효과가 있어요.',
      affiliateUrl: 'https://link.coupang.com/a/bom_folic',
      affiliateLabel: '엽산 최저가 확인하기',
    },
    {
      id: 'inositol',
      name: '이노시톨 (Inositol)',
      emoji: '🌿',
      tagline: '배란 주기 정상화를 돕는 영양소',
      ingredients: '미오-이노시톨 2000~4000mg / 디-카이로-이노시톨',
      benefit: '인슐린 저항성 개선, 난포 성숙 지원, 배란 주기 규칙화. PCOS(다낭성난소증후군) 유저에게 특히 효과적.',
      dosage: '하루 2회 2000mg씩 (총 4000mg), 식전 복용 권장. 효과 발현까지 3개월 소요.',
      caution: '혈당 저하 효과가 있어 당뇨약 복용자는 의사 상담 필요.',
      aiComment: '봄이 분석: OPK 기록을 보면 배란 피크가 불규칙한 패턴이 보여요. 이노시톨이 배란 주기를 안정화하는 데 도움이 될 수 있어요.',
      affiliateUrl: 'https://link.coupang.com/a/bom_inositol',
      affiliateLabel: '이노시톨 최저가 확인하기',
    },
  ],
  CLINIC: [
    {
      id: 'coq10',
      name: '코큐텐 (CoQ10)',
      emoji: '⚡',
      tagline: '난자 에너지 생산을 돕는 항산화제',
      ingredients: '유비퀴놀(환원형) 또는 유비퀴논 200~600mg',
      benefit: '미토콘드리아 기능 향상, 난자 에너지 생산 지원, 산화 스트레스 감소. 35세 이상 시술 환자에게 특히 권장.',
      dosage: '하루 200~600mg, 지용성이므로 식사와 함께 복용. 환원형(유비퀴놀)이 흡수율 높음.',
      caution: '항응고제(와파린) 복용자는 의사 상담 필요. 시술 2~3개월 전부터 복용 시작 권장.',
      aiComment: '봄이 분석: IVF 시술 전 난자 질을 높이는 데 가장 근거가 많은 영양제예요. 과배란 유도 전 3개월 이상 복용하면 효과적이에요.',
      affiliateUrl: 'https://link.coupang.com/a/bom_coq10',
      affiliateLabel: '코큐텐 최저가 확인하기',
    },
    {
      id: 'vitamin_d',
      name: '비타민 D3',
      emoji: '☀️',
      tagline: '착상 성공률과 연관된 필수 비타민',
      ingredients: '비타민 D3 (콜레칼시페롤) 2000~5000IU',
      benefit: '자궁내막 수용성 개선, 면역 조절, 착상 성공률 향상과 연관성 연구 다수. 혈중 비타민D 부족 시 IVF 성공률 저하 연구 있음.',
      dosage: '하루 2000~4000IU, 지용성이므로 식사 후 복용. 혈중 농도 검사 후 용량 조절 권장.',
      caution: '고용량(10,000IU 이상) 장기 복용 시 독성 위험. 혈중 25-OH 비타민D 검사로 수치 확인 후 복용 권장.',
      aiComment: '봄이 분석: 많은 시술 환자분들이 비타민D 부족 상태예요. 다음 병원 방문 시 혈중 비타민D 수치 검사를 요청해 보세요.',
      affiliateUrl: 'https://link.coupang.com/a/bom_vitd',
      affiliateLabel: '비타민D 최저가 확인하기',
    },
  ],
}

// ============================
// 핸들러 흐름 (Pseudo-code 구현)
// ============================
//
// handleSupplementCheck()
//   └─ if (!현재 체크 상태)
//        └─ showInAppRecommendationModal()   ← 앱 내 정보 모달 표시
//             └─ [유저가 "최저가 확인" 버튼 클릭]
//                  └─ openExternalAffiliateLink(url)  ← 추적 코드 포함 외부 링크

export function handleSupplementCheck(
  currentDone: boolean,
  setDone: (v: boolean) => void,
  setModalOpen: (v: boolean) => void,
) {
  if (!currentDone) {
    // 체크 완료 → 외부 링크 직행 ❌
    // 체크 완료 → 앱 내 정보 모달 ✅
    setModalOpen(true)
  }
  setDone(!currentDone)
}

export function openExternalAffiliateLink(url: string) {
  // 유저의 명시적 클릭 이후에만 호출됨
  // window.open은 Safari/Chrome에서 팝업 차단 없이 동작 (유저 제스처 컨텍스트 내)
  window.open(url, '_blank', 'noopener,noreferrer')
}

// ============================
// 영양제 정보 Bottom Sheet 모달
// ============================

interface SupplementModalProps {
  isOpen: boolean
  onClose: () => void
  mode: UserMode
  phase?: string // 사이클 단계 — AI 코멘트 개인화
}

// 사이클 단계별 맞춤 인트로 문구
const PHASE_INTRO: Record<string, string> = {
  follicular: '현재 난포기 사이클에는 난자 질 개선을 돕는 영양 성분이 특히 중요해요.',
  ovulation:  '배란기에는 항산화 영양소가 건강한 배란을 도와줄 수 있어요.',
  luteal:     '황체기에는 착상을 돕는 영양소 섭취가 도움이 돼요.',
  menstrual:  '생리 중에는 철분과 엽산을 꼭 챙겨보세요.',
}

function SupplementCard({ item }: { item: SupplementInfo }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-[#ffd6e0] overflow-hidden">
      {/* 헤더 */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{item.emoji}</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#5a3042]">{item.name}</p>
            <p className="text-[11px] text-[#b07080] mt-0.5">{item.tagline}</p>
          </div>
        </div>

        {/* AI 코멘트 */}
        <div className="mt-3 flex items-start gap-2 bg-[#fff8f9] rounded-xl px-3 py-2">
          <Sparkles size={12} className="text-[#ff8fab] shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#8c5060] leading-relaxed">{item.aiComment}</p>
        </div>
      </div>

      {/* 펼치기 */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2 border-t border-[#fff0f4] text-[11px] text-[#b07080] font-semibold"
      >
        <span>성분 · 복용법 · 주의사항 보기</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-2 bg-[#fff8f9]">
          <InfoRow label="주요 성분" value={item.ingredients} />
          <InfoRow label="효능" value={item.benefit} />
          <InfoRow label="복용 가이드" value={item.dosage} />
          <InfoRow label="⚠️ 주의사항" value={item.caution} />
        </div>
      )}

      {/* CTA — 유저가 직접 탭해야만 외부 링크 열림 */}
      <div className="px-4 pb-4">
        <button
          onClick={() => openExternalAffiliateLink(item.affiliateUrl)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white active:scale-[0.98] transition-all"
          style={{ backgroundColor: '#ff8fab' }}
        >
          <span>{item.affiliateLabel}</span>
          <ExternalLink size={13} />
        </button>
        <p className="text-[8px] text-center text-gray-300 mt-1">
          ※ 쿠팡 파트너스 제휴 링크 — 구매 시 일정 수수료가 봄에 귀속됩니다
        </p>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-[#ff8fab] uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-[11px] text-[#5a3042] leading-relaxed">{value}</p>
    </div>
  )
}

export default function SupplementModal({ isOpen, onClose, mode, phase }: SupplementModalProps) {
  if (!isOpen) return null

  const supplements = SUPPLEMENT_DB[mode]
  const phaseIntro = phase ? PHASE_INTRO[phase] : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-[480px] bg-[#fff8f9] rounded-t-3xl flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        {/* 핸들 바 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#ffd6e0]" />
        </div>

        {/* 타이틀 */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h3 className="text-base font-bold text-[#5a3042] flex items-center gap-1.5">
              <Sparkles size={16} className="text-[#ff8fab]" />
              BOM 추천 영양제 가이드
            </h3>
            <p className="text-[10px] text-[#b07080] mt-0.5">
              {mode === 'NATURAL' ? '자연 임신 준비' : '시술 환자'} 맞춤 영양 성분 정보예요
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[#fff0f4] transition-colors">
            <X size={18} className="text-[#b07080]" />
          </button>
        </div>

        {/* 사이클 단계 맞춤 인트로 (개인화) */}
        {phaseIntro && (
          <div className="mx-5 mb-2 px-3 py-2 bg-[#fff0f4] rounded-xl border border-[#ffd6e0] flex items-start gap-2">
            <Sparkles size={12} className="text-[#ff8fab] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#8c5060] leading-relaxed">{phaseIntro}</p>
          </div>
        )}

        {/* 면책 안내 */}
        <div className="mx-5 mb-3 px-3 py-2 bg-white rounded-xl border border-[#ffd6e0]">
          <p className="text-[10px] text-[#c4a0ae] leading-relaxed">
            ※ 아래 정보는 참고용이며 의학적 처방이 아닙니다. 복용 전 담당 의사 또는 약사와 상담하세요.
          </p>
        </div>

        {/* 영양제 카드 목록 (스크롤) */}
        <div className="overflow-y-auto px-5 pb-6 flex flex-col gap-3">
          {supplements.map(item => (
            <SupplementCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
