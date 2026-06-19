import { create } from 'zustand'
import { usersApi } from '../lib/api'
import type { UserProfile, TreatmentMode, CurrentStage } from '../types'

// 플랫폼별로 주입하는 스토리지 어댑터
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null
  setItem: (key: string, value: string) => Promise<void> | void
  removeItem: (key: string) => Promise<void> | void
}

const STORAGE_KEY = 'bom_user_profile'
let _storage: StorageAdapter | null = null

export const configureUserStore = (adapter: StorageAdapter) => {
  _storage = adapter
}

interface UserStore {
  profile: UserProfile | null
  setProfile: (profile: UserProfile | null) => void
  setMode: (mode: TreatmentMode) => void
  setCurrentStage: (stage: CurrentStage) => void
  setPremium: (value: boolean) => void
  saveProfile: (profile: UserProfile) => Promise<void>
  loadProfile: () => Promise<void>
  syncProfile: () => Promise<void>
  clearProfile: () => void
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,

  setProfile: (profile) => {
    set({ profile })
    if (profile) _storage?.setItem(STORAGE_KEY, JSON.stringify(profile))
    else _storage?.removeItem(STORAGE_KEY)
  },

  setMode: (mode) => {
    const profile = get().profile
    if (!profile) return
    const updated = { ...profile, treatmentStage: mode }
    set({ profile: updated })
    _storage?.setItem(STORAGE_KEY, JSON.stringify(updated))
    usersApi.updateProfile({ treatmentStage: mode }).catch(() => {})
  },

  setCurrentStage: (stage) => {
    const profile = get().profile
    if (!profile) return
    const today = new Date().toISOString().split('T')[0]
    const stageStartedAt = stage ? today : null
    const updated = {
      ...profile,
      _currentStage: stage,
      _stageStartedAt: stageStartedAt,
    } as any
    set({ profile: updated })
    _storage?.setItem(STORAGE_KEY, JSON.stringify(updated))
    usersApi.updateProfile({ currentStage: stage, stageStartedAt }).catch(() => {})
  },

  setPremium: (value) => {
    const profile = get().profile
    if (!profile) return
    const updated: UserProfile = {
      ...profile,
      subscriptionStatus: value ? 'active' : 'cancelled',
    }
    set({ profile: updated })
    _storage?.setItem(STORAGE_KEY, JSON.stringify(updated))
  },

  saveProfile: async (profile) => {
    set({ profile })
    await _storage?.setItem(STORAGE_KEY, JSON.stringify(profile))
    await usersApi.updateProfile(profile).catch(() => {})
  },

  loadProfile: async () => {
    try {
      const raw = await _storage?.getItem(STORAGE_KEY)
      if (raw) set({ profile: JSON.parse(raw) })
    } catch {}
  },

  syncProfile: async () => {
    try {
      const serverProfile = await usersApi.getProfile()
      if (serverProfile) {
        // 서버 프로필 병합 시 로컬 전용 필드(_currentStage, _stageStartedAt) 보존
        const existing = get().profile as any
        const profile = {
          ...serverProfile,
          _currentStage: (serverProfile as any).currentStage ?? existing?._currentStage ?? null,
          _stageStartedAt: (serverProfile as any).stageStartedAt ?? existing?._stageStartedAt ?? null,
        }
        set({ profile })
        await _storage?.setItem(STORAGE_KEY, JSON.stringify(profile))
      }
    } catch {}
  },

  clearProfile: () => {
    set({ profile: null })
    _storage?.removeItem(STORAGE_KEY)
  },
}))
