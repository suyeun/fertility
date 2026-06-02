'use client'

import React from 'react'
import Link from 'next/link'
import type { HormoneRecord } from '@fertility/shared'

interface QuickRecordsProps {
  todayHormone?: HormoneRecord
}

export default function QuickRecords({ todayHormone }: QuickRecordsProps) {
  const bbt = todayHormone?.bbt
  const opk = todayHormone?.opkIndex

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #ffd6e0',
    boxShadow: '0 2px 8px -2px rgba(255,143,171,0.15)',
    borderRadius: '18px',
    padding: '14px',
    display: 'block',
    transition: 'background 0.15s',
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Link href="/records" style={cardStyle}>
        <div className="text-[22px] mb-2">🌡️</div>
        <div className="text-[12px] font-semibold mb-0.5" style={{ color: '#5a3042' }}>
          오늘 기초체온
        </div>
        {bbt ? (
          <div className="text-[14px] font-bold" style={{ color: '#ff8fab' }}>
            {bbt}°C
          </div>
        ) : (
          <>
            <div className="text-[11px]" style={{ color: '#c4a0ae' }}>아직 기록 없음</div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color: '#ff8fab' }}>기록하기 →</div>
          </>
        )}
      </Link>

      <Link href="/records" style={cardStyle}>
        <div className="text-[22px] mb-2">🥚</div>
        <div className="text-[12px] font-semibold mb-0.5" style={{ color: '#5a3042' }}>
          배란 테스트기
        </div>
        {opk !== undefined ? (
          <div className="text-[14px] font-bold" style={{ color: '#ff8fab' }}>
            OPK {opk}/10
          </div>
        ) : (
          <>
            <div className="text-[11px]" style={{ color: '#c4a0ae' }}>아직 기록 없음</div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color: '#ff8fab' }}>기록하기 →</div>
          </>
        )}
      </Link>
    </div>
  )
}
