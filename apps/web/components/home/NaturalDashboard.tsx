'use client'

import React from 'react'
import Link from 'next/link'
import type { HormoneRecord } from '@fertility/shared'

interface NaturalDashboardProps {
  todayHormone?: HormoneRecord
  recentHormones: HormoneRecord[]
  isFertileWindow: boolean
  ovulationDDay: string
}

// OPK 수치(0~10)를 진하기 색으로 변환
function opkColor(value: number): string {
  if (value >= 8) return '#ef4444'   // 피크
  if (value >= 5) return '#f97316'   // 상승
  if (value >= 3) return '#eab308'   // 중간
  return '#d1d5db'                   // 낮음
}

function opkLabel(value: number): string {
  if (value >= 8) return '피크 🔴'
  if (value >= 5) return '상승 중 🟠'
  if (value >= 3) return '기저 이상 🟡'
  return '기저 수준'
}

export default function NaturalDashboard({
  todayHormone,
  recentHormones,
  isFertileWindow,
  ovulationDDay,
}: NaturalDashboardProps) {
  const todayBbt = todayHormone?.bbt
  const todayOpk = todayHormone?.opkIndex

  // 최근 7일 BBT 미니 차트용 데이터
  const bbtPoints = recentHormones
    .filter(h => h.bbt !== undefined)
    .slice(0, 7)
    .reverse()
    .map(h => h.bbt as number)

  // OPK 최근 5개
  const opkHistory = recentHormones
    .filter(h => h.opkIndex !== undefined)
    .slice(0, 5)
    .reverse()
    .map(h => h.opkIndex as number)

  const isPeak = todayOpk !== undefined && todayOpk >= 8

  return (
    <div className="flex flex-col gap-4" style={{ marginBottom: 24 }}>

      {/* 가임기 타이밍 알림 */}
      {isFertileWindow && (
        <div
          className="rounded-2xl p-4 border flex items-start gap-3"
          style={{ backgroundColor: '#fef9c3', borderColor: '#fde047' }}
        >
          <span className="text-2xl">💛</span>
          <div>
            <p className="text-sm font-bold text-yellow-800">지금이 가임기예요!</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              배란 {ovulationDDay} — 오늘 타이밍을 놓치지 마세요 🌸
            </p>
          </div>
        </div>
      )}

      {/* OPK + BBT 빠른 상태 */}
      <div className="grid grid-cols-2 gap-3">

        {/* OPK 카드 */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: '#fff', border: '1px solid #ffd6e0', boxShadow: '0 2px 8px -2px rgba(255,143,171,0.12)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5a3042]">배란테스트기</span>
            <span className="text-xs text-[#b07080]">OPK</span>
          </div>
          {todayOpk !== undefined ? (
            <>
              <div className="text-2xl font-bold" style={{ color: opkColor(todayOpk) }}>
                {todayOpk}<span className="text-sm text-[#b07080]">/10</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: opkColor(todayOpk) }}>
                {opkLabel(todayOpk)}
              </span>
              {/* 진하기 바 */}
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${todayOpk * 10}%`, backgroundColor: opkColor(todayOpk) }}
                />
              </div>
            </>
          ) : (
            <Link href="/records" className="text-xs text-[#ff8fab] font-semibold mt-auto">
              + 오늘 기록하기
            </Link>
          )}
          {/* 최근 트렌드 (작은 바들) */}
          {opkHistory.length > 1 && (
            <div className="flex items-end gap-1 mt-1 h-6">
              {opkHistory.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ height: `${Math.max(4, v * 10)}%`, backgroundColor: opkColor(v), opacity: 0.7 }}
                />
              ))}
            </div>
          )}
        </div>

        {/* BBT 카드 */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: '#fff', border: '1px solid #ffd6e0', boxShadow: '0 2px 8px -2px rgba(255,143,171,0.12)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5a3042]">기초체온</span>
            <span className="text-xs text-[#b07080]">BBT</span>
          </div>
          {todayBbt !== undefined ? (
            <>
              <div className="text-2xl font-bold text-[#ff8fab]">
                {todayBbt.toFixed(2)}<span className="text-sm text-[#b07080]">℃</span>
              </div>
              <span className="text-xs text-[#b07080]">
                {todayBbt >= 36.7 ? '고온기 ↑' : todayBbt <= 36.3 ? '저온기 ↓' : '정상 범위'}
              </span>
            </>
          ) : (
            <Link href="/records" className="text-xs text-[#ff8fab] font-semibold mt-auto">
              + 오늘 기록하기
            </Link>
          )}
          {/* BBT 미니 꺾은선 */}
          {bbtPoints.length > 1 && (
            <div className="mt-1 h-8 relative">
              <svg viewBox={`0 0 ${bbtPoints.length * 12} 32`} className="w-full h-full">
                <polyline
                  points={bbtPoints.map((v, i) => {
                    const min = Math.min(...bbtPoints)
                    const max = Math.max(...bbtPoints)
                    const range = max - min || 0.1
                    const y = 28 - ((v - min) / range) * 24
                    return `${i * 12 + 6},${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="#ff8fab"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* OPK 피크 강조 알림 */}
      {isPeak && (
        <div
          className="rounded-2xl p-4 border flex items-center gap-3"
          style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}
        >
          <span className="text-2xl">🔴</span>
          <div>
            <p className="text-sm font-bold text-red-700">OPK 피크 감지!</p>
            <p className="text-xs text-red-600 mt-0.5">
              오늘 또는 내일이 최적 타이밍이에요. 봄이가 응원해요 💪
            </p>
          </div>
        </div>
      )}

      {/* 병원 방문 넛지 (자연 준비 3주기 이상 안내) */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
      >
        <span className="text-xl">💬</span>
        <div>
          <p className="text-xs font-bold text-green-800">데이터를 모아두세요</p>
          <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
            BBT·OPK 기록이 쌓이면 병원 방문 시 의사에게 바로 보여줄 수 있어요.
            <Link href="/records" className="underline ml-1">기록하러 가기 →</Link>
          </p>
        </div>
      </div>

    </div>
  )
}
