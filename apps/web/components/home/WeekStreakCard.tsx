'use client'

import React from 'react'
import Link from 'next/link'
import { BarChart3, Check } from 'lucide-react'
import type { WeekDay } from '@fertility/shared'

interface WeekStreakCardProps {
  weekDays: WeekDay[]
  streakCount: number
}

export default function WeekStreakCard({ weekDays, streakCount }: WeekStreakCardProps) {
  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <BarChart3 size={15} style={{ color: '#ff8fab' }} />
          <span className="text-[13px] font-semibold" style={{ color: '#5a3042' }}>
            이번 주 기록
          </span>
        </div>
        <Link
          href="/records"
          className="text-[11px] font-medium"
          style={{ color: '#ff8fab' }}
        >
          전체 보기 ›
        </Link>
      </div>

      {/* 카드 */}
      <div
        className="rounded-2xl pt-4 px-3 pb-4"
        style={{
          background: '#fff',
          border: '1px solid #ffeef3',
          boxShadow: '0 2px 8px -2px rgba(255,143,171,0.12)',
        }}
      >
        {/* 요일 + 원형 뱃지 */}
        <div className="flex justify-around mb-3">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span
                className="text-[11px]"
                style={{
                  color: day.isToday ? '#ff8fab' : '#b07080',
                  fontWeight: day.isToday ? 600 : 400,
                }}
              >
                {day.label}
              </span>
              {day.recorded ? (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: day.isToday ? '#ffd6e0' : '#ff8fab' }}
                >
                  <Check
                    size={13}
                    style={{ color: day.isToday ? '#ff8fab' : '#fff' }}
                    strokeWidth={3}
                  />
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-full"
                  style={{
                    background: '#fff0f4',
                    border: day.isToday ? '2px solid #ff8fab' : '1px solid #ffd6e0',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* 스트릭 텍스트 */}
        <div className="text-[11px] text-center" style={{ color: '#b07080' }}>
          {streakCount > 0
            ? `이번 주 ${streakCount}일 연속 기록 중 🔥`
            : '오늘부터 기록을 시작해봐요 ✨'}
        </div>
      </div>
    </div>
  )
}
