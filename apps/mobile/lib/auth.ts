// 모바일 토큰 저장소 — expo-secure-store 사용
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { configureTokenStore, configureUserStore } from '@fertility/shared'

// userStore AsyncStorage 어댑터 주입
configureUserStore({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
})

const TOKEN_KEY = 'bom_access_token'
const USER_KEY = 'bom_user'

// shared api 클라이언트에 SecureStore 기반 토큰 저장소 주입
configureTokenStore(
  () => {
    // SecureStore는 비동기라 동기 접근 불가 — 캐시 활용
    return _cachedToken
  },
  async (token: string | null) => {
    _cachedToken = token
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token)
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
    }
  },
)

let _cachedToken: string | null = null

export async function loadStoredToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    _cachedToken = token
    return token
  } catch {
    return null
  }
}

export async function saveUser(uid: string, email: string) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify({ uid, email }))
}

export async function loadUser(): Promise<{ uid: string; email: string } | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function clearAuth() {
  _cachedToken = null
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(USER_KEY)
}
