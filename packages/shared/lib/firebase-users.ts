/**
 * [SHARED-001] 사용자 프로필 서비스
 */
import {
  doc, getDoc, setDoc,
} from 'firebase/firestore'
import { UserProfile } from '../types'
import { isMockMode, db, mockStore } from './firebase-core'

export const userService = {
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    if (isMockMode) {
      const profiles = mockStore.get('user_profiles')
      return profiles.find(p => p.id === uid) || null
    } else {
      const docRef = doc(db, 'user_profiles', uid)
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? (docSnap.data() as UserProfile) : null
    }
  },

  saveUserProfile: async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
    if (isMockMode) {
      const profiles = mockStore.get('user_profiles')
      const index = profiles.findIndex(p => p.id === uid)
      const now = new Date().toISOString()
      const defaultProfile: UserProfile = {
        id: uid,
        email: profile.email || '',
        name: profile.name || '사용자',
        currentMode: 'NATURAL',
        averageCycleLength: 28,
        averagePeriodLength: 5,
        subscriptionStatus: 'trial',
        createdAt: now,
        ...profile,
      } as UserProfile

      if (index > -1) {
        profiles[index] = { ...profiles[index], ...profile }
      } else {
        profiles.push(defaultProfile)
      }
      mockStore.set('user_profiles', profiles)
    } else {
      const docRef = doc(db, 'user_profiles', uid)
      await setDoc(docRef, {
        id: uid,
        ...profile,
        updatedAt: new Date().toISOString(),
      }, { merge: true })
    }
  },
}
