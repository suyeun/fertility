// apps/web/app/(dashboard)/layout.tsx
'use client'

import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Calendar, BarChart3, Users, Syringe, Settings } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-gradient-soft-rose min-h-screen">
        <span className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
        <p className="mt-4 text-xs font-semibold text-rose-600/70 animate-pulse">
          따뜻한 봄을 불러오는 중...🌸
        </p>
      </div>
    )
  }

  // 로그인되지 않은 경우 children 렌더링하지 않고 리디렉트 대기 (AuthContext에서 처리됨)
  if (!user) return null

  const navItems = [
    { href: '/community',  icon: Users,    label: '이야기방' },
    { href: '/treatment',  icon: Syringe,  label: '일정' },
    { href: '/',           icon: Home,     label: '홈' },
    { href: '/records',    icon: BarChart3, label: '기록' },
    { href: '/calendar',   icon: Calendar, label: '캘린더' },
  ]

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'natural': return '🌱 자연임신'
      case 'iui': return '🧪 인공수정'
      case 'ivf': return '🧬 시험관'
      case 'fet': return '❄️ 동결이식'
      case 'pregnant': return '🌸 임신성공'
      default: return '🌱 준비중'
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background pb-20 relative animate-fade-in">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 glass shadow-sm border-b border-rose-100/40 px-4 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <div>
            <h1 className="font-bold text-base text-rose-950 font-outfit tracking-tight">BOM</h1>
            {profile && (
              <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
                {getStageLabel(profile.treatmentStage)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile && (
            <span className="text-xs font-semibold text-rose-900/70">
              {profile.name}님
            </span>
          )}
          <Link
            href="/settings"
            className="p-2 text-rose-400 hover:text-rose-600 active-press transition-colors rounded-xl hover:bg-rose-50"
            aria-label="설정"
          >
            <Settings size={16} />
          </Link>
        </div>
      </header>

      {/* 본문 영역 */}
      <main className="flex-1 p-4 overflow-y-auto">
        {children}
      </main>

      {/* 하단 탭 바 (모바일 네비게이션) */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 glass border-t border-rose-100/40 px-2 py-2 flex justify-between items-center shadow-lg rounded-t-3xl">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-2xl transition-all ${
                isActive
                  ? 'text-primary font-bold scale-105'
                  : 'text-rose-900/40 hover:text-rose-600/70'
              }`}
            >
              <Icon size={isActive ? 22 : 19} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] tracking-tight font-medium">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
