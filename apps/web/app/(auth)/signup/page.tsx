// apps/web/app/(auth)/signup/page.tsx
'use client'

import React, { useState } from 'react'
import { authApi, cyclesApi, configureTokenStore, setToken } from '@fertility/shared'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

if (typeof window !== 'undefined') {
  configureTokenStore(
    () => localStorage.getItem('bom_token'),
    (t) => t ? localStorage.setItem('bom_token', t) : localStorage.removeItem('bom_token'),
  )
}

type PrepMode = 'natural' | 'clinic'
type Stage = 'natural' | 'iui' | 'ivf' | 'fet' | 'pregnant'

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  // 가입 유형 선택 상태
  const [prepMode, setPrepMode] = useState<PrepMode>('natural')

  // 3단계 데이터
  const [treatmentStage, setTreatmentStage] = useState<Stage>('natural')
  const [averageCycleLength, setAverageCycleLength] = useState(28)
  const [averagePeriodLength, setAveragePeriodLength] = useState(5)
  const [lastPeriodStart, setLastPeriodStart] = useState(new Date().toISOString().split('T')[0])
  const [partnerName, setPartnerName] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password || !name) {
      setError('이메일, 비밀번호, 이름을 모두 입력해 주세요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }
    setStep(2)
  }

  const handleNextStep2 = (mode: PrepMode) => {
    setPrepMode(mode)
    if (mode === 'natural') {
      setTreatmentStage('natural')
    } else {
      setTreatmentStage('iui') // 시술 모드일 경우 기본값
    }
    setStep(3)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await authApi.signup({
        email, password, name,
        partnerName: partnerName || undefined,
      })
      setToken(res.access_token)

      if (lastPeriodStart) {
        await cyclesApi.save({
          startDate: lastPeriodStart,
          cycleLength: averageCycleLength,
          periodLength: averagePeriodLength,
        })
      }

      router.push('/')
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.')
      setLoading(false)
    }
  }

  const stages: { value: Stage; label: string; desc: string; icon: string }[] = [
    { value: 'iui', label: '인공수정 (IUI)', desc: 'IUI와 함께 준비 중', icon: '🧪' },
    { value: 'ivf', label: '시험관 아기 (IVF)', desc: '신선 배아 채취/이식 단계', icon: '🧬' },
    { value: 'fet', label: '동결 배아이식 (FET)', desc: '냉동 배아 해동 및 이식 단계', icon: '❄️' },
    { value: 'pregnant', label: '임신 성공 🌸', desc: '소중한 아기를 만난 단계', icon: '👶' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-medium text-rose-950 font-outfit text-center">
          회원가입 ({step}/3 단계)
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {step === 1 && (
        <form className="space-y-4" onSubmit={handleNextStep1}>
          <div>
            <label className="block text-xs font-semibold text-rose-900/60 mb-1 ml-1">
              이메일 주소
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-rose-950 placeholder:text-rose-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-900/60 mb-1 ml-1">
              이름 (닉네임)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="봄이엄마"
              required
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
              placeholder="최소 6자 이상"
              required
              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-rose-950 placeholder:text-rose-300 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press transition-all flex justify-center items-center gap-2 shadow-lg shadow-rose-200"
          >
            다음 단계로
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <label className="block text-xs font-semibold text-rose-900/60 mb-2 ml-1 text-center">
              준비 모드를 선택하시면 맞춤형 케어를 제공합니다
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleNextStep2('natural')}
              className="flex items-center gap-4 p-5 rounded-3xl border border-rose-100 bg-white hover:bg-rose-50/20 text-left transition-all active-press"
            >
              <span className="text-3xl">🌱</span>
              <div>
                <h4 className="font-bold text-sm text-rose-950">자연 임신 시도</h4>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">기초체온, 배란테스트기 및 사랑일 매칭을 바탕으로 자연스럽고 평화롭게 준비해요.</p>
              </div>
            </button>

            <button
              onClick={() => handleNextStep2('clinic')}
              className="flex items-center gap-4 p-5 rounded-3xl border border-rose-100 bg-white hover:bg-rose-50/20 text-left transition-all active-press"
            >
              <span className="text-3xl">🏥</span>
              <div>
                <h4 className="font-bold text-sm text-rose-950">병원과 함께하는 준비</h4>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">인공수정, 시험관(신선/동결) 스케줄 관리 및 호르몬 검사 분석과 맞춤 약물을 챙겨요.</p>
              </div>
            </button>
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full py-3 bg-rose-50 text-rose-700 rounded-2xl text-xs font-semibold hover:bg-rose-100 active-press transition-all border border-rose-100"
          >
            이전으로
          </button>
        </div>
      )}

      {step === 3 && (
        <form className="space-y-5 animate-fade-in" onSubmit={handleSignup}>
          {/* 세부 단계 설정 분기 */}
          {prepMode === 'natural' ? (
            <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-100/50 flex items-center gap-2">
              <span className="text-lg">🌱</span>
              <p className="text-[11px] text-rose-900/70 font-semibold">
                자연스러운 임신 시도를 위해 캘린더와 영양제 체크를 준비합니다.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-rose-900/60 mb-2 ml-1">
                지금 나의 임신 준비 단계를 선택해주세요
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {stages.map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setTreatmentStage(st.value)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                      treatmentStage === st.value
                        ? 'border-primary bg-rose-50/60 text-rose-950 font-semibold ring-1 ring-primary'
                        : 'border-rose-100 bg-white hover:bg-rose-50/20 text-gray-600'
                    }`}
                  >
                    <span className="text-xl">{st.icon}</span>
                    <div>
                      <p className="text-xs">{st.label}</p>
                      <p className="text-[10px] text-gray-400 font-normal">{st.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 파트너 이름 */}
          <div>
            <label className="block text-xs font-semibold text-rose-900/60 mb-1 ml-1">
              파트너 이름 (선택)
            </label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="봄이아빠"
              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-rose-950 placeholder:text-rose-300 transition-all"
            />
          </div>

          {/* 생리 주기 설정 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-rose-900/60 mb-1 ml-1">
                평균 주기 (일)
              </label>
              <input
                type="number"
                min={20}
                max={45}
                value={averageCycleLength}
                onChange={(e) => setAverageCycleLength(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-rose-950 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-rose-900/60 mb-1 ml-1">
                생리 기간 (일)
              </label>
              <input
                type="number"
                min={2}
                max={15}
                value={averagePeriodLength}
                onChange={(e) => setAveragePeriodLength(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-rose-950 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-900/60 mb-1 ml-1">
              최근 생리 시작일
            </label>
            <input
              type="date"
              value={lastPeriodStart}
              onChange={(e) => setLastPeriodStart(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm text-rose-950 transition-all"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={loading}
              className="w-1/3 py-3.5 bg-rose-50 text-rose-700 rounded-2xl text-sm font-semibold hover:bg-rose-100 active-press transition-all border border-rose-100"
            >
              이전으로
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press transition-all flex justify-center items-center gap-2 shadow-lg shadow-rose-200"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                '가입 완료하기'
              )}
            </button>
          </div>
        </form>
      )}

      <div className="text-center mt-4">
        <p className="text-xs text-rose-600/70">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
