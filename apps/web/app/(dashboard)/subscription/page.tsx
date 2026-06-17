'use client'

import { Lock, Sparkles, Bell, BarChart2, CalendarPlus, CheckCircle2 } from 'lucide-react'

const FEATURES = [
  { icon: <Bell size={20} className="text-[#ff8fab]" />, title: '약물·주사 정시 알림', desc: '주사·질정·경구약 투여 시각에 맞춰 정시 푸시 알림' },
  { icon: <CalendarPlus size={20} className="text-[#ff8fab]" />, title: '다회차 시술 일정 무제한', desc: '2회차부터 모든 시술 일정을 한눈에 관리' },
  { icon: <BarChart2 size={20} className="text-[#ff8fab]" />, title: '호르몬·주기 추이 분석', desc: '수치·패턴·시술 결과를 장기 차트로 분석' },
  { icon: <Sparkles size={20} className="text-[#ff8fab]" />, title: 'AI 채팅 무제한', desc: '수치·주기·시술 Q&A, 감정 일기 AI 분석' },
]

const PLANS = [
  {
    id: 'annual',
    label: '연간 구독',
    price: '연 59,000원',
    monthly: '월 4,917원 환산',
    badge: '🔥 최대 40% 할인',
    recommended: true,
  },
  {
    id: 'monthly',
    label: '월간 구독',
    price: '월 8,900원',
    monthly: null,
    badge: null,
    recommended: false,
  },
]

export default function SubscriptionPage() {
  const handleCTA = () => {
    alert('BOM 앱에서 구독을 시작하세요 🌸\nApp Store 또는 Google Play에서 BOM을 검색하세요.')
  }

  return (
    <div className="min-h-screen bg-[#fffbfc] flex flex-col items-center py-12 px-4">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🌸</div>
        <h1 className="text-2xl font-extrabold text-[#5a3042] mb-2">BOM 프리미엄</h1>
        <p className="text-sm text-[#b07080]">임신 준비의 모든 것을 함께해요</p>
      </div>

      {/* 기능 목록 */}
      <div className="w-full max-w-md bg-[#fff0f4] rounded-2xl p-5 mb-8 space-y-4">
        {FEATURES.map((f, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">{f.icon}</div>
            <div>
              <p className="text-sm font-semibold text-[#5a3042]">{f.title}</p>
              <p className="text-xs text-[#b07080] leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 플랜 카드 */}
      <div className="w-full max-w-md space-y-3 mb-8">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`relative border-2 rounded-2xl p-5 bg-white transition-all ${
              plan.recommended ? 'border-[#ff8fab] bg-[#fff8fa]' : 'border-[#ffd6e0]'
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 right-4 bg-[#ff8fab] text-white text-[10px] font-bold rounded-full px-3 py-1">
                {plan.badge}
              </span>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-base font-bold ${plan.recommended ? 'text-[#5a3042]' : 'text-[#b07080]'}`}>
                  {plan.label}
                </p>
                {plan.monthly && (
                  <p className="text-xs text-[#b07080] mt-0.5">{plan.monthly}</p>
                )}
              </div>
              <p className={`text-lg font-extrabold ${plan.recommended ? 'text-[#ff8fab]' : 'text-[#b07080]'}`}>
                {plan.price}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 모바일 앱 유도 CTA */}
      <div className="w-full max-w-md bg-white border border-[#ffd6e0] rounded-2xl p-5 mb-6 text-center">
        <div className="flex justify-center mb-3">
          <Lock size={20} className="text-[#ff8fab]" />
        </div>
        <p className="text-sm font-semibold text-[#5a3042] mb-1">구독은 모바일 앱에서 시작해요</p>
        <p className="text-xs text-[#b07080] mb-4 leading-relaxed">
          iOS App Store 또는 Google Play에서{'\n'}BOM 앱을 설치하고 14일 무료체험을 시작하세요.
        </p>
        <button
          onClick={handleCTA}
          className="w-full py-3 rounded-2xl font-bold text-sm bg-[#ff8fab] text-white shadow-sm hover:bg-[#ff6b8b] transition-colors"
        >
          모바일 앱에서 구독 시작 🌸
        </button>
      </div>

      {/* 체크리스트 */}
      <div className="w-full max-w-md space-y-2 mb-6">
        {['14일 무료체험 후 자동 결제', '언제든지 App Store/Play Store에서 해지 가능', '구독 취소 후에도 만료일까지 이용 가능'].map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-[#b07080]">
            <CheckCircle2 size={14} className="text-[#ff8fab] shrink-0" />
            {t}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#c4a0ae] text-center leading-relaxed max-w-xs">
        구독은 자동 갱신되며 갱신 전 24시간 이내에 요금이 청구됩니다.{' '}
        구매 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
      </p>
    </div>
  )
}
