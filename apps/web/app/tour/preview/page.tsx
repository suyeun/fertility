'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGuest } from '../../context/GuestContext'
import { Home, CalendarDays, Users, Sparkles, Lock, Circle, X, Send, ChevronRight } from 'lucide-react'

// ============================
// 로그인 유도 팝업
// ============================
function LoginPrompt({ onClose, guestMode, message }: {
  onClose: () => void
  guestMode: 'NATURAL' | 'CLINIC' | null
  message?: string
}) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl p-6 flex flex-col gap-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌸</span>
            <h3 className="text-base font-bold text-[#5a3042]">
              {message || '이 기능은 가입 후 사용할 수 있어요'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#b07080]"><X size={18} /></button>
        </div>
        <div className="bg-[#fff8f9] rounded-2xl p-4 border border-[#ffd6e0]">
          <p className="text-xs text-[#8c5060] leading-relaxed">
            지금 가입하면 선택하신{' '}
            <b>{guestMode === 'NATURAL' ? '🌱 자연임신 모드' : '🏥 시술 모드'}</b>가
            자동으로 설정되어 맞춤형 대시보드로 바로 시작할 수 있어요.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/signup')}
            className="w-full py-3.5 bg-[#ff8fab] text-white rounded-2xl text-sm font-bold active:scale-[0.98] transition-all"
          >
            무료 가입하고 시작하기 →
          </button>
          <button
            onClick={() => { onClose(); router.push('/login') }}
            className="w-full py-2.5 bg-[#fff0f4] text-[#ff8fab] rounded-2xl text-sm font-semibold"
          >
            이미 계정이 있어요 → 로그인
          </button>
        </div>
        <p className="text-[9px] text-[#c4a0ae] text-center">무료로 시작 · 신용카드 불필요</p>
      </div>
    </div>
  )
}

// ============================
// 데모 데이터
// ============================
const DEMO_NATURAL = {
  cycleDay: 14, phase: '배란기', dDay: 'D-1',
  bbt: 36.72, opk: 8.5, opkLabel: '피크 🔴',
  streak: [true, true, true, false, false, false, false],
}
const DEMO_CLINIC = {
  cycleDay: 8, stage: 'IVF 신선 1차', subStage: '과배란 유도 8일째', dDay: 'D-5',
  follicle: { left: 3, right: 4, max: 16 },
  nextSchedule: '6월 13일 난자 채취',
  streak: [true, true, true, true, false, false, false],
}
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

const DEMO_POSTS = [
  { id: 1, tag: '일상', emoji: '🌱', content: '오늘 OPK 드디어 두 줄 나왔어요!! 배란 오는 것 같아서 너무 설레요 🥺', reactions: { cheer: 24, empathy: 18, pray: 31 }, comments: 7, time: '2시간 전' },
  { id: 2, tag: '시술정보', emoji: '🏥', content: '2차 이식 판정일이에요. 떨리는 마음에 잠을 못잤어요. 다들 응원해주세요 💜', reactions: { cheer: 52, empathy: 41, pray: 88 }, comments: 23, time: '5시간 전' },
  { id: 3, tag: '일상', emoji: '💊', content: '엽산 먹은 지 3개월 됐는데 생리통이 확실히 줄었어요! 영양제 효과 있는 것 같아요', reactions: { cheer: 15, empathy: 9, pray: 12 }, comments: 4, time: '어제' },
  { id: 4, tag: '궁금해요', emoji: '🤔', content: 'AMH 수치가 0.8인데 자연임신 가능성이 있을까요? 병원에선 빨리 시작하라고 하던데…', reactions: { cheer: 8, empathy: 34, pray: 27 }, comments: 12, time: '어제' },
]

const DEMO_AI_MESSAGES = [
  { role: 'assistant', content: '안녕하세요! 루나예요 🌸\n임신 준비와 시술 관련 궁금한 점들을 편하게 물어보세요.' },
]

const SUGGESTED_QUESTIONS_NATURAL = [
  'OPK 수치가 8이면 배란이 임박한 건가요?',
  'BBT가 갑자기 올랐는데 어떤 의미인가요?',
  '가임기를 더 정확히 알 수 있는 방법이 있나요?',
]
const SUGGESTED_QUESTIONS_CLINIC = [
  '과배란 유도 중 배가 많이 부른데 정상인가요?',
  'AMH 수치가 낮으면 시술이 어려운가요?',
  '이식 후 황체호르몬 수치가 얼마면 좋은가요?',
]

// ============================
// 탭별 콘텐츠
// ============================

function HomeTab({ isNatural, demo, requireLogin }: { isNatural: boolean; demo: typeof DEMO_NATURAL | typeof DEMO_CLINIC; requireLogin: (msg?: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {/* 인사 */}
      <div>
        <h2 className="text-[18px] font-semibold text-[#5a3042]">안녕하세요 {isNatural ? '🌱' : '🏥'}</h2>
        <p className="text-[12px] text-[#b07080] mt-0.5">루네라가 따뜻한 기적을 함께 만들어가요</p>
      </div>

      {/* 히어로 카드 */}
      <div className="rounded-[24px] p-5 relative overflow-hidden"
        style={{ backgroundColor: isNatural ? '#ff8fab' : '#8b5cf6' }}>
        <div className="absolute top-5 right-5 text-right">
          <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {isNatural ? '배란 예정일' : '다음 일정'}
          </p>
          <p className="text-[14px] font-bold text-white">
            {isNatural ? '6월 10일' : (DEMO_CLINIC as any).nextSchedule}
          </p>
          <span className="inline-block mt-1.5 text-[11px] font-bold text-white rounded-full px-2.5 py-0.5"
            style={{ background: 'rgba(255,255,255,0.28)' }}>
            {demo.dDay}
          </span>
        </div>
        <p className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {isNatural ? '오늘의 사이클 상태' : '현재 시술'}
        </p>
        <div className="text-[22px] font-bold text-white mb-1 pr-28">
          {isNatural ? `🌸 ${(DEMO_NATURAL as any).phase}` : `🧬 ${(DEMO_CLINIC as any).stage}`}
        </div>
        <div className="text-[12px] mb-3 pr-24" style={{ color: 'rgba(255,255,255,0.85)' }}>
          사이클 {demo.cycleDay}일째
          {!isNatural && ` · ${(DEMO_CLINIC as any).subStage}`}
        </div>
        {isNatural && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] text-white/80">오늘 임신 확률</span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: i <= 4 ? '#ef4444' : 'rgba(255,255,255,0.25)' }} />
              ))}
            </div>
            <span className="text-[11px] font-bold text-white">높음 🔥</span>
          </div>
        )}
        <div className="rounded-2xl px-4 py-3 text-[12px] text-white leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          {isNatural ? '💗 지금은 가임기! 오늘 타이밍을 놓치지 마세요' : '과배란 유도 중이에요. 정해진 시간에 주사를 맞아요 💉'}
        </div>
      </div>

      {/* 데이터 위젯 */}
      {isNatural ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 bg-white border border-[#ffd6e0] flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-xs font-bold text-[#5a3042]">배란테스트기</span>
              <span className="text-[9px] text-[#b07080] bg-[#fff0f4] px-1.5 py-0.5 rounded-full">OPK</span>
            </div>
            <div className="text-2xl font-bold text-red-500">{DEMO_NATURAL.opk}<span className="text-sm text-[#b07080]">/10</span></div>
            <span className="text-xs font-semibold text-red-500">{DEMO_NATURAL.opkLabel}</span>
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${DEMO_NATURAL.opk * 10}%` }} />
            </div>
          </div>
          <div className="rounded-2xl p-4 bg-white border border-[#ffd6e0] flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-xs font-bold text-[#5a3042]">기초체온</span>
              <span className="text-[9px] text-[#b07080] bg-[#fff0f4] px-1.5 py-0.5 rounded-full">BBT</span>
            </div>
            <div className="text-2xl font-bold text-[#ff8fab]">{DEMO_NATURAL.bbt.toFixed(2)}<span className="text-sm text-[#b07080]">℃</span></div>
            <span className="text-xs text-[#b07080]">고온기 ↑</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 bg-white border border-[#ffd6e0] flex flex-col gap-2">
            <span className="text-xs font-bold text-[#5a3042]">난포 현황</span>
            <div className="text-sm font-bold text-[#8b5cf6]">좌 {DEMO_CLINIC.follicle.left}개 · 우 {DEMO_CLINIC.follicle.right}개</div>
            <span className="text-xs text-[#b07080]">최대 {DEMO_CLINIC.follicle.max}mm</span>
          </div>
          <div className="rounded-2xl p-4 bg-white border border-[#ffd6e0] flex flex-col gap-2">
            <span className="text-xs font-bold text-[#5a3042]">다음 일정</span>
            <div className="text-sm font-bold text-[#8b5cf6]">{DEMO_CLINIC.nextSchedule}</div>
            <span className="text-xs text-[#b07080]">{demo.dDay}</span>
          </div>
        </div>
      )}

      {/* 오늘 할 일 (잠금) */}
      <div>
        <p className="text-[13px] font-semibold text-[#5a3042] mb-2">오늘 할 일</p>
        <div className="flex flex-col gap-2">
          {(isNatural
            ? ['🌡️ 기초체온 측정하기', '🔬 배란테스트기 기록하기', '💊 영양제 챙기기', '❤️ 오늘의 숙제 체크']
            : ['💉 고날에프 150IU · 오전 10:00', '💊 에스트로겐 2mg', '💊 영양제 챙기기', '📝 오늘 증상 기록하기']
          ).map((task, i) => (
            <button key={i} onClick={() => requireLogin('기록 기능은 가입 후 사용할 수 있어요')}
              className="flex items-center gap-3 py-3 px-4 rounded-2xl bg-white border border-[#ffd6e0] text-left active:scale-[0.98] transition-all">
              <Circle size={20} className="text-[#ffd6e0] shrink-0" />
              <span className="text-sm text-[#5a3042]">{task}</span>
              <Lock size={12} className="ml-auto text-[#ffd6e0] shrink-0" />
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#c4a0ae] text-center mt-2">🔒 기록 기능은 가입 후 사용 가능해요</p>
      </div>

      {/* 이번 주 기록 */}
      <div className="bg-white rounded-2xl p-4 border border-[#ffd6e0]">
        <p className="text-[13px] font-semibold text-[#5a3042] mb-3">이번 주 기록</p>
        <div className="flex justify-around">
          {WEEKDAYS.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-[#b07080]">{day}</span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                demo.streak[i] ? 'bg-[#ff8fab]' : 'bg-[#fff0f4] border border-[#ffd6e0]'
              }`}>
                {demo.streak[i] && <span className="text-white text-[10px] font-bold">✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-[#ff8fab] to-[#ff6b8f] rounded-3xl p-5 text-center">
        <p className="text-white font-bold text-sm mb-1">마음에 드셨나요? 🌸</p>
        <p className="text-white/80 text-xs mb-4">가입하면 실제 데이터로 바로 시작할 수 있어요</p>
        <button onClick={() => { requireLogin() }}
          className="w-full py-3 bg-white text-[#ff8fab] rounded-2xl text-sm font-bold active:scale-[0.98] transition-all">
          무료 가입하고 시작하기 →
        </button>
      </div>
    </div>
  )
}

function CalendarTab({ isNatural, requireLogin }: { isNatural: boolean; requireLogin: (msg?: string) => void }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const todayDate = today.getDate()

  // 데모: 배란기 하이라이트 (8~14일), 생리일 (1~4일)
  const phaseDay = (d: number) => {
    if (d >= 1 && d <= 4) return 'period'
    if (d >= 10 && d <= 14) return 'fertile'
    if (d === 14) return 'ovulation'
    return null
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#5a3042]">
          {year}년 {month + 1}월
        </h2>
        <div className="flex items-center gap-1 text-[10px] text-[#c4a0ae]">
          <Lock size={10} />
          <span>기록은 가입 후 가능해요</span>
        </div>
      </div>

      {/* 캘린더 범례 */}
      <div className="flex gap-3 flex-wrap">
        {isNatural ? (
          <>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#fca5a5]" /><span className="text-[10px] text-[#b07080]">생리</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#86efac]" /><span className="text-[10px] text-[#b07080]">가임기</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#ff8fab]" /><span className="text-[10px] text-[#b07080]">배란일</span></div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#c4b5fd]" /><span className="text-[10px] text-[#b07080]">주사</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#6d28d9]" /><span className="text-[10px] text-[#b07080]">병원</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#ff8fab]" /><span className="text-[10px] text-[#b07080]">이식일</span></div>
          </>
        )}
      </div>

      {/* 캘린더 그리드 */}
      <div className="bg-white rounded-2xl border border-[#ffd6e0] p-4">
        <div className="grid grid-cols-7 mb-2">
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-[#b07080] py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const phase = phaseDay(d)
            const isToday = d === todayDate
            let bg = ''
            if (phase === 'period') bg = 'bg-[#fca5a5]'
            else if (phase === 'fertile') bg = 'bg-[#86efac]'
            else if (phase === 'ovulation') bg = 'bg-[#ff8fab]'
            return (
              <button key={i}
                onClick={() => requireLogin('일정을 기록하려면 가입이 필요해요')}
                className={`aspect-square flex items-center justify-center rounded-full text-[12px] transition-all active:scale-90 ${
                  isToday ? 'ring-2 ring-[#ff8fab] ring-offset-1' : ''
                } ${bg || 'hover:bg-[#fff0f4]'}`}>
                <span className={`${phase ? 'text-white font-semibold' : 'text-[#5a3042]'} ${isToday && !phase ? 'font-bold text-[#ff8fab]' : ''}`}>
                  {d}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 이번달 요약 데모 */}
      <div className="bg-white rounded-2xl border border-[#ffd6e0] p-4 flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-[#5a3042]">이번 달 요약 (데모)</p>
        {isNatural ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: '사이클', value: '28일' },
              { label: '배란 예측', value: '6/14' },
              { label: '가임기', value: '5일' },
            ].map(item => (
              <div key={item.label} className="bg-[#fff8f9] rounded-xl p-2.5">
                <p className="text-[10px] text-[#b07080]">{item.label}</p>
                <p className="text-sm font-bold text-[#ff8fab]">{item.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: '주사 일정', value: '12회' },
              { label: '병원 방문', value: '4회' },
              { label: '이식 예정', value: 'D-5' },
            ].map(item => (
              <div key={item.label} className="bg-[#f5f3ff] rounded-xl p-2.5">
                <p className="text-[10px] text-[#b07080]">{item.label}</p>
                <p className="text-sm font-bold text-[#8b5cf6]">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 일정 추가 버튼 */}
      <button
        onClick={() => requireLogin('일정을 기록하려면 가입이 필요해요')}
        className="w-full py-3.5 bg-[#fff0f4] border border-[#ffd6e0] text-[#ff8fab] rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
      >
        <Lock size={14} />
        일정 기록하기 (가입 필요)
      </button>
    </div>
  )
}

function CommunityTab({ requireLogin }: { requireLogin: (msg?: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-[#5a3042]">이야기방</h2>
        <p className="text-[11px] text-[#b07080] mt-0.5">100% 익명 · 글 읽기는 누구나 가능해요</p>
      </div>

      {/* 익명 배너 */}
      <div className="flex items-center gap-2 bg-[#f5f3ff] border border-[#ddd6fe] rounded-2xl px-3 py-2.5">
        <Lock size={12} className="text-[#7c3aed] shrink-0" />
        <p className="text-[11px] text-[#6d28d9] leading-relaxed">
          Lunera 커뮤니티는 <b>100% 익명</b>으로 운영돼요. 글쓰기는 가입 후 가능해요.
        </p>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2">
        {['전체', '일상', '시술정보', '궁금해요'].map((cat, i) => (
          <button key={cat}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
              i === 0 ? 'bg-[#ff8fab] text-white' : 'bg-white border border-[#ffd6e0] text-[#b07080]'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* 게시글 목록 (읽기 가능) */}
      <div className="flex flex-col gap-3">
        {DEMO_POSTS.map(post => (
          <div key={post.id}
            className="bg-white border border-[#ffd6e0] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fff0f4] text-[#ff8fab]">
                {post.tag}
              </span>
              <span className="text-[10px] text-[#c4a0ae] ml-auto">{post.time}</span>
            </div>
            <p className="text-sm text-[#5a3042] leading-relaxed">{post.content}</p>
            <div className="flex items-center gap-3">
              {[
                { emoji: '📣', label: '응원', count: post.reactions.cheer },
                { emoji: '🤍', label: '공감', count: post.reactions.empathy },
                { emoji: '🙏', label: '기도', count: post.reactions.pray },
              ].map(r => (
                <button key={r.label}
                  onClick={() => requireLogin('반응은 가입 후 남길 수 있어요')}
                  className="flex items-center gap-1 text-[11px] text-[#b07080] hover:text-[#ff8fab] transition-colors active:scale-95">
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              ))}
              <button
                onClick={() => requireLogin('댓글은 가입 후 남길 수 있어요')}
                className="ml-auto text-[11px] text-[#c4a0ae] hover:text-[#ff8fab] transition-colors">
                💬 댓글 {post.comments}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 글쓰기 버튼 */}
      <button
        onClick={() => requireLogin('글쓰기는 가입 후 가능해요')}
        className="w-full py-3.5 bg-[#fff0f4] border border-[#ffd6e0] text-[#ff8fab] rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
      >
        <Lock size={14} />
        글 작성하기 (가입 필요)
      </button>
    </div>
  )
}

function ChatTab({ isNatural, requireLogin }: { isNatural: boolean; requireLogin: (msg?: string) => void }) {
  const questions = isNatural ? SUGGESTED_QUESTIONS_NATURAL : SUGGESTED_QUESTIONS_CLINIC

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-[#5a3042]">루나와 대화하기</h2>
        <p className="text-[11px] text-[#b07080] mt-0.5">건강 기록 보조 챗봇 · 비의료 서비스</p>
      </div>

      {/* 면책 배너 */}
      <div className="flex items-start gap-2 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-3 py-2.5">
        <span className="text-[11px] shrink-0">⚠️</span>
        <p className="text-[10px] text-yellow-800 leading-relaxed">
          <b>루나는 의료 진단·처방을 제공하지 않아요.</b> 참고용 정보 안내 목적이며, 정확한 판단은 담당 전문의와 상의하세요.
        </p>
      </div>

      {/* 웰컴 메시지 */}
      <div className="bg-[#fff0f4] rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-sm font-bold text-[#5a3042]">안녕하세요! 루나예요 🌸</p>
        <p className="text-[12px] text-[#b07080] leading-relaxed">
          {isNatural
            ? '배란일, 기초체온, OPK 수치 등 자연 임신 준비 관련 궁금한 점을 물어보세요.'
            : '시술 과정, 호르몬 수치, 약물 정보 등 궁금한 점을 물어보세요.'
          }
        </p>
        <p className="text-[10px] text-[#c4a0ae]">※ 가입 후 루나와 대화할 수 있어요</p>
      </div>

      {/* 추천 질문 */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-[#b07080]">이런 것들을 물어볼 수 있어요</p>
        {questions.map((q, i) => (
          <button key={i}
            onClick={() => requireLogin('AI 상담은 가입 후 이용할 수 있어요')}
            className="flex items-center justify-between text-left text-[12px] text-[#8c5060] bg-white border border-[#ffd6e0] rounded-xl px-3 py-3 hover:bg-[#fff0f4] transition-colors active:scale-[0.98] gap-2">
            <span>{q}</span>
            <ChevronRight size={14} className="text-[#ffd6e0] shrink-0" />
          </button>
        ))}
      </div>

      {/* 입력창 (잠금) */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => requireLogin('AI 상담은 가입 후 이용할 수 있어요')}
          className="flex-1 flex items-center gap-2 text-sm px-4 py-3 rounded-2xl border border-[#ffd6e0] bg-[#fff8f9] text-[#c4a0ae]"
        >
          <Lock size={12} className="text-[#ffd6e0]" />
          가입 후 루나에게 물어보세요...
        </button>
        <button
          onClick={() => requireLogin('AI 상담은 가입 후 이용할 수 있어요')}
          className="p-3 bg-[#ffd6e0] text-white rounded-2xl shrink-0"
        >
          <Send size={16} className="text-white/60" />
        </button>
      </div>
    </div>
  )
}

// ============================
// 메인 페이지
// ============================
export default function TourPreviewPage() {
  const { guestMode } = useGuest()
  const router = useRouter()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginMessage, setLoginMessage] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'community' | 'chat'>('home')

  const requireLogin = (msg?: string) => {
    setLoginMessage(msg)
    setShowLoginPrompt(true)
  }

  if (!guestMode) {
    if (typeof window !== 'undefined') router.replace('/tour')
    return null
  }

  const isNatural = guestMode === 'NATURAL'
  const demo = isNatural ? DEMO_NATURAL : DEMO_CLINIC

  return (
    <div className="min-h-screen bg-[#fff8f9] flex flex-col pb-24">

      {/* 게스트 배너 */}
      <div className="flex items-center justify-between px-4 py-2 text-[10px] font-semibold"
        style={{ backgroundColor: isNatural ? '#dcfce7' : '#ede9fe', color: isNatural ? '#16a34a' : '#7c3aed' }}>
        <span>{isNatural ? '🌱 자연임신 모드 미리보기' : '🏥 시술 모드 미리보기'}</span>
        <button
          onClick={() => router.push('/signup')}
          className="px-2 py-0.5 rounded-full text-white text-[9px] font-bold"
          style={{ backgroundColor: isNatural ? '#16a34a' : '#7c3aed' }}>
          무료 가입
        </button>
      </div>

      {/* 헤더 */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-[#ffd6e0] bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <span className="font-bold text-base text-rose-950">Lunera</span>
        </div>
        <button onClick={() => router.push('/signup')}
          className="text-xs font-bold text-[#ff8fab] bg-[#fff0f4] px-3 py-1.5 rounded-full border border-[#ffd6e0]">
          무료 가입
        </button>
      </header>

      {/* 탭 콘텐츠 */}
      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'home' && <HomeTab isNatural={isNatural} demo={demo} requireLogin={requireLogin} />}
        {activeTab === 'calendar' && <CalendarTab isNatural={isNatural} requireLogin={requireLogin} />}
        {activeTab === 'community' && <CommunityTab requireLogin={requireLogin} />}
        {activeTab === 'chat' && <ChatTab isNatural={isNatural} requireLogin={requireLogin} />}
      </main>

      {/* 하단 탭 바 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-white border-t border-[#ffd6e0] px-2 py-2 flex justify-between items-center">
        {[
          { icon: Home, label: '홈', id: 'home' },
          { icon: CalendarDays, label: '캘린더', id: 'calendar' },
          { icon: Users, label: '이야기방', id: 'community' },
          { icon: Sparkles, label: 'AI 상담', id: 'chat' },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-all ${
                isActive ? 'text-[#ff8fab]' : 'text-[#c4a0ae]'
              }`}
            >
              <Icon size={isActive ? 22 : 19} />
              <span className="text-[9px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* 로그인 유도 팝업 */}
      {showLoginPrompt && (
        <LoginPrompt
          onClose={() => setShowLoginPrompt(false)}
          guestMode={guestMode}
          message={loginMessage}
        />
      )}
    </div>
  )
}
