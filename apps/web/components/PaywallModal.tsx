'use client'

// ============================
// 페이월 모달 — CLINIC 프리미엄 기능 잠금 시 트리거
//
// 실제 구매 플로우는 RevenueCat SDK (모바일 전용)가 담당한다.
// 웹에서는 "모바일 앱에서 구독 시작" 유도 또는 향후 Stripe/웹 결제 연동 지점.
//
// showPaywall(source) 호출 시 이 모달을 렌더링한다.
// source 파라미터는 전환율 분석용으로 사용한다.
// ============================

import React from 'react'
import { X, Lock, Sparkles, Bell, BarChart2, CalendarPlus } from 'lucide-react'
import type { PaywallSource } from '@fertility/shared'

const SOURCE_CONTENT: Record<PaywallSource, {
  title: string
  description: string
  icon: React.ReactNode
}> = {
  medication_reminder: {
    title: '약물 알림은 프리미엄 기능이에요',
    description: '주사·질정·경구약 투여 시각에 맞춰\n정시 푸시 알림을 보내드려요.',
    icon: <Bell size={32} className="text-[#ff8fab]" />,
  },
  multi_schedule: {
    title: '다회차 일정 관리는 프리미엄 기능이에요',
    description: '2회차부터는 프리미엄으로\n모든 시술 일정을 한눈에 관리하세요.',
    icon: <CalendarPlus size={32} className="text-[#ff8fab]" />,
  },
  analytics: {
    title: '추이 분석은 프리미엄 기능이에요',
    description: '호르몬 수치·주기 패턴·시술 결과를\n장기 차트로 분석해드려요.',
    icon: <BarChart2 size={32} className="text-[#ff8fab]" />,
  },
  generic: {
    title: '프리미엄 기능이에요',
    description: '더 많은 기능을 이용하려면\nBOM 프리미엄을 시작해보세요.',
    icon: <Sparkles size={32} className="text-[#ff8fab]" />,
  },
}

const PREMIUM_FEATURES = [
  { emoji: '💊', text: '약물·주사 정시 알림 (핵심)' },
  { emoji: '📅', text: '다회차 시술 일정 무제한 등록' },
  { emoji: '📊', text: '호르몬·주기 추이 분석 차트' },
  { emoji: '🤖', text: 'AI 채팅 무제한 — 수치·시술 Q&A' },
  { emoji: '🌸', text: '감정 일기 AI 분석 + 매일 응원' },
]

interface PaywallModalProps {
  source: PaywallSource
  onClose: () => void
}

export default function PaywallModal({ source, onClose }: PaywallModalProps) {
  const content = SOURCE_CONTENT[source]

  // TODO: [결제 연동] 웹 결제 플로우 미구현.
  // 현재는 모바일 앱 유도로 대체.
  // 향후 Stripe / RevenueCat web billing 연동 시 이 핸들러에 구현.
  const handleStartTrial = () => {
    // placeholder — 웹 결제 플로우 연동 전까지는 모바일 앱 안내 표시
    alert('모바일 BOM 앱에서 14일 무료체험을 시작하세요 🌸\nApp Store / Google Play에서 BOM을 검색하세요.')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* 헤더 */}
        <div className="relative bg-gradient-to-br from-[#fff0f4] to-[#ffd6e0] px-6 pt-8 pb-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#b07080] hover:text-[#5a3042] transition-colors"
            aria-label="닫기"
          >
            <X size={20} />
          </button>

          <div className="flex justify-center mb-3">{content.icon}</div>
          <div className="inline-flex items-center gap-1.5 bg-[#ff8fab]/10 border border-[#ff8fab]/20 rounded-full px-3 py-1 mb-3">
            <Lock size={11} className="text-[#ff8fab]" />
            <span className="text-[10px] font-semibold text-[#ff8fab]">프리미엄 전용</span>
          </div>
          <h2 className="text-base font-bold text-[#5a3042] leading-snug whitespace-pre-line">
            {content.title}
          </h2>
          <p className="text-xs text-[#b07080] mt-1.5 whitespace-pre-line leading-relaxed">
            {content.description}
          </p>
        </div>

        <div className="px-6 py-5">
          {/* 프리미엄 기능 목록 */}
          <p className="text-[10px] font-semibold text-[#b07080] mb-3">프리미엄 포함 기능</p>
          <ul className="space-y-2 mb-5">
            {PREMIUM_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-xs text-[#5a3042]">
                <span className="text-base">{f.emoji}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          {/* 14일 무료체험 CTA */}
          <button
            onClick={handleStartTrial}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-[#ff8fab] text-white shadow-sm active:scale-[0.98] transition-all"
          >
            14일 무료체험 시작
          </button>

          <p className="text-[9px] text-[#c4a0ae] text-center mt-2 leading-relaxed">
            무료체험 후 자동 결제됩니다 · 언제든지 해지 가능
          </p>

          <button
            onClick={onClose}
            className="w-full mt-2 py-2 text-xs text-[#b07080] hover:text-[#5a3042] transition-colors"
          >
            나중에
          </button>
        </div>

      </div>
    </div>
  )
}
