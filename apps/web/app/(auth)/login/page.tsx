// apps/web/app/(auth)/login/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login, signup } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.')
      return
    }
    try {
      setLoading(true)
      await login(email, password)
      router.push('/')
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (mode: 'NATURAL' | 'CLINIC') => {
    setError(null)
    setLoading(true)
    const email = mode === 'NATURAL' ? 'demo.natural@bom.app' : 'demo.clinic@bom.app'
    const name  = mode === 'NATURAL' ? '자연임신 데모' : '시술모드 데모'
    try {
      // 계정이 없으면 생성, 있으면 그냥 로그인
      try {
        await signup({ email, password: 'demo1234', name })
      } catch {}
      await login(email, 'demo1234')

      // 프로필에 모드 강제 세팅 (매번 덮어써서 항상 올바른 모드로 진입)
      const { usersApi } = await import('@fertility/shared')
      await usersApi.updateProfile({
        currentMode: mode,
        treatmentStage: mode === 'NATURAL' ? 'natural' : 'ivf',
        averageCycleLength: 28,
      })

      router.push('/')
    } catch (err: any) {
      setError(err.message || '데모 로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-medium text-rose-950 font-outfit text-center">
          로그인
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-200">
          ⚠️ {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleLogin}>
        <div>
          <label className="block text-xs font-semibold text-rose-900/60 mb-1 ml-1">
            이메일 주소
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            disabled={loading}
            className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-rose-950 placeholder:text-rose-300 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-rose-900/60 mb-1 ml-1">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            disabled={loading}
            className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-rose-950 placeholder:text-rose-300 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press transition-all flex justify-center items-center gap-2 shadow-lg shadow-rose-200"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            '로그인하기'
          )}
        </button>
      </form>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-rose-100"></div>
        <span className="flex-shrink mx-4 text-[10px] text-rose-300 font-semibold uppercase tracking-wider">간편 로그인</span>
        <div className="flex-grow border-t border-rose-100"></div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleDemoLogin('NATURAL')}
          disabled={loading}
          className="w-full py-3 bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#15803d] rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all border border-[#bbf7d0]"
        >
          🌱 자연임신 모드로 체험하기
        </button>
        <button
          onClick={() => handleDemoLogin('CLINIC')}
          disabled={loading}
          className="w-full py-3 bg-[#f5f3ff] hover:bg-[#ede9fe] text-[#6d28d9] rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all border border-[#ddd6fe]"
        >
          🏥 시술 모드로 체험하기
        </button>
      </div>

      <div className="text-center mt-4">
        <p className="text-xs text-rose-600/70">
          아직 계정이 없으신가요?{' '}
          <Link href="/signup" className="text-primary font-bold hover:underline">
            회원가입
          </Link>
        </p>
      </div>

      <div className="text-center mt-2">
        <Link
          href="/tour"
          className="text-xs text-[#c4a0ae] underline underline-offset-2 hover:text-[#b07080] transition-colors"
        >
          로그인 없이 먼저 둘러보기 →
        </Link>
      </div>
    </div>
  )
}
