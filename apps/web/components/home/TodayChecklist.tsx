'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import type { HormoneRecord, TreatmentSchedule, UserMode } from '@fertility/shared'
import SupplementModal, { handleSupplementCheck } from './SupplementModal'

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
          : <Circle size={20} className="text-[#ffd6e0] shrink-0" />
        }
        <div className="flex-1">
          <div className={`text-sm font-semibold ${done ? 'line-through text-[#c4a0ae]' : 'text-[#5a3042]'}`}>
            {emoji} {label}
          </div>
          {sub && <div className="text-[10px] text-[#b07080] mt-0.5">{sub}</div>}
        </div>
      </button>
      {/* done 상태에서만 children 표시 (체크 후 노출) */}
      {done && children}
    </div>
  )
}

// ============================
// 자연임신 체크리스트
// ============================

interface NaturalChecklistProps {
  todayHormone?: HormoneRecord
}

export function NaturalChecklist({ todayHormone }: NaturalChecklistProps) {
  const [bbtDone,        setBbtDone]        = useState(!!todayHormone?.bbt)
  const [opkDone,        setOpkDone]        = useState(todayHormone?.opkIndex !== undefined)
  const [supplementDone, setSupplementDone] = useState(false)
  const [homeworkDone,   setHomeworkDone]   = useState(false)
  const [modalOpen,      setModalOpen]      = useState(false)

  useEffect(() => {
    setBbtDone(!!todayHormone?.bbt)
    setOpkDone(todayHormone?.opkIndex !== undefined)
  }, [todayHormone])

  return (
    <>
      <div className="flex flex-col gap-2">

        <CheckItem
          emoji="🌡️" label="기초체온 측정하기"
          sub={bbtDone ? `${todayHormone?.bbt}°C 기록됨` : '소수점 둘째 자리까지 기록해요'}
          done={bbtDone} onToggle={() => setBbtDone(v => !v)}
        >
          <Link href="/records" className="text-[10px] text-[#ff8fab] font-semibold mx-4 block">
            → 기록 화면으로 이동
          </Link>
        </CheckItem>

        <CheckItem
          emoji="🔬" label="배란테스트기 기록하기"
          sub={opkDone ? `OPK ${todayHormone?.opkIndex}/10 기록됨` : '수치를 직접 입력해요'}
          done={opkDone} onToggle={() => setOpkDone(v => !v)}
        >
          <Link href="/records" className="text-[10px] text-[#ff8fab] font-semibold mx-4 block">
            → 기록 화면으로 이동
          </Link>
        </CheckItem>

        {/*
         * 영양제 체크 → 외부 링크 직행 ❌ (앱스토어 3.1.1 위반)
         * 영양제 체크 → 앱 내 정보 모달 → 유저 클릭 → 외부 링크 ✅
         */}
        <CheckItem
          emoji="💊" label="영양제 챙기기"
          sub={supplementDone ? '오늘 복용 완료 ✓' : '엽산 · 이노시톨'}
          done={supplementDone}
          onToggle={() =>
            handleSupplementCheck(supplementDone, setSupplementDone, setModalOpen)
          }
        >
          <button
            onClick={() => setModalOpen(true)}
            className="text-[10px] text-[#ff8fab] font-semibold mx-4 text-left"
          >
            ✨ BOM AI 추천 영양제 정보 보기 →
          </button>
        </CheckItem>

        <CheckItem
          emoji="❤️" label="오늘의 숙제 체크"
          sub="가임기 타이밍 관리"
          done={homeworkDone} onToggle={() => setHomeworkDone(v => !v)}
        />

      </div>

      {/* 영양제 정보 Bottom Sheet — 앱 내 콘텐츠 (심사 기준: 정보 제공) */}
      <SupplementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="NATURAL"
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

  const [supplementDone, setSupplementDone] = useState(false)
  const [symptomDone,    setSymptomDone]    = useState(false)
  const [modalOpen,      setModalOpen]      = useState(false)
  const [checkedMeds,    setCheckedMeds]    = useState<Record<string, boolean>>({})

  // 오늘 약물 flatten
  const todayMeds: { id: string; name: string; dose: string; time: string }[] = []
  todaySchedules.forEach(s => {
    s.medications?.forEach(med => {
      med.times.forEach(time => {
        todayMeds.push({
          id: `${s.id}-${med.name}-${time}`,
          name: med.name,
          dose: med.dose,
          time,
        })
      })
    })
  })

  return (
    <>
      <div className="flex flex-col gap-2">

        {/* 주사 / 약물 */}
        {todayMeds.length > 0 ? (
          todayMeds.map(med => (
            <CheckItem
              key={med.id}
              emoji="💉" label={`${med.name} ${med.dose}`}
              sub={`${med.time} · 알림 설정됨 🔔`}
              done={checkedMeds[med.id] ?? false}
              onToggle={() =>
                setCheckedMeds(prev => ({ ...prev, [med.id]: !prev[med.id] }))
              }
            />
          ))
        ) : (
          <CheckItem
            emoji="💉" label="오늘 투약 일정 없음"
            sub="캘린더 탭에서 약물을 등록하세요"
            done={false} onToggle={() => {}}
          />
        )}

        {/* 병원 방문 */}
        {todaySchedules.map(s => (
          <CheckItem
            key={s.id}
            emoji="🏥" label={s.title}
            sub={s.hospitalName ?? '병원 방문'}
            done={s.status === 'completed'}
            onToggle={() => {}}
          />
        ))}

        {/* 영양제 → 모달 흐름 */}
        <CheckItem
          emoji="💊" label="영양제 챙기기"
          sub={supplementDone ? '오늘 복용 완료 ✓' : '코큐텐 · 비타민D'}
          done={supplementDone}
          onToggle={() =>
            handleSupplementCheck(supplementDone, setSupplementDone, setModalOpen)
          }
        >
          <button
            onClick={() => setModalOpen(true)}
            className="text-[10px] text-[#ff8fab] font-semibold mx-4 text-left"
          >
            ✨ BOM AI 시술 맞춤 영양제 정보 보기 →
          </button>
        </CheckItem>

        {/* 증상 기록 + AI 연계 */}
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

      {/* 영양제 정보 Bottom Sheet */}
      <SupplementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="CLINIC"
      />
    </>
  )
}
