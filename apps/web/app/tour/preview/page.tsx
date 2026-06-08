'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGuest } from '../../context/GuestContext'
import { Home, CalendarDays, Users, Sparkles, Lock, CheckCircle2, Circle, X } from 'lucide-react'

// ============================
// 로그인 유도 팝업
// 게스트가 인터랙션 시도 시 표시
// ============================

function LoginPrompt({ onClose, onLogin, guestMode }: {
  onClose: () => void
  onLogin: () => void
  guestMode: 'NATURAL' | 'CLINIC' | null
}) {
  const router = useRouter()

  const handleSignup = () => {
    // 게스트 모드는 sessionStorage에 이미 저장됨
    // signup 완료 시 AuthContext에서 자동으로 프로필에 동기화
    router.push('/signup')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl p-6 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌸</span>
            <h3 className="text-base font-bold text-[#5a3042]">기록을 시작하려면 가입이 필요해요</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#b07080]"><X size={18} /></button>
        </div>

        <div className="bg-[#fff8f9] rounded-2xl p-4 border border-[#ffd6e0]">
          <p className="text-xs text-[#8c5060] leading-relaxed">
            지금 가입하면 선택하신{' '}
            <b>{guestMode === 'NATURAL' ? '🌱 자연임신 모드' : '🏥 시술 모드'}</b>가
            자동으로 설정되어 맞춤형 대시보드로 바로 시작할 수 있어요.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSignup}
            className="w-full py-3.5 bg-[#ff8fab] text-white rounded-2xl text-sm font-bold active:scale-[0.98] transition-all"
          >
            무료 가입하고 기록 시작하기 →
          </button>
          <button
            onClick={() => { onClose(); router.push('/login') }}
            className="w-full py-2.5 bg-[#fff0f4] text-[#ff8fab] rounded-2xl text-sm font-semibold"
          >
            이미 계정이 있어요 → 로그인
          </button>
        </div>

        <p className="text-[9px] text-[#c4a0ae] text-center">무료로 시작 · 신용카드 불필요</p>
      </div>
    </div>
  )
}

// ============================
// 데모용 더미 데이터
// ============================

const DEMO_NATURAL = {
  cycleDay: 14, phase: '배란기', dDay: 'D-1',
  bbt: 36.72, opk: 8.5, opkLabel: '피크 🔴',
  streak: [true, true, true, false, false, false, false],
}

const DEMO_CLINIC = {
  cycleDay: 8, stage: 'IVF 신선 1차', subStage: '과배란 유도 8일째', dDay: 'D-5',
  follicle: { left: 3, right: 4, max: 16 },
  nextSchedule: '6월 13일 난자 채취',
  streak: [true, true, true, true, false, false, false],
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

// ============================
// 게스트 대시보드 미리보기
// ============================

export default function TourPreviewPage() {
  const { guestMode } = useGuest()
  const router = useRouter()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'community' | 'chat'>('home')

  // 게스트가 인터랙션 시도 시 로그인 유도
  const requireLogin = () => setShowLoginPrompt(true)

  if (!guestMode) {
    // 모드 미선택 — 선택 화면으로 리다이렉트
    if (typeof window !== 'undefined') router.replace('/tour')
    return null
  }

  const isNatural = guestMode === 'NATURAL'
  const demo = isNatural ? DEMO_NATURAL : DEMO_CLINIC

  return (
    <div className="min-h-screen bg-[#fff8f9] flex flex-col pb-20">

      {/* 게스트 모드 배너 */}
      <div
        className="flex items-center justify-between px-4 py-2 text-[10px] font-semibold"
        style={{ backgroundColor: isNatural ? '#dcfce7' : '#ede9fe', color: isNatural ? '#16a34a' : '#7c3aed' }}
      >
        <span>{isNatural ? '🌱 자연임신 모드 미리보기' : '🏥 시술 모드 미리보기'}</span>
        <div className="flex items-center gap-2">
          <Lock size={10} />
          <span>게스트 모드</span>
          <button
            onClick={() => router.push('/signup')}
            className="px-2 py-0.5 rounded-full text-white text-[9px] font-bold"
            style={{ backgroundColor: isNatural ? '#16a34a' : '#7c3aed' }}
          >
            가입하기
          </button>
        </div>
      </div>

      {/* 헤더 */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-[#ffd6e0] bg-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <span className="font-bold text-base text-rose-950">Lunera</span>
        </div>
        <button onClick={() => router.push('/signup')}
          className="text-xs font-bold text-[#ff8fab] bg-[#fff0f4] px-3 py-1.5 rounded-full border border-[#ffd6e0]">
          무료 가입
        </button>
      </header>

      {/* 콘텐츠 영역 */}
      <main className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">

        {/* 인사 */}
        <div>
          <h2 className="text-[18px] font-semibold text-[#5a3042]">
            안녕하세요 {isNatural ? '🌱' : '🏥'}
          </h2>
          <p className="text-[12px] text-[#b07080] mt-0.5">루네라가 따뜻한 기적을 함께 만들어가요</p>
        </div>

        {/* HeroCard 데모 */}
        <div className="rounded-[24px] p-5 relative overflow-hidden"
          style={{ backgroundColor: isNatural ? '#ff8fab' : '#8b5cf6' }}>
          <div className="absolute top-5 right-5 text-right">
            <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {isNatural ? '배란 예정일' : '다음 일정'}
            </p>
            <p className="text-[17px] font-bold text-white">
              {isNatural ? '6월 10일' : DEMO_CLINIC.nextSchedule}
            </p>
            <span className="inline-block mt-1.5 text-[11px] font-bold text-white rounded-full px-2.5 py-0.5"
              style={{ background: 'rgba(255,255,255,0.28)' }}>
              {demo.dDay}
            </span>
          </div>

          <p className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {isNatural ? '오늘의 사이클 상태' : '현재 시술'}
          </p>
          <div className="text-[22px] font-bold text-white mb-1 pr-28">
            {isNatural ? `🌸 ${DEMO_NATURAL.phase}` : `🧬 ${DEMO_CLINIC.stage}`}
          </div>
          <div className="text-[12px] mb-3 pr-24" style={{ color: 'rgba(255,255,255,0.85)' }}>
            사이클 {demo.cycleDay}일째
            {!isNatural && ` · ${DEMO_CLINIC.subStage}`}
          </div>

          {isNatural && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-white/80">오늘 임신 확률</span>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: i <= 4 ? '#ef4444' : 'rgba(255,255,255,0.25)' }} />
                ))}
              </div>
              <span className="text-[11px] font-bold text-white">높음 🔥</span>
            </div>
          )}

          <div className="rounded-2xl px-4 py-3 text-[12px] text-white leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            {isNatural
              ? '💗 지금은 가임기! 오늘 타이밍을 놓치지 마세요'
              : '과배란 유도 중이에요. 정해진 시간에 주사를 맞아요 💉'
            }
          </div>
        </div>

        {/* 데이터 위젯 데모 */}
        {isNatural ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 bg-white border border-[#ffd6e0] flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-[#5a3042]">배란테스트기</span>
                <span className="text-[9px] text-[#b07080] bg-[#fff0f4] px-1.5 py-0.5 rounded-full">OPK</span>
              </div>
              <div className="text-2xl font-bold text-red-500">
                {DEMO_NATURAL.opk}<span className="text-sm text-[#b07080]">/10</span>
              </div>
              <span className="text-xs font-semibold text-red-500">{DEMO_NATURAL.opkLabel}</span>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-red-500" style={{ width: `${DEMO_NATURAL.opk * 10}%` }} />
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-white border border-[#ffd6e0] flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-[#5a3042]">기초체온</span>
                <span className="text-[9px] text-[#b07080] bg-[#fff0f4] px-1.5 py-0.5 rounded-full">BBT</span>
              </div>
              <div className="text-2xl font-bold text-[#ff8fab]">
                {DEMO_NATURAL.bbt.toFixed(2)}<span className="text-sm text-[#b07080]">℃</span>
              </div>
              <span className="text-xs text-[#b07080]">고온기 ↑</span>
              <p className="text-[9px] text-[#c4a0ae]">오늘 체온: {DEMO_NATURAL.bbt.toFixed(2)}℃</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 bg-white border border-[#ffd6e0] flex flex-col gap-2">
              <span className="text-xs font-bold text-[#5a3042]">난포 현황</span>
              <div className="text-sm font-bold text-[#8b5cf6]">
                좌 {DEMO_CLINIC.follicle.left}개 · 우 {DEMO_CLINIC.follicle.right}개
              </div>
              <span className="text-xs text-[#b07080]">최대 {DEMO_CLINIC.follicle.max}mm</span>
            </div>
            <div className="rounded-2xl p-4 bg-white border border-[#ffd6e0] flex flex-col gap-2">
              <span className="text-xs font-bold text-[#5a3042]">다음 일정</span>
              <div className="text-sm font-bold text-[#8b5cf6]">{DEMO_CLINIC.nextSchedule}</div>
              <span className="text-xs text-[#b07080]">{demo.dDay}</span>
            </div>
          </div>
        )}

        {/* 오늘 할 일 (잠금 상태) */}
        <div>
          <p className="text-[13px] font-semibold text-[#5a3042] mb-2">오늘 할 일</p>
          <div className="flex flex-col gap-2">
            {(isNatural
              ? ['🌡️ 기초체온 측정하기', '🔬 배란테스트기 기록하기', '💊 영양제 챙기기', '❤️ 오늘의 숙제 체크']
              : ['💉 고날에프 150IU · 오전 10:00', '💊 에스트로겐 2mg', '💊 영양제 챙기기', '📝 오늘 증상 기록하기']
            ).map((task, i) => (
              <button
                key={i}
                onClick={requireLogin}
                className="flex items-center gap-3 py-3 px-4 rounded-2xl bg-white border border-[#ffd6e0] text-left active:scale-[0.98] transition-all"
                style={{ boxShadow: '0 1px 4px -1px rgba(255,143,171,0.1)' }}
              >
                <Circle size={20} className="text-[#ffd6e0] shrink-0" />
                <span className="text-sm text-[#5a3042]">{task}</span>
                <Lock size={12} className="ml-auto text-[#ffd6e0] shrink-0" />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#c4a0ae] text-center mt-2">
            🔒 기록 기능은 가입 후 사용 가능해요
          </p>
        </div>

        {/* 이번 주 기록 (데모) */}
        <div className="bg-white rounded-2xl p-4 border border-[#ffd6e0]">
          <p className="text-[13px] font-semibold text-[#5a3042] mb-3">이번 주 기록</p>
          <div className="flex justify-around">
            {WEEKDAYS.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] text-[#b07080]">{day}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  demo.streak[i] ? 'bg-[#ff8fab]' : 'bg-[#fff0f4] border border-[#ffd6e0]'
                }`}>
                  {demo.streak[i] && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#ff8fab] to-[#ff6b8f] rounded-3xl p-5 text-center">
          <p className="text-white font-bold text-sm mb-1">마음에 드셨나요? 🌸</p>
          <p className="text-white/80 text-xs mb-4">가입하면 실제 데이터로 바로 시작할 수 있어요</p>
          <button
            onClick={() => router.push('/signup')}
            className="w-full py-3 bg-white text-[#ff8fab] rounded-2xl text-sm font-bold active:scale-[0.98] transition-all"
          >
            무료 가입하고 시작하기 →
          </button>
        </div>

      </main>

      {/* 하단 탭 바 (미리보기 — 잠금) */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-white border-t border-[#ffd6e0] px-2 py-2 flex justify-between items-center rounded-t-3xl">
        {[
          { icon: Home, label: '홈', id: 'home' },
          { icon: CalendarDays, label: '캘린더', id: 'calendar' },
          { icon: Users, label: '이야기방', id: 'community' },
          { icon: Sparkles, label: 'AI 상담', id: 'chat' },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); if (tab.id !== 'home') requireLogin() }}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-all ${
                isActive ? 'text-[#ff8fab]' : 'text-[#c4a0ae]'
              }`}
            >
              <Icon size={isActive ? 22 : 19} />
              <span className="text-[9px] font-medium">{tab.label}</span>
              {!isActive && <Lock size={7} className="text-[#ffd6e0] -mt-0.5" />}
            </button>
          )
        })}
      </nav>

      {/* 로그인 유도 팝업 */}
      {showLoginPrompt && (
        <LoginPrompt
          onClose={() => setShowLoginPrompt(false)}
          onLogin={() => router.push('/login')}
          guestMode={guestMode}
        />
      )}
    </div>
  )
}
