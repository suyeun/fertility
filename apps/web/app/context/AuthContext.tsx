'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, usersApi, configureTokenStore, setToken } from '@fertility/shared'
import { UserProfile, UserMode } from '@fertility/shared'
import { useRouter, usePathname } from 'next/navigation'

if (typeof window !== 'undefined') {
  configureTokenStore(
    () => localStorage.getItem('bom_token'),
    (t) => t ? localStorage.setItem('bom_token', t) : localStorage.removeItem('bom_token'),
  )
}

interface AuthContextType {
  user: { uid: string; email: string } | null
  profile: UserProfile | null
  /** [FE-001] profile에서 파생된 mode — 중복 계산 방지 */
  mode: UserMode
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: { email: string; password: string; name: string; partnerName?: string }) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, mode: 'NATURAL', loading: true,
  login: async () => {}, signup: async () => {}, logout: () => {}, refreshProfile: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // [FE-001] mode를 AuthContext에서 한 번만 계산 — 하위 컴포넌트 중복 제거
  const mode: UserMode = profile?.currentMode
    ?? (profile?.treatmentStage === 'natural' ? 'NATURAL' : 'CLINIC')

  const loadProfile = useCallback(async () => {
    try {
      const p = await usersApi.getProfile()
      setProfile(p)
      return p
    } catch {
      setProfile(null)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile()
  }, [user, loadProfile])

  useEffect(() => {
    const init = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bom_token') : null
      if (token) {
        try {
          // [FE-002] /auth/me 한 번만 호출 — 프로필 포함 반환하므로 getProfile 별도 호출 불필요
          const me = await authApi.me()
          setUser({ uid: me.id, email: me.email })
          setProfile(me)
        } catch {
          localStorage.removeItem('bom_token')
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  // 라우팅 보호 — /tour 는 게스트 허용
  useEffect(() => {
    if (loading) return
    const isAuthPage   = pathname?.startsWith('/login') || pathname?.startsWith('/signup')
    const isOnboarding = pathname?.startsWith('/onboarding')
    const isGuestTour  = pathname?.startsWith('/tour')   // 게스트 둘러보기 허용

    if (!user && !isAuthPage && !isGuestTour) {
      router.push('/login')
    } else if (user) {
      if (isAuthPage || isGuestTour) {
        router.push('/')
      } else if (!profile?.treatmentStage && !isOnboarding) {
        router.push('/onboarding')
      } else if (profile?.treatmentStage && isOnboarding) {
        router.push('/')
      }
    }
  }, [user, profile, loading, pathname, router])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    setToken(res.access_token)
    setUser({ uid: res.uid, email: res.email })
    await loadProfile()
  }

  const signup = async (data: { email: string; password: string; name: string; partnerName?: string }) => {
    const res = await authApi.signup(data)
    setToken(res.access_token)
    setUser({ uid: res.uid, email: res.email })
    const p = await loadProfile()

    // 게스트 세션에 저장된 모드를 프로필에 자동 동기화
    const guestMode = sessionStorage.getItem('bom_guest_mode')
    if (guestMode && (guestMode === 'NATURAL' || guestMode === 'CLINIC')) {
      try {
        await usersApi.updateProfile({
          currentMode: guestMode,
          treatmentStage: guestMode === 'NATURAL' ? 'natural' : p?.treatmentStage,
        })
        await loadProfile() // 동기화 후 프로필 갱신
      } catch (err) {
        // [FE-003] 빈 catch 대신 에러 로깅
        console.warn('게스트 모드 동기화 실패:', err)
      }
      sessionStorage.removeItem('bom_guest_mode')
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setProfile(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, profile, mode, loading, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
