// apps/web/app/(auth)/layout.tsx
import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-gradient-soft-rose">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-5xl">🌸</div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-rose-950 font-outfit">
          Lunera
        </h2>
        <p className="mt-1 text-center text-xs font-medium text-rose-400/80 tracking-widest uppercase">
          루네라
        </p>
        <p className="mt-2 text-center text-sm text-rose-600/70 leading-relaxed">
          임신 준비의 모든 순간을, 루네라와 함께
        </p>
        <p className="mt-1 text-center text-[11px] text-rose-400/60 leading-relaxed px-4">
          자연임신부터 시술 일정까지 — 내 몸의 기록을 가장 가까운 곳에
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/90 backdrop-blur-md py-8 px-6 shadow-xl shadow-rose-100/50 rounded-3xl border border-rose-100/60 animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  )
}
