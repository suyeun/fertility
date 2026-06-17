'use client'

import { usersApi, useUserStore, getStageLabelKo } from '@fertility/shared'
import type { OnboardingData } from '@fertility/shared'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../app/context/AuthContext'
import { useState } from 'react'

const MODE_CONFIG = {
  natural: { emoji: '🌱', color: '#22c55e', title: '자연임신 준비\n파트너가 생겼어요!',  desc: '배란일 예측, 기초체온(BBT), 배란테스트기(OPK) 기록으로 가임기를 잡아드려요.' },
  iui:     { emoji: '💉', color: '#3b82f6', title: '인공수정 전 과정을\n함께할게요!',     desc: '시술 일정·약물 알림, 배란 모니터링, 수치 기록까지 모두 열렸어요.' },
  ivf:     { emoji: '🔬', color: '#8b5cf6', title: '시험관 전 과정을\n함께할게요!',      desc: '난포 모니터링, 채취·이식 일정, 호르몬 수치 기록까지 모두 열렸어요.' },
}

export function CompleteScreen({ data }: { data: OnboardingData }) {
  const router = useRouter()
  const { refreshProfile } = useAuth()
  const { saveProfile } = useUserStore()
  const [saving, setSaving] = useState(false)

  const mode = data.treatmentMode ?? 'natural'
  const config = MODE_CONFIG[mode]

  // userMode 변환: natural → NATURAL, iui/ivf → CLINIC
  const userMode = mode === 'natural' ? 'NATURAL' : 'CLINIC'

  const handleStart = async () => {
    setSaving(true)
    try {
      const updated = await usersApi.updateProfile({
        currentMode: userMode,
        treatmentStage: mode,
        currentStage: data.currentStage ?? null,
        averageCycleLength: data.cycleLength,
      })
      if (updated) await saveProfile(updated)
      await refreshProfile()
      router.push('/')
    } catch (err) {
      console.error('온보딩 저장 실패:', err)
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
          <span>모드: <b className="text-[#5a3042]">{config.emoji} {MODE_CONFIG[mode].title.split('\n')[0]}</b></span>
          {mode !== 'natural' && (
            <span>
              시술 단계: <b className="text-[#5a3042]">
                {data.currentStage ? getStageLabelKo(mode, data.currentStage) : '아직 미설정'}
              </b>
            </span>
          )}
          <span>주기 설정: <b className="text-[#5a3042]">{data.cycleLength}일</b></span>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={saving}
        className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-sm transition-all active:scale-[0.98] flex justify-center items-center"
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
