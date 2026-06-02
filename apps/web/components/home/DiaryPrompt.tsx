'use client'

import React from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'
import type { DiaryEntry } from '@fertility/shared'

const MOOD_EMOJI: Record<string, string> = {
  great:   '😄',
  good:    '😊',
  neutral: '😐',
  sad:     '😢',
  anxious: '😰',
  hopeful: '💫',
}

interface DiaryPromptProps {
  latestDiary?: DiaryEntry
}

export default function DiaryPrompt({ latestDiary }: DiaryPromptProps) {
  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <BookOpen size={15} style={{ color: '#ff8fab' }} />
          <span className="text-[13px] font-semibold" style={{ color: '#5a3042' }}>
            오늘의 마음
          </span>
        </div>
        <Link
          href="/records"
          className="text-[11px] font-medium flex items-center gap-0.5"
          style={{ color: '#ff8fab' }}
        >
          쓰러 가기 <ChevronRight size={12} />
        </Link>
      </div>

      {/* 카드 */}
      <Link
        href="/records"
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{
          background: '#fff',
          border: '1px solid #ffeef3',
          boxShadow: '0 2px 8px -2px rgba(255,143,171,0.12)',
          display: 'flex',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0"
          style={{ background: '#fff0f4' }}
        >
          {latestDiary ? MOOD_EMOJI[latestDiary.mood] ?? '📝' : '📝'}
        </div>
        <div className="flex-1 min-w-0">
          {latestDiary ? (
            <>
              <div className="text-[13px] font-medium truncate" style={{ color: '#5a3042' }}>
                {latestDiary.content}
              </div>
              {latestDiary.aiAnalysis && (
                <div className="text-[11px] mt-0.5 truncate" style={{ color: '#b07080' }}>
                  AI: {latestDiary.aiAnalysis}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-[13px]" style={{ color: '#b07080' }}>
                오늘 감정을 기록해보세요
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#c4a0ae' }}>
                AI가 따뜻하게 응원해드려요
              </div>
            </>
          )}
        </div>
        <ChevronRight size={16} style={{ color: '#d4a0b0', flexShrink: 0 }} />
      </Link>
    </div>
  )
}
