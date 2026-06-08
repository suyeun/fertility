'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHomeData, cyclesApi, treatmentApi, hormonesApi } from '@fertility/shared'
import type { MenstrualCycle, TreatmentSchedule, HormoneRecord, UserMode } from '@fertility/shared'
import HeroCard from '../../components/home/HeroCard'
import NaturalDashboard from '../../components/home/NaturalDashboard'
import ClinicDashboard from '../../components/home/ClinicDashboard'
import { NaturalChecklist, ClinicChecklist } from '../../components/home/TodayChecklist'
import WeekStreakCard from '../../components/home/WeekStreakCard'
import { CalendarCheck } from 'lucide-react'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [cycles,    setCycles]    = useState<MenstrualCycle[]>([])
  const [schedules, setSchedules] = useState<TreatmentSchedule[]>([])
  const [hormones,  setHormones]  = useState<HormoneRecord[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const [c, s, h] = await Promise.all([cyclesApi.getAll(), treatmentApi.getAll(), hormonesApi.getAll()])
        setCycles(c); setSchedules(s); setHormones(h)
      } catch (err) {
        console.error('홈 데이터 로드 실패:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const home = useHomeData(profile?.treatmentStage, cycles, hormones, schedules, [])
  const todayStr     = new Date().toISOString().split('T')[0]
  const todayHormone = hormones.find(h => h.recordedAt.split('T')[0] === todayStr)

  const mode: UserMode = (profile?.currentMode as UserMode)
    ?? (profile?.treatmentStage === 'natural' ? 'NATURAL' : 'CLINIC')

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-4">

      {/* 인사 */}
      <div className="pt-1">
        <h2 className="text-[18px] font-semibold text-[#5a3042]">
          {profile?.name || '사용자'}님, 안녕하세요 {mode === 'NATURAL' ? '🌱' : '🏥'}
        </h2>
        <p className="text-[12px] text-[#b07080] mt-0.5">루네라가 따뜻한 기적을 함께 만들어가요</p>
      </div>

      {/* 히어로 카드 */}
      <HeroCard
        mode={mode}
        phase={home.todayCycleInfo?.phase ?? 'follicular'}
        phaseLabel={home.todayPhaseLabel}
        cycleDay={home.currentCycleDay}
        tip={home.todayTip}
        dDay={home.ovulationDDay}
        ovulationDate={home.nextOvulationDate}
        isFertileWindow={home.isFertileWindow}
        treatmentStage={profile?.treatmentStage}
      />

      {/* 모드별 데이터 위젯 */}
      {mode === 'NATURAL' ? (
        <NaturalDashboard
          todayHormone={todayHormone}
          recentHormones={hormones.slice(0, 7)}
          isFertileWindow={home.isFertileWindow}
          ovulationDDay={home.ovulationDDay}
        />
      ) : (
        <ClinicDashboard
          schedules={schedules}
          todayHormone={todayHormone}
          treatmentStage={profile?.treatmentStage}
        />
      )}

      {/* 오늘 할 일 체크리스트 */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <CalendarCheck size={15} className="text-[#ff8fab]" />
          <span className="text-[13px] font-semibold text-[#5a3042]">
            {mode === 'NATURAL' ? '오늘 할 일' : '오늘 미션'}
          </span>
        </div>
        {mode === 'NATURAL' ? (
          <NaturalChecklist
            todayHormone={todayHormone}
            phase={home.todayCycleInfo?.phase}
          />
        ) : (
          <ClinicChecklist schedules={schedules} todayHormone={todayHormone} />
        )}
      </div>

      {/* 이번 주 기록 스트릭 */}
      <WeekStreakCard weekDays={home.weekStreak} streakCount={home.streakCount} />

    </div>
  )
}
