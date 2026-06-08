'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useGuest } from '../context/GuestContext'
import type { UserMode } from '@fertility/shared'

const MODES: {
  mode: UserMode
  emoji: string
  title: string
  sub: string
  points: string[]
  color: string
  bg: string
  border: string
}[] = [
  {
    mode: 'NATURAL',
    emoji: '🌱',
    title: '자연임신 준비 화면 둘러보기',
    sub: '배란테스트기·기초체온 기록, 가임기 예측, 영양제 가이드',
    points: [
      '배란 D-Day & 임신 확률 시각화',
      'OPK / BBT 데이터 대시보드',
      '오늘 할 일 체크리스트',
      '루나 챗봇 자연임신 가이드',
    ],
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  {
    mode: 'CLINIC',
    emoji: '🏥',
    title: '병원 시술 과정 화면 둘러보기',
    sub: 'IVF·IUI·FET 시술 일정, 약물 알림, 호르몬 수치 기록',
    points: [
      '시술 타임라인 & D-Day 관리',
      '난포/호르몬 수치 대시보드',
      '주사·약물 투약 체크리스트',
      '루나 챗봇 시술 전문 가이드',
    ],
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
]

export default function TourPage() {
  const router = useRouter()
  const { enterGuestMode } = useGuest()

  const handleSelect = (mode: UserMode) => {
    enterGuestMode(mode)
    router.push('/tour/preview')
  }

  return (
    <main className="min-h-screen bg-[#fff8f9] flex flex-col items-center justify-center p-5">

      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="text-3xl mb-2">🌸</div>
        <h1 className="text-xl font-bold text-[#5a3042] leading-snug">
          Lunera에 오신 것을 환영해요!
        </h1>
        <p className="text-sm text-[#b07080] mt-2 leading-relaxed max-w-xs">
          어떤 준비를 하고 계시는지 선택하시면<br />맞춤형 가이드 화면을 보여드려요.
        </p>
      </div>

      {/* 모드 선택 카드 */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {MODES.map(m => (
          <button
            key={m.mode}
            onClick={() => handleSelect(m.mode)}
            className="flex flex-col text-left p-5 rounded-3xl border-2 active:scale-[0.98] transition-all"
            style={{ backgroundColor: m.bg, borderColor: m.border }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{m.emoji}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: m.color }}>{m.title}</p>
                <p className="text-[11px] text-[#b07080] mt-0.5">{m.sub}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              {m.points.map((pt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: m.color }}>✓</span>
                  <span className="text-[11px] text-[#5a3042]">{pt}</span>
                </div>
              ))}
            </div>

            <div
              className="w-full py-2.5 rounded-2xl text-sm font-bold text-white text-center"
              style={{ backgroundColor: m.color }}
            >
              이 화면으로 둘러보기 →
            </div>
          </button>
        ))}
      </div>

      {/* 로그인으로 돌아가기 */}
      <button
        onClick={() => router.push('/login')}
        className="mt-6 text-xs text-[#c4a0ae] underline underline-offset-2"
      >
        ← 로그인 화면으로 돌아가기
      </button>

      <p className="mt-4 text-[9px] text-[#d1c0c8] text-center">
        둘러보기는 저장되지 않아요. 기록 시작은 가입 후 가능합니다.
      </p>
    </main>
  )
}
