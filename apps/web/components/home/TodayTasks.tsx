'use client'

import React from 'react'
import Link from 'next/link'
import { CalendarCheck } from 'lucide-react'
import type { HomeTask, HormoneRecord } from '@fertility/shared'

interface TodayTasksProps {
  tasks: HomeTask[]
  todayHormone?: HormoneRecord
}

const TASK_COLOR_MAP = {
  pink:   { bg: '#fff0f4', dot: '#ff8fab' },
  indigo: { bg: '#eef2ff', dot: '#818cf8' },
}

const quickCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ffd6e0',
  boxShadow: '0 2px 8px -2px rgba(255,143,171,0.15)',
  borderRadius: '18px',
  padding: '14px',
  display: 'block',
}

export default function TodayTasks({ tasks, todayHormone }: TodayTasksProps) {
  const bbt = todayHormone?.bbt
  const opk = todayHormone?.opkIndex

  const bbtDone  = bbt !== undefined && bbt !== null
  const opkDone  = opk !== undefined && opk !== null

  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-1.5 mb-3">
        <CalendarCheck size={15} style={{ color: '#ff8fab' }} />
        <span className="text-[13px] font-semibold" style={{ color: '#5a3042' }}>
          오늘 할 일
        </span>
      </div>

      {/* BBT · OPK 빠른 기록 */}
      <div className="grid grid-cols-2 gap-3" style={{ marginBottom: tasks.length > 0 ? 10 : 0 }}>
        <Link href="/records" style={quickCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="text-[22px] mb-2">🌡️</div>
            {bbtDone && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#d1fae5', color: '#059669' }}
              >
                완료 ✓
              </span>
            )}
          </div>
          <div className="text-[12px] font-semibold mb-0.5" style={{ color: '#5a3042' }}>
            기초체온
          </div>
          {bbtDone ? (
            <div className="text-[15px] font-bold" style={{ color: '#ff8fab' }}>
              {bbt}°C
            </div>
          ) : (
            <>
              <div className="text-[11px]" style={{ color: '#c4a0ae' }}>아직 기록 없음</div>
              <div className="text-[11px] font-semibold mt-0.5" style={{ color: '#ff8fab' }}>
                기록하기 →
              </div>
            </>
          )}
        </Link>

        <Link href="/records" style={quickCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="text-[22px] mb-2">🥚</div>
            {opkDone && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#d1fae5', color: '#059669' }}
              >
                완료 ✓
              </span>
            )}
          </div>
          <div className="text-[12px] font-semibold mb-0.5" style={{ color: '#5a3042' }}>
            배란 테스트기
          </div>
          {opkDone ? (
            <div className="text-[15px] font-bold" style={{ color: '#ff8fab' }}>
              OPK {opk}/10
            </div>
          ) : (
            <>
              <div className="text-[11px]" style={{ color: '#c4a0ae' }}>아직 기록 없음</div>
              <div className="text-[11px] font-semibold mt-0.5" style={{ color: '#ff8fab' }}>
                기록하기 →
              </div>
            </>
          )}
        </Link>
      </div>

      {/* 오늘 일정 · 복약 태스크 */}
      {tasks.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {tasks.map(task => {
            const colors = TASK_COLOR_MAP[task.colorKey]
            return (
              <div
                key={task.id}
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{
                  background: '#fff',
                  border: '1px solid #ffeef3',
                  boxShadow: '0 2px 8px -2px rgba(255,143,171,0.12)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                  style={{ background: colors.bg }}
                >
                  {task.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13px] font-semibold truncate"
                    style={{
                      color: task.done ? '#c4a0ae' : '#5a3042',
                      textDecoration: task.done ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </div>
                  <div className="text-[11px] mt-0.5 truncate" style={{ color: '#b07080' }}>
                    {task.subtitle}
                  </div>
                </div>
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: task.done ? '#e4c0ca' : colors.dot }}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
