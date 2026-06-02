'use client'

import React, { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { INFO_ARTICLES, INFO_CATEGORIES } from '@fertility/shared'
import type { InfoCategory } from '@fertility/shared'

const CATEGORY_BG: Record<string, string> = {
  support:   '#eef2ff',
  basics:    '#f0fdf4',
  hospital:  '#fff7ed',
  lifestyle: '#fdf4ff',
}
const CATEGORY_TEXT: Record<string, string> = {
  support:   '#4f46e5',
  basics:    '#16a34a',
  hospital:  '#ea580c',
  lifestyle: '#9333ea',
}

export default function InfoTab() {
  const [activeCategory, setActiveCategory] = useState<InfoCategory | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = activeCategory === 'all'
    ? INFO_ARTICLES
    : INFO_ARTICLES.filter(a => a.category === activeCategory)

  const toggle = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id))

  return (
    <div>
      {/* 카테고리 칩 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 mb-4">
        {INFO_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-2xl text-[10px] font-bold whitespace-nowrap transition-all active-press"
            style={
              activeCategory === cat.value
                ? { background: '#ff8fab', color: '#fff' }
                : { background: '#fff', border: '1px solid #ffeef3', color: '#b07080' }
            }
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* 안내 문구 */}
      <p className="text-[10px] mb-3" style={{ color: '#c4a0ae' }}>
        봄이 엄선한 임신 준비 정보예요 🌸 궁금한 항목을 눌러 자세히 읽어봐요.
      </p>

      {/* 아티클 목록 */}
      <div className="flex flex-col gap-3">
        {filtered.map(article => {
          const isOpen = expandedId === article.id
          const bg   = CATEGORY_BG[article.category]
          const text = CATEGORY_TEXT[article.category]

          return (
            <div
              key={article.id}
              className="rounded-2xl overflow-hidden"
              style={{
                background: '#fff',
                border: '1px solid #ffeef3',
                boxShadow: '0 2px 8px -2px rgba(255,143,171,0.10)',
              }}
            >
              {/* 헤더 (클릭 토글) */}
              <button
                onClick={() => toggle(article.id)}
                className="w-full text-left p-4 flex items-start gap-3"
              >
                {/* 이모지 아이콘 */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                  style={{ background: bg }}
                >
                  {article.emoji}
                </div>

                {/* 제목 + 카테고리 배지 + 요약 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: bg, color: text }}
                    >
                      {article.categoryLabel}
                    </span>
                  </div>
                  <div
                    className="text-[13px] font-semibold leading-snug mb-1"
                    style={{ color: '#5a3042' }}
                  >
                    {article.title}
                  </div>
                  <div
                    className="text-[11px] leading-relaxed"
                    style={{ color: '#b07080' }}
                  >
                    {article.summary}
                  </div>
                </div>

                {/* 토글 아이콘 */}
                <div className="shrink-0 mt-1" style={{ color: '#d4a0b0' }}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* 펼쳐진 내용 */}
              {isOpen && (
                <div
                  className="px-4 pb-4"
                  style={{ borderTop: '1px solid #ffeef3' }}
                >
                  <div
                    className="pt-3 text-[12px] leading-relaxed whitespace-pre-wrap"
                    style={{ color: '#5a3042' }}
                  >
                    {article.content}
                  </div>

                  {/* 외부 링크 */}
                  {article.source && (
                    <a
                      href={article.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold"
                      style={{ color: '#ff8fab' }}
                    >
                      <ExternalLink size={12} />
                      {article.sourceLabel ?? '공식 사이트 확인하기'}
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
