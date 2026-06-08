'use client'

import React from 'react'
import { useAuth } from '../context/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, CalendarDays, Users, Sparkles, Settings } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const pathname = usePathname()

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-gradient-soft-rose min-h-screen">
        <span className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-semibold text-rose-600/70 animate-pulse">따뜻한 봄을 불러오는 중...🌸</p>
      </div>
    )
  }

  if (!user) return null

  const mode = profile?.currentMode ?? (profile?.treatmentStage === 'natural' ? 'NATURAL' : 'CLINIC')

  const navItems = [
    { href: '/',           icon: Home,        label: '홈'      },
    { href: '/calendar',   icon: CalendarDays, label: '캘린더'  },
    { href: '/community',  icon: Users,        label: '이야기방' },
    { href: '/chat',       icon: Sparkles,     label: 'AI 상담' },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background pb-20 relative">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 glass shadow-sm border-b border-rose-100/40 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <div>
            <h1 className="font-bold text-base text-rose-950 font-outfit tracking-tight leading-none">Lunera</h1>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: mode === 'NATURAL' ? '#dcfce7' : '#ede9fe',
                color: mode === 'NATURAL' ? '#16a34a' : '#7c3aed',
              }}
            >
              {mode === 'NATURAL' ? '🌱 자연임신' : '🏥 시술 모드'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile && <span className="text-xs font-semibold text-rose-900/70">{profile.name}님</span>}
          <Link href="/settings" className="p-2 text-rose-400 hover:text-rose-600 transition-colors rounded-xl hover:bg-rose-50">
            <Settings size={16} />
          </Link>
        </div>
      </header>

      {/* 본문 */}
      <main className="flex-1 p-4 overflow-y-auto">
        {children}
      </main>

      {/* 하단 탭 바 — 4탭 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 glass border-t border-rose-100/40 px-2 py-2 flex justify-between items-center shadow-lg rounded-t-3xl">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-all ${
                isActive ? 'text-primary font-bold scale-105' : 'text-rose-900/40 hover:text-rose-600/70'
              }`}
            >
              <Icon size={isActive ? 22 : 19} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] tracking-tight font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
