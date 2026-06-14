/**
 * [SHARED-001] Firebase 인프라 코어 — 앱 초기화, Mock 스토어, isMockMode
 * 도메인별 서비스는 각 파일에서 이 모듈을 import합니다.
 */
import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// 환경변수가 하나라도 빠져있으면 Mock 모드로 동작
export const isMockMode =
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey === 'your_api_key' ||
  !firebaseConfig.projectId

let _app: any
let _auth: any
let _db: any

if (!isMockMode) {
  try {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    _auth = getAuth(_app)
    _db = getFirestore(_app)
  } catch (error) {
    console.warn('Firebase 초기화 실패, Mock 모드로 전환합니다.', error)
  }
}

export { _auth as auth, _db as db }

// ─── Mock 인프라 ────────────────────────────────────────────────────

interface MockUser {
  uid: string
  email: string
  displayName?: string
}

// React Native 및 SSR을 위한 인메모리 폴백 저장소
const inMemoryStore: Record<string, string> = {}

export const mockStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
    return inMemoryStore[key] || null
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    } else {
      inMemoryStore[key] = value
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key)
    } else {
      delete inMemoryStore[key]
    }
  },
}

export class MockAuthService {
  private listeners: ((user: MockUser | null) => void)[] = []
  private _currentUser: MockUser | null = null

  constructor() {
    const savedUser = mockStorage.getItem('mock_current_user')
    if (savedUser) {
      this._currentUser = JSON.parse(savedUser)
    }
  }

  get currentUser() { return this._currentUser }

  onAuthStateChanged(callback: (user: MockUser | null) => void) {
    this.listeners.push(callback)
    callback(this._currentUser)
    return () => { this.listeners = this.listeners.filter(l => l !== callback) }
  }

  async signInWithEmailAndPassword(email: string, _pass: string): Promise<MockUser> {
    const users = this.getMockUsers()
    const user = users.find(u => u.email === email)
    if (!user) throw new Error('등록되지 않은 이메일입니다.')
    this._currentUser = { uid: user.uid, email: user.email, displayName: user.name }
    mockStorage.setItem('mock_current_user', JSON.stringify(this._currentUser))
    this.notifyListeners()
    return this._currentUser
  }

  async createUserWithEmailAndPassword(email: string, _pass: string): Promise<MockUser> {
    const users = this.getMockUsers()
    if (users.some(u => u.email === email)) throw new Error('이미 가입된 이메일입니다.')
    const newUser = { uid: 'mock_uid_' + Math.random().toString(36).substring(2, 9), email }
    this._currentUser = newUser
    mockStorage.setItem('mock_current_user', JSON.stringify(this._currentUser))
    users.push({ ...newUser, name: email.split('@')[0] })
    mockStorage.setItem('mock_users_list', JSON.stringify(users))
    this.notifyListeners()
    return this._currentUser
  }

  async signOut() {
    this._currentUser = null
    mockStorage.removeItem('mock_current_user')
    this.notifyListeners()
  }

  private getMockUsers(): any[] {
    const raw = mockStorage.getItem('mock_users_list')
    return raw ? JSON.parse(raw) : []
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this._currentUser))
  }
}

/** Mock DB 스토어 헬퍼 */
export const mockStore = {
  get: (key: string): any[] => {
    const raw = mockStorage.getItem(`mock_db_${key}`)
    return raw ? JSON.parse(raw) : []
  },
  set: (key: string, data: any[]) => {
    mockStorage.setItem(`mock_db_${key}`, JSON.stringify(data))
  },
}

export const mockAuthInstance = new MockAuthService()

// authService — 도메인 파일에서 import해서 사용
export const authService = {
  getCurrentUser: () => (isMockMode ? mockAuthInstance.currentUser : _auth?.currentUser),
  onAuthStateChanged: (callback: (user: any) => void) => {
    if (isMockMode) return mockAuthInstance.onAuthStateChanged(callback)
    return fbOnAuthStateChanged(_auth, callback)
  },
  signIn: async (email: string, pass: string) => {
    if (isMockMode) return mockAuthInstance.signInWithEmailAndPassword(email, pass)
    const res = await fbSignIn(_auth, email, pass)
    return { uid: res.user.uid, email: res.user.email }
  },
  signUp: async (email: string, pass: string) => {
    if (isMockMode) return mockAuthInstance.createUserWithEmailAndPassword(email, pass)
    const res = await fbCreateUser(_auth, email, pass)
    return { uid: res.user.uid, email: res.user.email }
  },
  signOut: async () => {
    if (isMockMode) return mockAuthInstance.signOut()
    return fbSignOut(_auth)
  },
}
