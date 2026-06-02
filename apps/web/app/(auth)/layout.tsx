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
          BOM (봄)
        </h2>
        <p className="mt-2 text-center text-sm text-rose-600/70">
          임신 준비 AI 올인원 파트너
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
