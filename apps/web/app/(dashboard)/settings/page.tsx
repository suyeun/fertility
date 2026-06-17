'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usersApi, useModeChange, useUserStore, MODE_OPTIONS, IUI_STAGE_OPTIONS, IVF_STAGE_OPTIONS, getStageLabelKo } from '@fertility/shared'
import { useRouter } from 'next/navigation'
import {
  Settings, ChevronRight, X, Minus, Plus, AlertTriangle,
} from 'lucide-react'

const APP_VERSION = '1.0.0'

const STAGE_OPTIONS = [
  { value: 'natural',  emoji: '🌱', label: '자연임신 준비',       sub: '자연 임신을 시도하고 있어요' },
  { value: 'iui',      emoji: '🧪', label: '인공수정 (IUI)',      sub: 'IUI와 함께 준비하고 있어요' },
  { value: 'ivf',      emoji: '🧬', label: '시험관 (IVF)',        sub: 'IVF와 함께 준비하고 있어요' },
  { value: 'fet',      emoji: '❄️', label: '동결배아이식 (FET)', sub: 'FET와 함께 나아가고 있어요' },
  { value: 'pregnant', emoji: '🌸', label: '임신 성공 🎉',        sub: '소중한 생명을 품고 있어요' },
] as const

type ModalType = 'profile' | 'nickname' | 'stage' | 'cycle' | 'terms' | 'privacy' | 'delete' | 'mode_change' | 'stage_change' | 'confirm_nat' | null

// ─── 재사용 소형 컴포넌트 ────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
      {label}
    </p>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100/60 shadow-sm">
      {children}
    </div>
  )
}

function SettingRow({
  emoji, label, value, onClick, danger = false, staticRow = false,
}: {
  emoji: string; label: string; value?: string
  onClick?: () => void; danger?: boolean; staticRow?: boolean
}) {
  if (staticRow) {
    return (
      <div className="flex items-center justify-between px-4 py-3.5">
        <span className="text-sm font-medium text-slate-600 flex items-center gap-3">
          <span className="text-[18px] w-7 text-center">{emoji}</span>
          {label}
        </span>
        {value && <span className="text-xs text-gray-400 font-medium">{value}</span>}
      </div>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left ${
        danger ? 'hover:bg-red-50/60' : 'hover:bg-rose-50/40'
      }`}
    >
      <span className={`text-sm font-medium flex items-center gap-3 ${
        danger ? 'text-red-500' : 'text-slate-700'
      }`}>
        <span className="text-[18px] w-7 text-center">{emoji}</span>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {value && <span className="text-xs text-gray-400">{value}</span>}
        <ChevronRight size={14} className={danger ? 'text-red-200' : 'text-gray-300'} />
      </div>
    </button>
  )
}

function ModalSheet({
  title, subtitle, onClose, children,
}: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex justify-center items-end animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[480px] rounded-t-3xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start px-6 pt-6 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 pb-8">{children}</div>
      </div>
    </div>
  )
}

// ─── 주 컴포넌트 ─────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, profile: authProfile, logout, refreshProfile } = useAuth()
  const { profile: storeProfile, syncProfile } = useUserStore()
  const profile = storeProfile ?? authProfile
  const router = useRouter()

  const {
    sheet: modeSheet, saving: modeSaving, pendingMode,
    currentMode, currentStage,
    openModeSheet, openStageSheet, closeSheet: closeModeSheet,
    handleModeSelect, confirmToNatural, handleStageSelect,
  } = useModeChange()

  const handleModeChangeComplete = async () => {
    await syncProfile()
    await refreshProfile()
  }

  const [modal, setModal] = useState<ModalType>(null)
  const [saving, setSaving] = useState(false)

  // 회원정보 수정 폼
  const [name, setName]               = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [partnerName, setPartnerName] = useState('')

  // 닉네임
  const [nickname, setNickname] = useState('')

  // 준비 단계
  const [selectedStage, setSelectedStage] = useState('')

  // 주기 설정
  const [cycleLength, setCycleLength]   = useState(28)
  const [periodLength, setPeriodLength] = useState(5)

  // 회원탈퇴 확인 입력
  const [deleteInput, setDeleteInput] = useState('')

  useEffect(() => {
    if (!profile) return
    setName(profile.name || '')
    setDateOfBirth(profile.dateOfBirth || '')
    setPartnerName(profile.partnerName || '')
    setNickname(profile.name || '')
    setSelectedStage(profile.treatmentStage || 'natural')
    setCycleLength(profile.averageCycleLength || 28)
    setPeriodLength(profile.averagePeriodLength || 5)
  }, [profile])

  const closeModal = useCallback(() => {
    setModal(null)
    setDeleteInput('')
  }, [])

  const save = async (data: Record<string, any>) => {
    if (!user) return
    setSaving(true)
    try {
      await usersApi.updateProfile(data)
      await refreshProfile()
      closeModal()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteInput !== '탈퇴합니다' || !user) return
    setSaving(true)
    try {
      logout()
      router.push('/signup')
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  const stageOption = STAGE_OPTIONS.find(s => s.value === profile?.treatmentStage)

  const StepInput = ({
    value, onChange, min, max, unit,
  }: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string }) => (
    <div className="flex items-center justify-center gap-4 py-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-rose-50 active-press transition-colors"
      >
        <Minus size={16} />
      </button>
      <span className="text-3xl font-bold text-rose-900 w-20 text-center">
        {value}<span className="text-base font-normal text-gray-400 ml-1">{unit}</span>
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-rose-50 active-press transition-colors"
      >
        <Plus size={16} />
      </button>
    </div>
  )

  return (
    <div className="space-y-5 pb-4">

      {/* 페이지 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-rose-950 flex items-center gap-1.5">
          <Settings size={18} className="text-primary" />
          설정
        </h2>
        <p className="text-xs text-rose-900/50 mt-0.5">계정과 앱 환경을 관리해요</p>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-gradient-soft-rose rounded-3xl p-5 border border-rose-100/40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-2xl bg-white/60 border border-white/50 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-2xl font-bold text-rose-400">
              {(profile?.name || '?')[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-rose-950 text-[15px] truncate">{profile?.name || '사용자'}</p>
            <p className="text-[11px] text-rose-900/50 truncate mt-0.5">
              {profile?.email || (user as any)?.email || ''}
            </p>
            {stageOption && (
              <span className="inline-block mt-1.5 text-[10px] bg-white/70 text-rose-700 font-semibold px-2.5 py-0.5 rounded-full border border-rose-100">
                {stageOption.emoji} {stageOption.label}
              </span>
            )}
          </div>
          <button
            onClick={() => setModal('profile')}
            className="shrink-0 text-[11px] font-semibold text-rose-600 bg-white/60 px-3 py-1.5 rounded-xl border border-rose-100/60 hover:bg-white active-press transition-colors"
          >
            수정
          </button>
        </div>
      </div>

      {/* 나의 치료 정보 */}
      <div className="space-y-1.5">
        <SectionTitle label="나의 치료 정보" />
        <SectionCard>
          <SettingRow
            emoji={MODE_OPTIONS.find(m => m.value === currentMode)?.emoji ?? '🌱'}
            label="현재 모드"
            value={MODE_OPTIONS.find(m => m.value === currentMode)?.label}
            onClick={openModeSheet}
          />
          {currentMode !== 'natural' && (
            <SettingRow
              emoji="📍"
              label="현재 단계"
              value={currentStage ? getStageLabelKo(currentMode, currentStage) : '미설정'}
              onClick={openStageSheet}
            />
          )}
        </SectionCard>
      </div>

      {/* 계정 설정 */}
      <div className="space-y-1.5">
        <SectionTitle label="계정 설정" />
        <SectionCard>
          <SettingRow
            emoji="🏷️" label="닉네임 관리"
            value={profile?.name}
            onClick={() => setModal('nickname')}
          />
          <SettingRow
            emoji="🌱" label="나의 준비 단계"
            value={stageOption?.label}
            onClick={() => setModal('stage')}
          />
        </SectionCard>
      </div>

      {/* 개인 설정 */}
      <div className="space-y-1.5">
        <SectionTitle label="개인 설정" />
        <SectionCard>
          <SettingRow
            emoji="📅" label="평균 생리 주기"
            value={`${profile?.averageCycleLength ?? 28}일`}
            onClick={() => setModal('cycle')}
          />
          <SettingRow
            emoji="🌸" label="생리 기간"
            value={`${profile?.averagePeriodLength ?? 5}일`}
            onClick={() => setModal('cycle')}
          />
        </SectionCard>
      </div>

      {/* 앱 정보 */}
      <div className="space-y-1.5">
        <SectionTitle label="앱 정보" />
        <SectionCard>
          <SettingRow emoji="📱" label="앱 버전" value={`v${APP_VERSION}`} staticRow />
          <SettingRow emoji="📄" label="이용약관"            onClick={() => setModal('terms')} />
          <SettingRow emoji="🔒" label="개인정보처리방침"    onClick={() => setModal('privacy')} />
        </SectionCard>
      </div>

      {/* 계정 관리 */}
      <div className="space-y-1.5">
        <SectionTitle label="계정 관리" />
        <SectionCard>
          <SettingRow emoji="🚪" label="로그아웃"  onClick={logout} />
          <SettingRow emoji="⚠️" label="회원 탈퇴" onClick={() => setModal('delete')} danger />
        </SectionCard>
      </div>

      {/* ── 모달 ─────────────────────────────────────────────────── */}

      {/* 1. 회원정보 수정 */}
      {modal === 'profile' && (
        <ModalSheet title="회원정보 수정" onClose={closeModal}>
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-rose-900/60 mb-1.5 ml-1">이름</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-rose-900/60 mb-1.5 ml-1">생년월일</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-rose-900/60 mb-1.5 ml-1">
                파트너 이름 <span className="font-normal text-gray-400">(선택)</span>
              </label>
              <input
                value={partnerName}
                onChange={e => setPartnerName(e.target.value)}
                placeholder="파트너 이름"
                className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="bg-slate-50 rounded-2xl px-4 py-3">
              <p className="text-[11px] text-gray-400">
                <span className="font-semibold text-slate-500">이메일</span>
                <span className="ml-2">{profile?.email || (user as any)?.email || '—'}</span>
              </p>
              <p className="text-[10px] text-gray-300 mt-0.5">이메일은 고객센터를 통해 변경할 수 있어요</p>
            </div>
            <button
              onClick={() => save({ name: name.trim(), dateOfBirth, partnerName: partnerName.trim() })}
              disabled={saving || !name.trim()}
              className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press disabled:bg-rose-200 transition-all"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </ModalSheet>
      )}

      {/* 2. 닉네임 관리 */}
      {modal === 'nickname' && (
        <ModalSheet
          title="닉네임 관리"
          subtitle="커뮤니티 일반 게시판에 표시되는 이름이에요"
          onClose={closeModal}
        >
          <div className="space-y-3.5">
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={16}
              className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
              <p className="text-[11px] text-purple-700 font-semibold">🔒 비밀 대화방은 별도 익명 닉네임 사용</p>
              <p className="text-[10px] text-purple-500 mt-0.5 leading-relaxed">
                비밀 대화방에서는 게시글마다 다른 익명 닉네임이 자동 부여되어 실명이 공개되지 않아요.
              </p>
            </div>
            <button
              onClick={() => save({ name: nickname.trim() })}
              disabled={saving || !nickname.trim()}
              className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press disabled:bg-rose-200 transition-all"
            >
              {saving ? '저장 중...' : '닉네임 변경'}
            </button>
          </div>
        </ModalSheet>
      )}

      {/* 3. 준비 단계 변경 */}
      {modal === 'stage' && (
        <ModalSheet title="나의 준비 단계" subtitle="지금 나의 상황에 맞는 단계를 선택해주세요" onClose={closeModal}>
          <div className="space-y-2.5">
            {STAGE_OPTIONS.map(opt => {
              const isSelected = selectedStage === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSelectedStage(opt.value)
                    save({ treatmentStage: opt.value })
                  }}
                  disabled={saving}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all active-press ${
                    isSelected
                      ? 'bg-rose-50 border-primary text-rose-700'
                      : 'bg-white border-slate-100 text-slate-700 hover:border-rose-100'
                  }`}
                >
                  <span className="text-xl shrink-0">{opt.emoji}</span>
                  <div className="text-left flex-1">
                    <p className={`text-sm font-semibold ${isSelected ? 'text-rose-700' : 'text-slate-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{opt.sub}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </ModalSheet>
      )}

      {/* 4. 주기 설정 */}
      {modal === 'cycle' && (
        <ModalSheet title="주기 설정" subtitle="생리 주기와 기간을 설정해요" onClose={closeModal}>
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold text-rose-900/60 mb-3">평균 생리 주기</p>
              <StepInput
                value={cycleLength}
                onChange={setCycleLength}
                min={21} max={45} unit="일"
              />
              <p className="text-[10px] text-gray-400 text-center mt-1">일반적인 범위: 21 – 35일</p>
            </div>
            <div className="border-t border-slate-100 pt-5">
              <p className="text-[11px] font-semibold text-rose-900/60 mb-3">생리 기간</p>
              <StepInput
                value={periodLength}
                onChange={setPeriodLength}
                min={2} max={10} unit="일"
              />
              <p className="text-[10px] text-gray-400 text-center mt-1">일반적인 범위: 3 – 7일</p>
            </div>
            <button
              onClick={() => save({ averageCycleLength: cycleLength, averagePeriodLength: periodLength })}
              disabled={saving}
              className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active-press disabled:bg-rose-200 transition-all"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </ModalSheet>
      )}

      {/* 5. 이용약관 */}
      {modal === 'terms' && (
        <ModalSheet title="이용약관" onClose={closeModal}>
          <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1 text-[12px] text-gray-600 leading-relaxed">
            <div>
              <p className="font-bold text-slate-700 mb-1">제1조 목적</p>
              <p>본 약관은 꽃봄(이하 "서비스")이 제공하는 임신 준비 AI 파트너 앱의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-1">제2조 서비스의 내용</p>
              <p>서비스는 생리 주기 추적, 호르몬 수치 기록, 시술 일정 관리, AI 상담, 익명 커뮤니티 기능을 제공합니다. 본 서비스는 의료 진단이나 처방을 대체하지 않으며, 모든 의료적 결정은 담당 의사와 상담하시기 바랍니다.</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-1">제3조 개인정보 보호</p>
              <p>서비스는 이용자의 민감한 건강 정보를 소중히 다룹니다. 수집된 정보는 서비스 제공 목적 이외에는 사용되지 않으며, 관련 법령에 따라 보호됩니다.</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-1">제4조 익명 게시판 이용</p>
              <p>비밀 대화방은 완전 익명으로 운영됩니다. 타인을 비방하거나 허위 의료 정보를 유포하는 행위는 제한될 수 있습니다.</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-1">제5조 면책조항</p>
              <p>서비스 내 AI 상담 및 콘텐츠는 참고용이며, 의료적 진단·처방을 대체할 수 없습니다. 이용자의 건강 관련 결정에 대한 책임은 이용자 본인에게 있습니다.</p>
            </div>
            <p className="text-gray-400 text-[10px] pt-2 border-t border-slate-100">
              시행일: 2025년 1월 1일 | 버전 1.0
            </p>
          </div>
        </ModalSheet>
      )}

      {/* 6. 개인정보처리방침 */}
      {modal === 'privacy' && (
        <ModalSheet title="개인정보처리방침" onClose={closeModal}>
          <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1 text-[12px] text-gray-600 leading-relaxed">
            <div>
              <p className="font-bold text-slate-700 mb-1">수집하는 개인정보</p>
              <p>이메일, 이름, 생년월일(선택), 생리 주기 데이터, 호르몬 수치, 감정 일기, 시술 일정 등 임신 준비를 위해 직접 입력하신 정보를 수집합니다.</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-1">수집 목적</p>
              <p>맞춤형 임신 준비 가이드 제공, 주기 분석, AI 상담, 커뮤니티 기능 운영에 사용됩니다.</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-1">보유 기간</p>
              <p>회원 탈퇴 시 즉시 삭제됩니다. 단, 법령에 의해 보존이 요구되는 경우 해당 기간 동안 보관합니다.</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-1">제3자 제공</p>
              <p>이용자의 동의 없이 제3자에게 개인정보를 제공하지 않습니다. AI 응답 생성을 위해 Anthropic의 API를 활용하며, 해당 데이터는 모델 학습에 사용되지 않습니다.</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-1">익명 커뮤니티</p>
              <p>비밀 대화방에서는 사용자 식별 정보 대신 해시 처리된 익명 토큰만 저장되며, 실명·이메일은 절대 기록되지 않습니다.</p>
            </div>
            <p className="text-gray-400 text-[10px] pt-2 border-t border-slate-100">
              시행일: 2025년 1월 1일 | 개인정보보호 책임자: privacy@fertilitybom.com
            </p>
          </div>
        </ModalSheet>
      )}

      {/* 8. 모드 변경 */}
      {modeSheet === 'mode' && (
        <ModalSheet title="치료 모드 변경" subtitle="현재 상황에 맞는 모드를 선택해주세요" onClose={closeModeSheet}>
          <div className="space-y-2.5">
            {MODE_OPTIONS.map(opt => {
              const isSelected = currentMode === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleModeSelect(opt.value)}
                  disabled={modeSaving}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all ${
                    isSelected ? 'border-[#ff8fab] bg-[#fff0f4]' : 'border-slate-100 hover:border-rose-100'
                  }`}
                >
                  <span className="text-xl w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{ backgroundColor: opt.color + '18' }}>
                    {opt.emoji}
                  </span>
                  <div className="text-left flex-1">
                    <p className={`text-sm font-semibold ${isSelected ? 'text-[#c0005a]' : 'text-slate-700'}`}>{opt.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{opt.sub}</p>
                  </div>
                  {isSelected && <div className="w-4 h-4 rounded-full bg-[#ff8fab] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>}
                </button>
              )
            })}
          </div>
        </ModalSheet>
      )}

      {/* 9. 시술 단계 변경 */}
      {modeSheet === 'stage' && (
        <ModalSheet
          title={`${pendingMode === 'iui' || (!pendingMode && currentMode === 'iui') ? '인공수정(IUI)' : '시험관(IVF)'} 단계 선택`}
          subtitle="현재 진행 중인 단계를 선택해주세요"
          onClose={closeModeSheet}
        >
          <div className="space-y-2">
            {(pendingMode === 'iui' || (!pendingMode && currentMode === 'iui') ? IUI_STAGE_OPTIONS : IVF_STAGE_OPTIONS).map((opt, i) => {
              const isUnknown = opt.value === null
              const isSelected = currentStage === opt.value && !pendingMode
              return (
                <button
                  key={i}
                  onClick={async () => { await handleStageSelect(opt.value); await handleModeChangeComplete() }}
                  disabled={modeSaving}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left
                    ${isSelected ? 'border-[#ff8fab] bg-[#fff0f4]' : isUnknown ? 'border-dashed border-slate-200 hover:border-rose-100' : 'border-slate-100 hover:border-rose-100'}`}
                >
                  <span className="text-lg w-8 h-8 flex items-center justify-center rounded-xl bg-[#fff0f4] flex-shrink-0">{opt.emoji}</span>
                  <span className={`text-sm font-semibold ${isUnknown ? 'text-gray-400' : isSelected ? 'text-[#c0005a]' : 'text-slate-700'}`}>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </ModalSheet>
      )}

      {/* 10. 시술 → 자연임신 확인 */}
      {modeSheet === 'confirm_nat' && (
        <ModalSheet title="자연임신 모드로 변경" onClose={closeModeSheet}>
          <div className="space-y-4">
            <div className="bg-[#fff0f4] border border-[#ffd6e0] rounded-2xl p-4 text-sm text-[#8c5060] leading-relaxed">
              🌸 시술 관련 기록은 모두 유지됩니다.<br />모드만 자연임신 준비로 변경할게요.
            </div>
            <button
              onClick={async () => { await confirmToNatural(); await handleModeChangeComplete() }}
              disabled={modeSaving}
              className="w-full py-3.5 bg-[#22c55e] text-white rounded-2xl text-sm font-semibold disabled:opacity-50"
            >
              {modeSaving ? '변경 중...' : '자연임신 모드로 변경'}
            </button>
            <button onClick={closeModeSheet} className="w-full py-3 text-sm text-gray-400">취소</button>
          </div>
        </ModalSheet>
      )}

      {/* 7. 회원탈퇴 */}
      {modal === 'delete' && (
        <ModalSheet title="회원 탈퇴" onClose={closeModal}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div className="text-[12px] text-red-700 space-y-1 leading-relaxed">
                <p className="font-semibold">탈퇴 전 꼭 확인해주세요</p>
                <ul className="space-y-1 text-red-600">
                  <li>• 주기 기록, 호르몬 수치, 감정 일기 등 모든 데이터가 삭제됩니다</li>
                  <li>• 삭제된 데이터는 복구할 수 없습니다</li>
                  <li>• 커뮤니티 게시글은 익명 상태로 유지됩니다</li>
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                탈퇴하려면 아래에{' '}
                <span className="font-bold text-red-500">'탈퇴합니다'</span>
                를 입력해주세요
              </label>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="탈퇴합니다"
                className="w-full px-4 py-3 rounded-2xl border border-red-100 bg-red-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            <button
              onClick={handleDeleteAccount}
              disabled={deleteInput !== '탈퇴합니다' || saving}
              className="w-full py-3.5 bg-red-500 text-white rounded-2xl text-sm font-semibold hover:bg-red-600 active-press disabled:bg-red-200 disabled:cursor-not-allowed transition-all"
            >
              {saving ? '탈퇴 처리 중...' : '회원 탈퇴'}
            </button>
          </div>
        </ModalSheet>
      )}
    </div>
  )
}
