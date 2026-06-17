'use client'

import { useState } from 'react'
import { useUserStore } from '../store/userStore'
import { usersApi } from '../lib/api'
import type { TreatmentMode, CurrentStage } from '../types'

export type ModeChangeSheet =
  | 'mode'          // 모드 선택
  | 'stage'         // 시술 단계 선택
  | 'confirm_nat'   // 시술 → 자연임신 전환 확인
  | null

export function useModeChange() {
  const { profile, setMode, setCurrentStage } = useUserStore()
  const [sheet, setSheet] = useState<ModeChangeSheet>(null)
  const [pendingMode, setPendingMode] = useState<TreatmentMode | null>(null)
  const [saving, setSaving] = useState(false)

  const currentMode = (profile?.treatmentStage as TreatmentMode) ?? 'natural'
  const currentStage = (profile as any)?._currentStage as CurrentStage ?? null

  const openModeSheet = () => setSheet('mode')
  const openStageSheet = () => setSheet('stage')
  const closeSheet = () => { setSheet(null); setPendingMode(null) }

  const handleModeSelect = (mode: TreatmentMode) => {
    if (mode === currentMode) { closeSheet(); return }

    if (mode === 'natural') {
      // 시술 → 자연임신: 확인 안내
      setPendingMode('natural')
      setSheet('confirm_nat')
    } else if (currentMode === 'natural') {
      // 자연임신 → 시술: 단계 선택으로 연속 진행
      setPendingMode(mode)
      setSheet('stage')
    } else {
      // 시술 종류 변경 (iui ↔ ivf): 단계 선택
      setPendingMode(mode)
      setSheet('stage')
    }
  }

  const confirmToNatural = async () => {
    setSaving(true)
    try {
      setMode('natural')
      setCurrentStage(null)
      await usersApi.updateProfile({ treatmentStage: 'natural', currentMode: 'NATURAL', currentStage: null })
    } finally {
      setSaving(false)
      closeSheet()
    }
  }

  const handleStageSelect = async (stage: CurrentStage) => {
    const targetMode = pendingMode ?? currentMode
    setSaving(true)
    try {
      setMode(targetMode)
      setCurrentStage(stage)
      await usersApi.updateProfile({
        treatmentStage: targetMode,
        currentMode: 'CLINIC',
        currentStage: stage,
      })
    } finally {
      setSaving(false)
      closeSheet()
    }
  }

  return {
    sheet, saving, pendingMode,
    currentMode, currentStage,
    openModeSheet, openStageSheet, closeSheet,
    handleModeSelect, confirmToNatural, handleStageSelect,
  }
}
