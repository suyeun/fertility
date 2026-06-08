'use client'

import React, { createContext, useContext, useState } from 'react'
import type { UserMode } from '@fertility/shared'

// ============================
// 게스트 세션 컨텍스트
// 로그인 없이 둘러보기 모드 상태 관리
// 회원가입 완료 시 선택 모드를 프로필에 자동 저장
// ============================

interface GuestContextType {
  isGuest: boolean
  guestMode: UserMode | null
  enterGuestMode: (mode: UserMode) => void
  exitGuestMode: () => void
}

const GuestContext = createContext<GuestContextType>({
  isGuest: false,
  guestMode: null,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
})

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [guestMode, setGuestMode] = useState<UserMode | null>(null)

  const enterGuestMode = (mode: UserMode) => {
    setGuestMode(mode)
    // sessionStorage — 페이지 새로고침에도 유지, 탭 닫으면 소멸
    sessionStorage.setItem('bom_guest_mode', mode)
  }

  const exitGuestMode = () => {
    setGuestMode(null)
    sessionStorage.removeItem('bom_guest_mode')
  }

  // sessionStorage 복원 (새로고침 대응)
  React.useEffect(() => {
    const saved = sessionStorage.getItem('bom_guest_mode') as UserMode | null
    if (saved) setGuestMode(saved)
  }, [])

  return (
    <GuestContext.Provider value={{
      isGuest: guestMode !== null,
      guestMode,
      enterGuestMode,
      exitGuestMode,
    }}>
      {children}
    </GuestContext.Provider>
  )
}

export const useGuest = () => useContext(GuestContext)
