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
    // currentStage는 서버 스키마에 없으므로 로컬에만 보관
    const updated = { ...profile, _currentStage: stage } as any
    set({ profile: updated })
    _storage?.setItem(STORAGE_KEY, JSON.stringify(updated))
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
        // 서버는 currentStage로 반환하지만 스토어/화면은 _currentStage로 읽음
        const profile = {
          ...serverProfile,
          _currentStage: (serverProfile as any).currentStage ?? null,
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
