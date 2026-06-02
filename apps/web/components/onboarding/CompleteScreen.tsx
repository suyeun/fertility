'use client'

import { usersApi, cyclesApi } from '@fertility/shared'
import type { OnboardingData, TreatmentStage } from '@fertility/shared'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../app/context/AuthContext'
import { useState } from 'react'

const STAGE_CONFIG: Record<TreatmentStage, {
  emoji: string; title: string; desc: string; color: string
}> = {
  natural: {
    emoji: '🌱',
    title: '자연임신 준비\n파트너가 생겼어요!',
    desc: '배란일 예측, 주기 추적, BBT·OPK 기록으로 시작해요.',
    color: '#22c55e',
  },
  iui: {
    emoji: '🧪',
    title: 'IUI 시술\n함께 준비할게요!',
    desc: '시술 일정·약물 알림, 호르몬 수치 기록이 모두 열렸어요.',
    color: '#3b82f6',
  },
  ivf: {
    emoji: '🧬',
    title: 'IVF 시술\n모든 과정을 함께해요!',
    desc: '과배란 유도부터 이식까지 — 일정, 수치, 약물, 감정 모두 기록해요.',
    color: '#8b5cf6',
  },
  fet: {
    emoji: '❄️',
    title: 'FET 동결이식\n곁에 있을게요!',
    desc: '이식 일정, 자궁내막 두께, 황체호르몬 기록을 도와드려요.',
    color: '#06b6d4',
  },
  pregnant: {
    emoji: '🌸',
    title: '임신을 진심으로\n축하해요!',
    desc: '소중한 이 시간, BOM이 함께할게요.',
    color: '#ff8fab',
  },
}

interface CompleteScreenProps {
  data: OnboardingData
}

export function CompleteScreen({ data }: CompleteScreenProps) {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const stage = data.treatmentStage ?? 'natural'
  const config = STAGE_CONFIG[stage]

  const handleStart = async () => {
    if (!user) return
    setSaving(true)
    try {
      await usersApi.updateProfile({
        treatmentStage: stage,
        averageCycleLength: data.cycleLength,
      })

      const currentCycles = await cyclesApi.getAll()
      if (currentCycles.length === 0) {
        await cyclesApi.save({
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cycleLength: data.cycleLength,
          periodLength: 5,
        })
      }

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
          <span>치료 단계: <b className="text-[#5a3042]">{config.emoji} {STAGE_LABEL[stage]}</b></span>
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
      <p className="text-xs text-[#c4a0ae]">언제든지 설정에서 변경할 수 있어요</p>
    </div>
  )
}

const STAGE_LABEL: Record<TreatmentStage, string> = {
  natural: '자연임신 시도 중',
  iui: 'IUI 인공수정',
  ivf: 'IVF 시험관',
  fet: 'FET 동결이식',
  pregnant: '임신 성공',
}
