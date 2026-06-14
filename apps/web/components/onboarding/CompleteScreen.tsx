'use client'

import { usersApi, cyclesApi } from '@fertility/shared'
import type { OnboardingData, TreatmentStage, UserMode } from '@fertility/shared'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../app/context/AuthContext'
import { useState } from 'react'

const MODE_CONFIG: Record<UserMode, { emoji: string; title: string; desc: string; color: string }> = {
  NATURAL: {
    emoji: '🌱',
    title: '자연 임신 준비\n파트너가 생겼어요!',
    desc: '배란일 예측, 기초체온(BBT), 배란테스트기(OPK) 기록으로 가임기를 정밀하게 잡아드려요.',
    color: '#22c55e',
  },
  CLINIC: {
    emoji: '🏥',
    title: '시술 전 과정을\n함께할게요!',
    desc: '시술 일정·약물 알림, 호르몬 수치 기록, 커뮤니티까지 모두 열렸어요.',
    color: '#8b5cf6',
  },
}

const STAGE_LABEL: Record<TreatmentStage, string> = {
  natural: '자연임신 시도 중',
  iui: 'IUI 인공수정',
  ivf: 'IVF 시험관',
  fet: 'FET 동결이식',
  pregnant: '임신 성공',
}

interface CompleteScreenProps {
  data: OnboardingData
}

export function CompleteScreen({ data }: CompleteScreenProps) {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  const mode: UserMode = data.mode ?? 'NATURAL'
  const stage = data.treatmentStage ?? 'natural'
  const config = MODE_CONFIG[mode]

  const handleStart = async () => {
    if (!user) return
    setSaving(true)
    try {
      await usersApi.updateProfile({
        currentMode: mode,
        treatmentStage: stage,
        averageCycleLength: data.cycleLength,
      })

      await refreshProfile()
      router.push('/')
    } catch (err) {
      console.error('프로필 저장 오류:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="text-center flex flex-col items-center gap-6">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
        style={{ background: `${config.color}22` }}
      >
        {config.emoji}
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#5a3042] whitespace-pre-line leading-snug mb-2">
          {config.title}
        </h2>
        <p className="text-sm text-[#b07080] leading-relaxed">{config.desc}</p>
      </div>
      <div className="w-full bg-[#fff0f4] rounded-2xl p-4 text-left space-y-1">
        <p className="text-xs font-bold text-[#ff8fab] mb-2">설정 정보</p>
        <div className="text-sm text-[#8c5060] flex flex-col gap-1">
          <span>
            모드:{' '}
            <b className="text-[#5a3042]">
              {mode === 'NATURAL' ? '🌱 자연 임신 준비' : '🏥 병원 시술'}
            </b>
          </span>
          {mode === 'CLINIC' && (
            <span>
              시술 단계: <b className="text-[#5a3042]">{STAGE_LABEL[stage]}</b>
            </span>
          )}
          <span>주기 설정: <b className="text-[#5a3042]">{data.cycleLength}일</b></span>
        </div>
      </div>
      <button
        onClick={handleStart}
        disabled={saving}
        className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2"
        style={{ backgroundColor: config.color }}
      >
        {saving
          ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : '시작하기 →'
        }
      </button>
      <p className="text-xs text-[#c4a0ae]">언제든지 설정에서 모드를 변경할 수 있어요</p>
    </div>
  )
}
