'use client'

/**
 * 인터랙션 흐름 (앱스토어 심사 우회 구조):
 *
 * 1. 유저가 [💊 영양제 챙기기] 체크
 * 2. 완료 토스트 팝업 "오늘도 건강을 챙기셨네요! 🌸" 노출 (0.8초)
 * 3. 앱 내 정보성 Bottom Sheet 오픈 (외부 링크 직행 ❌)
 * 4. 유저가 모달 내 [BOM 추천 가이드 보러가기] 버튼 탭
 * 5. 제휴 추적 코드 포함 외부 URL 오픈 (유저 제스처 컨텍스트)
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import type { HormoneRecord, TreatmentSchedule, UserMode } from '@fertility/shared'
import SupplementModal from './SupplementModal'

// ============================
// Toast 컴포넌트
// ============================

interface ToastProps {
  message: string
  visible: boolean
}

function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-lg transition-all duration-300 flex items-center gap-2"
      style={{
        backgroundColor: '#ff8fab',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : -16}px)`,
        pointerEvents: 'none',
      }}
    >
      <span>🌸</span> {message}
    </div>
  )
}

// ============================
// 토스트 + 모달 순차 오픈 핸들러
// ============================

/**
 * handleSupplementCheck(currentDone, setDone, setToast, setModalOpen)
 *
 * Pseudo-code:
 *   if (!currentDone) {
 *     setDone(true)                          // 1. 체크 상태 변경
 *     showToast("오늘도 건강을 챙기셨네요!") // 2. 완료 토스트 (800ms)
 *     setTimeout(() => {
 *       hideToast()
 *       showInAppModal()                     // 3. 정보성 Bottom Sheet 오픈
 *     }, 800)
 *   } else {
 *     setDone(false)                         // 체크 해제 시 모달 없음
 *   }
 *
 * openExternalAffiliateLink(url)             // 4. 유저 버튼 탭 후에만 호출
 *   → window.open(url)                       //    (유저 제스처 컨텍스트 필수)
 */

function useSupplementCheck(mode: UserMode) {
  const [done,       setDone]       = useState(false)
  const [toast,      setToast]      = useState(false)
  const [modalOpen,  setModalOpen]  = useState(false)

  const handleCheck = () => {
    if (!done) {
      setDone(true)
      // Step 2: 토스트 팝업
      setToast(true)
      setTimeout(() => {
        setToast(false)
        // Step 3: 토스트 사라진 후 Bottom Sheet 오픈
        setTimeout(() => setModalOpen(true), 150)
      }, 800)
    } else {
      setDone(false)
    }
  }

  return { done, toast, modalOpen, setModalOpen, handleCheck }
}

// ============================
// 공통 체크 아이템
// ============================

interface CheckItemProps {
  emoji: string
  label: string
  sub?: string
  done: boolean
  onToggle: () => void
  children?: React.ReactNode
}

function CheckItem({ emoji, label, sub, done, onToggle, children }: CheckItemProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 py-3 px-4 rounded-2xl bg-white border border-[#ffd6e0] active:scale-[0.98] transition-all text-left w-full"
        style={{ boxShadow: '0 1px 4px -1px rgba(255,143,171,0.1)' }}
      >
        {done
          ? <CheckCircle2 size={20} className="text-[#ff8fab] shrink-0" />
          : <Circle       size={20} className="text-[#ffd6e0] shrink-0" />
        }
        <div className="flex-1">
          <div className={`text-sm font-semibold ${done ? 'line-through text-[#c4a0ae]' : 'text-[#5a3042]'}`}>
            {emoji} {label}
          </div>
          {sub && <div className="text-[10px] text-[#b07080] mt-0.5">{sub}</div>}
        </div>
      </button>
      {done && children}
    </div>
  )
}

// ============================
// 자연임신 체크리스트
// ============================

interface NaturalChecklistProps {
  todayHormone?: HormoneRecord
  phase?: string // 사이클 단계 (모달 AI 코멘트 개인화에 사용)
}

export function NaturalChecklist({ todayHormone, phase }: NaturalChecklistProps) {
  const [bbtDone,      setBbtDone]      = useState(!!todayHormone?.bbt)
  const [opkDone,      setOpkDone]      = useState(todayHormone?.opkIndex !== undefined)
  const [homeworkDone, setHomeworkDone] = useState(false)
  const supplement = useSupplementCheck('NATURAL')

  useEffect(() => {
    setBbtDone(!!todayHormone?.bbt)
    setOpkDone(todayHormone?.opkIndex !== undefined)
  }, [todayHormone])

  return (
    <>
      <Toast message="오늘도 건강을 챙기셨네요!" visible={supplement.toast} />

      <div className="flex flex-col gap-2">

        <CheckItem
          emoji="🌡️" label="기초체온 측정하기"
          sub={bbtDone ? `오늘 체온: ${todayHormone?.bbt?.toFixed(2)}℃` : '아직 기록이 없어요'}
          done={bbtDone} onToggle={() => setBbtDone(v => !v)}
        >
          <Link href="/records" className="text-[10px] text-[#ff8fab] font-semibold mx-4 block">
            → 기록 화면으로 이동
          </Link>
        </CheckItem>

        <CheckItem
          emoji="🔬" label="배란테스트기 기록하기"
          sub={opkDone ? `최근 수치: ${todayHormone?.opkIndex}` : '아직 기록이 없어요'}
          done={opkDone} onToggle={() => setOpkDone(v => !v)}
        >
          <Link href="/records" className="text-[10px] text-[#ff8fab] font-semibold mx-4 block">
            → 기록 화면으로 이동
          </Link>
        </CheckItem>

        {/*
         * 인터랙션 흐름:
         * 체크 → 토스트("오늘도 건강을 챙기셨네요! 🌸") → Bottom Sheet → 유저 탭 → 외부 링크
         */}
        <CheckItem
          emoji="💊" label="영양제 챙기기"
          sub={supplement.done ? '오늘 복용 완료 ✓' : '엽산 · 이노시톨'}
          done={supplement.done}
          onToggle={supplement.handleCheck}
        >
          <button
            onClick={() => supplement.setModalOpen(true)}
            className="text-[10px] text-[#ff8fab] font-semibold mx-4 text-left"
          >
            ✨ BOM 추천 영양제 가이드 보기 →
          </button>
        </CheckItem>

        <CheckItem
          emoji="❤️" label="오늘의 숙제 체크"
          sub="가임기 타이밍 관리"
          done={homeworkDone} onToggle={() => setHomeworkDone(v => !v)}
        />

      </div>

      {/* Bottom Sheet — 정보성 인앱 콘텐츠 (심사 기준: 정보 제공) */}
      <SupplementModal
        isOpen={supplement.modalOpen}
        onClose={() => supplement.setModalOpen(false)}
        mode="NATURAL"
        phase={phase}
      />
    </>
  )
}

// ============================
// 시술 모드 체크리스트
// ============================

interface ClinicChecklistProps {
  schedules: TreatmentSchedule[]
  todayHormone?: HormoneRecord
}

export function ClinicChecklist({ schedules, todayHormone }: ClinicChecklistProps) {
  const today = new Date().toISOString().split('T')[0]
  const todaySchedules = schedules.filter(
    s => s.scheduledAt.startsWith(today) && s.status === 'scheduled'
  )

  const [symptomDone,  setSymptomDone]  = useState(false)
  const [checkedMeds,  setCheckedMeds]  = useState<Record<string, boolean>>({})
  const supplement = useSupplementCheck('CLINIC')

  const todayMeds: { id: string; name: string; dose: string; time: string }[] = []
  todaySchedules.forEach(s => {
    s.medications?.forEach(med => {
      med.times.forEach(time => {
        todayMeds.push({ id: `${s.id}-${med.name}-${time}`, name: med.name, dose: med.dose, time })
      })
    })
  })

  return (
    <>
      <Toast message="오늘도 건강을 챙기셨네요!" visible={supplement.toast} />

      <div className="flex flex-col gap-2">

        {todayMeds.length > 0 ? (
          todayMeds.map(med => (
            <CheckItem
              key={med.id}
              emoji="💉" label={`${med.name} ${med.dose}`}
              sub={`${med.time} · 알림 설정됨 🔔`}
              done={checkedMeds[med.id] ?? false}
              onToggle={() => setCheckedMeds(prev => ({ ...prev, [med.id]: !prev[med.id] }))}
            />
          ))
        ) : (
          <CheckItem
            emoji="💉" label="오늘 투약 일정 없음"
            sub="캘린더 탭에서 약물을 등록하세요"
            done={false} onToggle={() => {}}
          />
        )}

        {todaySchedules.map(s => (
          <CheckItem
            key={s.id} emoji="🏥" label={s.title}
            sub={s.hospitalName ?? '병원 방문'}
            done={s.status === 'completed'} onToggle={() => {}}
          />
        ))}

        {/* 영양제 — 동일한 토스트 + Bottom Sheet 흐름 */}
        <CheckItem
          emoji="💊" label="영양제 챙기기"
          sub={supplement.done ? '오늘 복용 완료 ✓' : '코큐텐 · 비타민D'}
          done={supplement.done}
          onToggle={supplement.handleCheck}
        >
          <button
            onClick={() => supplement.setModalOpen(true)}
            className="text-[10px] text-[#ff8fab] font-semibold mx-4 text-left"
          >
            ✨ BOM 시술 맞춤 영양제 가이드 보기 →
          </button>
        </CheckItem>

        <CheckItem
          emoji="📝" label="오늘 증상 기록하기"
          sub="복부 팽만, 복통 등"
          done={symptomDone} onToggle={() => setSymptomDone(v => !v)}
        >
          <Link
            href="/chat"
            className="flex items-center gap-2 mx-4 px-3 py-2 rounded-xl bg-[#f5f3ff] border border-[#ddd6fe]"
          >
            <span className="text-sm">✨</span>
            <span className="text-[10px] text-[#6d28d9] font-semibold">
              증상이 심하면 AI 봄이에게 물어보세요 →
            </span>
          </Link>
        </CheckItem>

      </div>

      <SupplementModal
        isOpen={supplement.modalOpen}
        onClose={() => supplement.setModalOpen(false)}
        mode="CLINIC"
      />
    </>
  )
}
