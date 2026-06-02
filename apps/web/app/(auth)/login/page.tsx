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

  const handleDemoLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      try { await signup({ email: 'demo@fertility.com', password: 'demo1234', name: '데모 사용자' }) } catch {}
      await login('demo@fertility.com', 'demo1234')
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

      <button
        onClick={handleDemoLogin}
        disabled={loading}
        className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-sm font-semibold active-press transition-all border border-rose-100"
      >
        데모 체험용 간편 로그인 🚀
      </button>

      <div className="text-center mt-4">
        <p className="text-xs text-rose-600/70">
          아직 계정이 없으신가요?{' '}
          <Link href="/signup" className="text-primary font-bold hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
