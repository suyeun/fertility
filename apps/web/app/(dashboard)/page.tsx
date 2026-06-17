'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  useHomeData, cyclesApi, treatmentApi, hormonesApi, diaryApi,
  useUserStore, getQuickActions,
} from '@fertility/shared'
import type { MenstrualCycle, TreatmentSchedule, HormoneRecord, DiaryEntry, TreatmentMode, CurrentStage } from '@fertility/shared'
import HeroCard from '../../components/home/HeroCard'
import { NaturalChecklist, ClinicChecklist } from '../../components/home/TodayChecklist'
import WeekStreakCard from '../../components/home/WeekStreakCard'
import DiaryPrompt from '../../components/home/DiaryPrompt'
import { CalendarCheck, Zap } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, profile: authProfile } = useAuth()
  const { profile: storeProfile } = useUserStore()

  const [cycles,    setCycles]    = useState<MenstrualCycle[]>([])
  const [schedules, setSchedules] = useState<TreatmentSchedule[]>([])
  const [hormones,  setHormones]  = useState<HormoneRecord[]>([])
  const [diaries,   setDiaries]   = useState<DiaryEntry[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const [c, s, h, d] = await Promise.all([
          cyclesApi.getAll(),
          treatmentApi.getAll(),
          hormonesApi.getAll(),
          diaryApi.getAll(),
        ])
        const unwrap = (r: any) => Array.isArray(r) ? r : (r?.data ?? [])
        setCycles(unwrap(c)); setSchedules(unwrap(s))
        setHormones(unwrap(h)); setDiaries(unwrap(d))
      } catch (err) {
        console.error('홈 데이터 로드 실패:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // 프로필: 스토어 우선 (설정 변경 즉시 반영)
  const profile = storeProfile ?? authProfile

  const treatmentMode = (profile?.treatmentStage as TreatmentMode) ?? 'natural'
  const currentStage  = (profile as any)?._currentStage as CurrentStage ?? null

  const home = useHomeData(treatmentMode, currentStage, cycles, hormones, schedules, diaries)

  const todayStr     = new Date().toISOString().split('T')[0]
  const todayHormone = hormones.find(h => h.recordedAt.split('T')[0] === todayStr)
  const latestDiary  = diaries[0]

  const quickActions = getQuickActions(treatmentMode, currentStage)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-4">

      {/* 섹션 A — 헤더 */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-[#5a3042]">
            🌸 봄 &nbsp;|&nbsp; {profile?.name || '사용자'}님, 안녕하세요
          </h2>
          <p className="text-[12px] text-[#b07080] mt-0.5">오늘도 따뜻하게 함께할게요</p>
        </div>
        <Link href="/settings" className="p-2 rounded-full hover:bg-[#fff0f4] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b07080" strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
      </div>

      {/* 섹션 B — 히어로 카드 */}
      <HeroCard
        treatmentMode={treatmentMode}
        currentStage={currentStage}
        phase={home.todayCycleInfo?.phase ?? 'follicular'}
        phaseLabel={home.todayPhaseLabel}
        cycleDay={home.currentCycleDay}
        tip={home.todayTip}
        dDay={home.ovulationDDay}
        ovulationDate={home.nextOvulationDate}
        isFertileWindow={home.isFertileWindow}
      />

      {/* 섹션 C — 빠른 기록 버튼 */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Zap size={14} className="text-[#ff8fab]" />
          <span className="text-[13px] font-semibold text-[#5a3042]">빠른 기록</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              href={action.route}
              className="flex flex-col gap-2 p-4 rounded-[20px] bg-white border border-[#ffd6e0] hover:bg-[#fff5f8] transition-colors"
              style={{ boxShadow: '0 1px 4px -1px rgba(255,143,171,0.1)' }}
            >
              <span className="text-[22px]">{action.emoji}</span>
              <span className="text-[12px] font-semibold text-[#5a3042]">{action.label}</span>
              <span className="text-[11px] text-[#ff8fab] font-medium">기록하기 →</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 섹션 D — 오늘 할 일 */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <CalendarCheck size={15} className="text-[#ff8fab]" />
          <span className="text-[13px] font-semibold text-[#5a3042]">오늘 할 일</span>
        </div>
        {treatmentMode === 'natural' ? (
          <NaturalChecklist todayHormone={todayHormone} phase={home.todayCycleInfo?.phase} />
        ) : (
          <ClinicChecklist
            schedules={schedules}
            todayHormone={todayHormone}
            mode={treatmentMode}
            stage={currentStage}
          />
        )}
      </div>

      {/* 섹션 E — 오늘의 마음 */}
      <DiaryPrompt latestDiary={latestDiary} />

      {/* 섹션 F — 이번 주 기록 스트릭 */}
      <WeekStreakCard weekDays={home.weekStreak} streakCount={home.streakCount} />

    </div>
  )
}
