'use client'

import { resolveUserStage, usersApi, cyclesApi } from '@fertility/shared'
import type { OnboardingData } from '@fertility/shared'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../app/context/AuthContext'
import { useState } from 'react'

const STAGE_CONFIG = {
  beginner: {
    emoji: '🌱',
    title: '임신 준비 파트너가\n생겼어요!',
    desc: '배란일 예측, 주기 추적, 임신 팁으로 시작해요.',
    color: '#ff8fab',
  },
  intermediate: {
    emoji: '🌸',
    title: '호르몬 수치도\n같이 관리해요!',
    desc: 'AMH·FSH 기록, AI 수치 해석, 병원 체크리스트가 준비됐어요.',
    color: '#c026d3',
  },
  advanced: {
    emoji: '💪',
    title: '임신 준비 전 과정을\n함께할게요!',
    desc: '일정 관리, 약 복용 알림, AI Q&A가 모두 열렸어요.',
    color: '#4f46e5',
  },
}

interface CompleteScreenProps {
  data: OnboardingData
}

export function CompleteScreen({ data }: CompleteScreenProps) {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const stage = resolveUserStage(data)
  const config = STAGE_CONFIG[stage]

  const handleStart = async () => {
    if (!user) return
    setSaving(true)
    try {
      // 온보딩 답변에 맞는 핵심 치료 단계(treatmentStage) 매핑
      let treatmentStage: 'natural' | 'iui' | 'ivf' | 'fet' | 'pregnant' = 'natural'
      if (data.treatmentExperience === 'iui') {
        treatmentStage = 'iui'
      } else if (data.treatmentExperience === 'ivf') {
        treatmentStage = 'ivf'
      }

      // 1단계: 유저 프로필 데이터베이스에 저장
      await usersApi.updateProfile({ treatmentStage, averageCycleLength: data.cycleLength })

      const currentCycles = await cyclesApi.getAll()
      if (currentCycles.length === 0) {
        await cyclesApi.save({
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cycleLength: data.cycleLength,
          periodLength: 5,
        })
      }

      // 3단계: 인증 프로필 정보 갱신
      await refreshProfile()
      
      // 4단계: 대시보드로 이동
      router.push('/')
    } catch (err) {
      console.error('프로필 저장 중 오류 발생:', err)
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
      <div className="w-full bg-[#fff0f4] rounded-2xl p-4 text-left">
        <p className="text-xs font-bold text-[#ff8fab] mb-2">선택한 정보</p>
        <div className="text-sm text-[#8c5060] flex flex-col gap-1">
          <span>생리 주기: <b className="text-[#5a3042]">{data.cycleLength}일</b></span>
          <span>다음 배란 예정일: <b className="text-[#5a3042]">{data.cycleLength - 14}일째</b></span>
        </div>
      </div>
      <button
        onClick={handleStart}
        disabled={saving}
        className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-sm transition-colors flex justify-center items-center gap-2"
        style={{ backgroundColor: config.color }}
      >
        {saving ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        ) : (
          '시작하기 →'
        )}
      </button>
      <p className="text-xs text-[#c4a0ae]">
        언제든지 설정에서 변경할 수 있어요
      </p>
    </div>
  )
}
