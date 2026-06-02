'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi, usersApi, configureTokenStore, setToken, getToken } from '@fertility/shared'
import { UserProfile } from '@fertility/shared'
import { useRouter, usePathname } from 'next/navigation'

// 웹: localStorage를 토큰 저장소로 설정
if (typeof window !== 'undefined') {
  configureTokenStore(
    () => localStorage.getItem('bom_token'),
    (t) => t ? localStorage.setItem('bom_token', t) : localStorage.removeItem('bom_token'),
  )
}

interface AuthContextType {
  user: { uid: string; email: string } | null
  profile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: { email: string; password: string; name: string; partnerName?: string }) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true,
  login: async () => {}, signup: async () => {}, logout: () => {}, refreshProfile: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const loadProfile = async () => {
    try {
      const p = await usersApi.getProfile()
      setProfile(p)
      return p
    } catch {
      setProfile(null)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) await loadProfile()
  }

  // 앱 시작 시 저장된 토큰으로 자동 로그인
  useEffect(() => {
    const init = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bom_token') : null
      if (token) {
        try {
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

  // 라우팅 보호
  useEffect(() => {
    if (loading) return
    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup')
    const isOnboarding = pathname?.startsWith('/onboarding')

    if (!user && !isAuthPage) {
      router.push('/login')
    } else if (user) {
      if (isAuthPage) {
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
    await loadProfile()
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setProfile(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
