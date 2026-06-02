'use client'

import React from 'react'
import Link from 'next/link'
import { BookMarked, ChevronRight } from 'lucide-react'
import type { InfoArticle } from '@fertility/shared'

const CATEGORY_COLOR: Record<string, { bg: string; text: string; badge: string }> = {
  support:   { bg: '#eef2ff', text: '#4f46e5', badge: '#c7d2fe' },
  basics:    { bg: '#f0fdf4', text: '#16a34a', badge: '#bbf7d0' },
  hospital:  { bg: '#fff7ed', text: '#ea580c', badge: '#fed7aa' },
  lifestyle: { bg: '#fdf4ff', text: '#9333ea', badge: '#e9d5ff' },
}

interface InfoNudgeCardProps {
  article: InfoArticle
}

export default function InfoNudgeCard({ article }: InfoNudgeCardProps) {
  const colors = CATEGORY_COLOR[article.category]

  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <BookMarked size={15} style={{ color: '#ff8fab' }} />
          <span className="text-[13px] font-semibold" style={{ color: '#5a3042' }}>
            오늘의 임신 준비 정보
          </span>
        </div>
        <Link
          href="/community"
          className="text-[11px] font-medium flex items-center gap-0.5"
          style={{ color: '#ff8fab' }}
        >
          더 보기 <ChevronRight size={12} />
        </Link>
      </div>

      {/* 카드 */}
      <Link
        href="/community"
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: '#fff',
          border: '1px solid #ffeef3',
          boxShadow: '0 2px 8px -2px rgba(255,143,171,0.12)',
          display: 'flex',
        }}
      >
        {/* 이모지 아이콘 */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] shrink-0"
          style={{ background: colors.bg }}
        >
          {article.emoji}
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          {/* 카테고리 배지 */}
          <span
            className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1"
            style={{ background: colors.badge, color: colors.text }}
          >
            {article.categoryLabel}
          </span>

          {/* 제목 */}
          <div
            className="text-[13px] font-semibold leading-snug mb-1"
            style={{ color: '#5a3042' }}
          >
            {article.title}
          </div>

          {/* 요약 (1줄 클램프) */}
          <div
            className="text-[11px] leading-relaxed"
            style={{
              color: '#b07080',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {article.summary}
          </div>
        </div>

        <ChevronRight size={16} style={{ color: '#d4a0b0', flexShrink: 0, marginTop: 2 }} />
      </Link>
    </div>
  )
}
