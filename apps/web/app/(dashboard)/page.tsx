'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHomeData, cyclesApi, treatmentApi, diaryApi, hormonesApi } from '@fertility/shared'
import type { MenstrualCycle, TreatmentSchedule, DiaryEntry, HormoneRecord } from '@fertility/shared'
import HeroCard from '../../components/home/HeroCard'
import TodayTasks from '../../components/home/TodayTasks'
import WeekStreakCard from '../../components/home/WeekStreakCard'
import NaturalDashboard from '../../components/home/NaturalDashboard'
import ClinicDashboard from '../../components/home/ClinicDashboard'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [cycles, setCycles] = useState<MenstrualCycle[]>([])
  const [schedules, setSchedules] = useState<TreatmentSchedule[]>([])
  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  const [hormones, setHormones] = useState<HormoneRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const [c, s, d, h] = await Promise.all([
          cyclesApi.getAll(),
          treatmentApi.getAll(),
          diaryApi.getAll(),
          hormonesApi.getAll(),
        ])
        setCycles(c)
        setSchedules(s)
        setDiaries(d)
        setHormones(h)
      } catch (err) {
        console.error('홈 데이터 로드 실패:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const home = useHomeData(profile?.treatmentStage, cycles, hormones, schedules, diaries)
  const todayStr = new Date().toISOString().split('T')[0]
  const todayHormone = hormones.find(h => h.recordedAt.split('T')[0] === todayStr)

  // currentMode 없는 기존 유저는 treatmentStage로 판별 (하위 호환)
  const mode = profile?.currentMode
    ?? (profile?.treatmentStage === 'natural' ? 'NATURAL' : 'CLINIC')

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 32 }}>

      {/* 인사 */}
      <div style={{ paddingTop: 12, paddingBottom: 16 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold" style={{ color: '#5a3042' }}>
              {profile?.name || '사용자'}님, 안녕하세요 🌸
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#b07080' }}>
              봄이 따뜻한 기적을 함께 만들어가요
            </p>
          </div>
          {/* 모드 배지 */}
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: mode === 'NATURAL' ? '#dcfce7' : '#ede9fe',
              color: mode === 'NATURAL' ? '#16a34a' : '#7c3aed',
            }}
          >
            {mode === 'NATURAL' ? '🌱 자연임신' : '🏥 시술 모드'}
          </span>
        </div>
      </div>

      {/* 히어로 카드 (공통) */}
      <div style={{ marginBottom: 24 }}>
        <HeroCard
          phase={home.todayCycleInfo?.phase ?? 'follicular'}
          phaseLabel={home.todayPhaseLabel}
          cycleDay={home.currentCycleDay}
          tip={home.todayTip}
          dDay={home.ovulationDDay}
          ovulationDate={home.nextOvulationDate}
          isFertileWindow={home.isFertileWindow}
        />
      </div>

      {/* 모드별 전용 대시보드 섹션 */}
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

      {/* 오늘 할 일 */}
      <div style={{ marginBottom: 24 }}>
        <TodayTasks tasks={home.todayTasks} todayHormone={todayHormone} />
      </div>

      {/* 이번 주 기록 */}
      <div>
        <WeekStreakCard weekDays={home.weekStreak} streakCount={home.streakCount} />
      </div>

    </div>
  )
}
