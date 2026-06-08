'use client'

import React from 'react'
import Link from 'next/link'
import type { TreatmentSchedule, HormoneRecord } from '@fertility/shared'

interface ClinicDashboardProps {
  schedules: TreatmentSchedule[]
  todayHormone?: HormoneRecord
  treatmentStage?: string
}

const STAGE_STEPS: Record<string, { label: string; steps: string[] }> = {
  ivf: {
    label: 'IVF 시험관',
    steps: ['과배란 유도', '난자 채취', '수정·배양', '이식', '황체기 대기', '임신 확인'],
  },
  iui: {
    label: 'IUI 인공수정',
    steps: ['배란 유도', '타이밍 맞추기', '인공수정', '황체기 대기', '임신 확인'],
  },
  fet: {
    label: 'FET 동결이식',
    steps: ['자궁내막 준비', '이식일 결정', '동결 배아 이식', '황체기 대기', '임신 확인'],
  },
}

function getUpcomingSchedules(schedules: TreatmentSchedule[]): TreatmentSchedule[] {
  const today = new Date().toISOString().split('T')[0]
  return schedules
    .filter(s => s.status === 'scheduled' && s.scheduledAt >= today)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 3)
}

export default function ClinicDashboard({
  schedules,
  todayHormone,
  treatmentStage,
}: ClinicDashboardProps) {
  const upcoming = getUpcomingSchedules(schedules)
  const stageConfig = treatmentStage ? STAGE_STEPS[treatmentStage] : null

  return (
    <div className="flex flex-col gap-4" style={{ marginBottom: 24 }}>

      {/* 시술 타임라인 */}
      {stageConfig && (
        <div
          className="rounded-2xl p-4"
          style={{ background: '#fff', border: '1px solid #ffd6e0', boxShadow: '0 2px 8px -2px rgba(255,143,171,0.12)' }}
        >
          <p className="text-xs font-bold text-[#5a3042] mb-3">{stageConfig.label} 타임라인</p>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {stageConfig.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <div
                  className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full whitespace-nowrap"
                  style={{
                    background: i === 0 ? '#ff8fab' : '#fff0f4',
                    color: i === 0 ? '#fff' : '#b07080',
                  }}
                >
                  {step}
                </div>
                {i < stageConfig.steps.length - 1 && (
                  <span className="text-[#ffd6e0] text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 다가오는 시술 일정 */}
      <div
        className="rounded-2xl p-4"
        style={{ background: '#fff', border: '1px solid #ffd6e0', boxShadow: '0 2px 8px -2px rgba(255,143,171,0.12)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-[#5a3042]">다가오는 일정</p>
          <Link href="/treatment" className="text-xs text-[#ff8fab] font-semibold">전체 보기 →</Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-[#b07080]">예정된 시술 일정이 없어요</p>
            <Link href="/treatment" className="text-xs text-[#ff8fab] font-semibold mt-1 block">
              + 일정 추가하기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((s) => {
              const daysLeft = Math.ceil(
                (new Date(s.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
              return (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-[#fff8f9]">
                  <div>
                    <p className="text-xs font-semibold text-[#5a3042]">{s.title}</p>
                    <p className="text-[10px] text-[#b07080] mt-0.5">
                      {s.scheduledAt} {s.hospitalName ? `· ${s.hospitalName}` : ''}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: daysLeft <= 1 ? '#fef2f2' : '#fff0f4',
                      color: daysLeft <= 1 ? '#ef4444' : '#ff8fab',
                    }}
                  >
                    {daysLeft === 0 ? 'D-day' : `D-${daysLeft}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 오늘 호르몬 수치 */}
      {todayHormone && (
        <div
          className="rounded-2xl p-4"
          style={{ background: '#fff', border: '1px solid #ffd6e0', boxShadow: '0 2px 8px -2px rgba(255,143,171,0.12)' }}
        >
          <p className="text-xs font-bold text-[#5a3042] mb-3">오늘 수치</p>
          <div className="flex flex-wrap gap-2">
            {todayHormone.amh !== undefined && (
              <div className="bg-[#fff0f4] rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-[#b07080]">AMH</p>
                <p className="text-sm font-bold text-[#ff8fab]">{todayHormone.amh}</p>
                <p className="text-[9px] text-[#c4a0ae]">ng/mL</p>
              </div>
            )}
            {todayHormone.fsh !== undefined && (
              <div className="bg-[#fff0f4] rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-[#b07080]">FSH</p>
                <p className="text-sm font-bold text-[#ff8fab]">{todayHormone.fsh}</p>
                <p className="text-[9px] text-[#c4a0ae]">mIU/mL</p>
              </div>
            )}
            {todayHormone.follicleSize !== undefined && (
              <div className="bg-[#fff0f4] rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-[#b07080]">난포</p>
                <p className="text-sm font-bold text-[#ff8fab]">{todayHormone.follicleSize}</p>
                <p className="text-[9px] text-[#c4a0ae]">mm</p>
              </div>
            )}
            {todayHormone.endometriumThickness !== undefined && (
              <div className="bg-[#fff0f4] rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-[#b07080]">내막</p>
                <p className="text-sm font-bold text-[#ff8fab]">{todayHormone.endometriumThickness}</p>
                <p className="text-[9px] text-[#c4a0ae]">mm</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
