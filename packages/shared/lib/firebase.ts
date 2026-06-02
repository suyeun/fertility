import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser,
  Auth as FirebaseAuth
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  increment,
  Firestore
} from 'firebase/firestore'
import {
  UserProfile,
  MenstrualCycle,
  HormoneRecord,
  TreatmentSchedule,
  DiaryEntry,
  AIChatMessage,
  SecretPost,
  SecretComment,
  SecretTopicTag,
} from '../types'

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
export const isMockMode = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'your_api_key' || !firebaseConfig.projectId

let app: any
let auth: any
let db: any

if (!isMockMode) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
  } catch (error) {
    console.warn('Firebase 초기화 실패, Mock 모드로 전환합니다.', error)
  }
}

// ==========================================
// Mock Auth & Firestore Implementation
// ==========================================

interface MockUser {
  uid: string
  email: string
  displayName?: string
}

// React Native 및 SSR을 위한 인메모리 폴백 저장소
const inMemoryStore: Record<string, string> = {}

const mockStorage = {
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
  }
}

class MockAuthService {
  private listeners: ((user: MockUser | null) => void)[] = []
  private _currentUser: MockUser | null = null

  constructor() {
    const savedUser = mockStorage.getItem('mock_current_user')
    if (savedUser) {
      this._currentUser = JSON.parse(savedUser)
    }
  }

  get currentUser() {
    return this._currentUser
  }

  onAuthStateChanged(callback: (user: MockUser | null) => void) {
    this.listeners.push(callback)
    // 등록 즉시 현재 상태 전달
    callback(this._currentUser)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  async signInWithEmailAndPassword(email: string, pass: string): Promise<MockUser> {
    const users = this.getMockUsers()
    const user = users.find(u => u.email === email)
    if (!user) {
      throw new Error('등록되지 않은 이메일입니다.')
    }
    this._currentUser = { uid: user.uid, email: user.email, displayName: user.name }
    mockStorage.setItem('mock_current_user', JSON.stringify(this._currentUser))
    this.notifyListeners()
    return this._currentUser
  }

  async createUserWithEmailAndPassword(email: string, pass: string): Promise<MockUser> {
    const users = this.getMockUsers()
    if (users.some(u => u.email === email)) {
      throw new Error('이미 가입된 이메일입니다.')
    }
    const newUser = { uid: 'mock_uid_' + Math.random().toString(36).substring(2, 9), email }
    this._currentUser = newUser
    mockStorage.setItem('mock_current_user', JSON.stringify(this._currentUser))
    
    // 임시 가입 데이터 풀에 저장
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

// Mock 데이터 스토어 도우미
const mockStore = {
  get: (key: string): any[] => {
    const raw = mockStorage.getItem(`mock_db_${key}`)
    return raw ? JSON.parse(raw) : []
  },
  set: (key: string, data: any[]) => {
    mockStorage.setItem(`mock_db_${key}`, JSON.stringify(data))
  }
}

const mockAuthInstance = new MockAuthService()

// ==========================================
// 통합 데이터 서비스 API
// ==========================================

export const authService = {
  getCurrentUser: () => isMockMode ? mockAuthInstance.currentUser : auth?.currentUser,
  onAuthStateChanged: (callback: (user: any) => void) => {
    if (isMockMode) {
      return mockAuthInstance.onAuthStateChanged(callback)
    } else {
      return fbOnAuthStateChanged(auth, callback)
    }
  },
  signIn: async (email: string, pass: string) => {
    if (isMockMode) {
      return mockAuthInstance.signInWithEmailAndPassword(email, pass)
    } else {
      const res = await fbSignIn(auth, email, pass)
      return { uid: res.user.uid, email: res.user.email }
    }
  },
  signUp: async (email: string, pass: string) => {
    if (isMockMode) {
      return mockAuthInstance.createUserWithEmailAndPassword(email, pass)
    } else {
      const res = await fbCreateUser(auth, email, pass)
      return { uid: res.user.uid, email: res.user.email }
    }
  },
  signOut: async () => {
    if (isMockMode) {
      return mockAuthInstance.signOut()
    } else {
      return fbSignOut(auth)
    }
  }
}

export const dbService = {
  // 1. 유저 프로필
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
        averageCycleLength: 28,
        averagePeriodLength: 5,
        subscriptionStatus: 'trial',
        createdAt: now,
        ...profile
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
        updatedAt: new Date().toISOString()
      }, { merge: true })
    }
  },

  // 2. 생리 주기 기록
  getMenstrualCycles: async (uid: string): Promise<MenstrualCycle[]> => {
    if (isMockMode) {
      const records = mockStore.get('menstrual_cycles')
      return records
        .filter(r => r.userId === uid)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    } else {
      const q = query(
        collection(db, 'menstrual_cycles'),
        where('userId', '==', uid),
        orderBy('startDate', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const list: MenstrualCycle[] = []
      querySnapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as MenstrualCycle)
      })
      return list
    }
  },

  saveMenstrualCycle: async (uid: string, record: Partial<MenstrualCycle>): Promise<void> => {
    const id = record.id || 'cycle_' + Math.random().toString(36).substring(2, 9)
    const newRecord = {
      id,
      userId: uid,
      startDate: record.startDate,
      endDate: record.endDate || null,
      cycleLength: record.cycleLength || 28,
      periodLength: record.periodLength || 5,
      notes: record.notes || '',
      createdAt: record.createdAt || new Date().toISOString()
    }

    if (isMockMode) {
      const records = mockStore.get('menstrual_cycles')
      const index = records.findIndex(r => r.id === id)
      if (index > -1) {
        records[index] = { ...records[index], ...newRecord }
      } else {
        records.push(newRecord)
      }
      mockStore.set('menstrual_cycles', records)
    } else {
      const docRef = doc(db, 'menstrual_cycles', id)
      await setDoc(docRef, newRecord, { merge: true })
    }
  },

  // 3. 호르몬 수치 기록
  getHormoneRecords: async (uid: string): Promise<HormoneRecord[]> => {
    if (isMockMode) {
      const records = mockStore.get('hormone_records')
      return records
        .filter(r => r.userId === uid)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    } else {
      const q = query(
        collection(db, 'hormone_records'),
        where('userId', '==', uid),
        orderBy('recordedAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const list: HormoneRecord[] = []
      querySnapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as HormoneRecord)
      })
      return list
    }
  },

  saveHormoneRecord: async (uid: string, record: Partial<HormoneRecord>): Promise<void> => {
    const id = record.id || 'hormone_' + Math.random().toString(36).substring(2, 9)
    const newRecord = {
      id,
      userId: uid,
      recordedAt: record.recordedAt || new Date().toISOString().split('T')[0],
      amh: record.amh,
      fsh: record.fsh,
      lh: record.lh,
      estradiol: record.estradiol,
      progesterone: record.progesterone,
      bbt: record.bbt,
      opkIndex: record.opkIndex,
      cervicalMucus: record.cervicalMucus,
      weight: record.weight,
      sleepHours: record.sleepHours,
      follicleSize: record.follicleSize,
      endometriumThickness: record.endometriumThickness,
      retrievedOocytesCount: record.retrievedOocytesCount,
      embryoGrade: record.embryoGrade,
      hcgLevel: record.hcgLevel,
      intercourse: record.intercourse,
      notes: record.notes || '',
      createdAt: new Date().toISOString()
    }

    if (isMockMode) {
      const records = mockStore.get('hormone_records')
      const index = records.findIndex(r => r.id === id)
      if (index > -1) {
        records[index] = { ...records[index], ...newRecord }
      } else {
        records.push(newRecord)
      }
      mockStore.set('hormone_records', records)
    } else {
      const docRef = doc(db, 'hormone_records', id)
      await setDoc(docRef, newRecord, { merge: true })
    }
  },

  deleteHormoneRecord: async (uid: string, id: string): Promise<void> => {
    if (isMockMode) {
      const records = mockStore.get('hormone_records')
      const filtered = records.filter(r => r.id !== id)
      mockStore.set('hormone_records', filtered)
    } else {
      const docRef = doc(db, 'hormone_records', id)
      await deleteDoc(docRef)
    }
  },

  // 4. 시술 일정 및 약물
  getTreatmentSchedules: async (uid: string): Promise<TreatmentSchedule[]> => {
    if (isMockMode) {
      const schedules = mockStore.get('treatment_schedules')
      return schedules
        .filter(s => s.userId === uid)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    } else {
      const q = query(
        collection(db, 'treatment_schedules'),
        where('userId', '==', uid),
        orderBy('scheduledAt', 'asc')
      )
      const querySnapshot = await getDocs(q)
      const list: TreatmentSchedule[] = []
      querySnapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as TreatmentSchedule)
      })
      return list
    }
  },

  saveTreatmentSchedule: async (uid: string, schedule: Partial<TreatmentSchedule>): Promise<void> => {
    const id = schedule.id || 'schedule_' + Math.random().toString(36).substring(2, 9)
    const newRecord = {
      id,
      userId: uid,
      type: schedule.type || 'other',
      title: schedule.title || '',
      scheduledAt: schedule.scheduledAt || new Date().toISOString(),
      status: schedule.status || 'scheduled',
      hospitalName: schedule.hospitalName || '',
      notes: schedule.notes || '',
      medications: schedule.medications || [],
      createdAt: new Date().toISOString()
    }

    if (isMockMode) {
      const schedules = mockStore.get('treatment_schedules')
      const index = schedules.findIndex(s => s.id === id)
      if (index > -1) {
        schedules[index] = { ...schedules[index], ...newRecord }
      } else {
        schedules.push(newRecord)
      }
      mockStore.set('treatment_schedules', schedules)
    } else {
      const docRef = doc(db, 'treatment_schedules', id)
      await setDoc(docRef, newRecord, { merge: true })
    }
  },

  // 5. 감정 일기
  getDiaryEntries: async (uid: string): Promise<DiaryEntry[]> => {
    if (isMockMode) {
      const diaries = mockStore.get('diary_entries')
      return diaries
        .filter(d => d.userId === uid)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else {
      const q = query(
        collection(db, 'diary_entries'),
        where('userId', '==', uid),
        orderBy('date', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const list: DiaryEntry[] = []
      querySnapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as DiaryEntry)
      })
      return list
    }
  },

  saveDiaryEntry: async (uid: string, date: string, entry: Partial<DiaryEntry>): Promise<void> => {
    const id = `${uid}_${date}`
    const newRecord = {
      id,
      userId: uid,
      date,
      mood: entry.mood || 'neutral',
      content: entry.content || '',
      aiAnalysis: entry.aiAnalysis || '',
      createdAt: new Date().toISOString()
    }

    if (isMockMode) {
      const diaries = mockStore.get('diary_entries')
      const index = diaries.findIndex(d => d.id === id)
      if (index > -1) {
        diaries[index] = { ...diaries[index], ...newRecord }
      } else {
        diaries.push(newRecord)
      }
      mockStore.set('diary_entries', diaries)
    } else {
      const docRef = doc(db, 'diary_entries', id)
      await setDoc(docRef, newRecord, { merge: true })
    }
  },

  // 6. AI 채팅 메시지
  getChatMessages: async (uid: string): Promise<AIChatMessage[]> => {
    if (isMockMode) {
      const chats = mockStore.get('chat_messages')
      return chats
        .filter(c => c.userId === uid)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    } else {
      const q = query(
        collection(db, 'chat_messages'),
        where('userId', '==', uid),
        orderBy('timestamp', 'asc')
      )
      const querySnapshot = await getDocs(q)
      const list: AIChatMessage[] = []
      querySnapshot.forEach(doc => {
        list.push(doc.data() as AIChatMessage)
      })
      return list
    }
  },

  saveChatMessage: async (uid: string, message: AIChatMessage): Promise<void> => {
    const newRecord = {
      ...message,
      userId: uid
    }
    if (isMockMode) {
      const chats = mockStore.get('chat_messages')
      chats.push(newRecord)
      mockStore.set('chat_messages', chats)
    } else {
      await addDoc(collection(db, 'chat_messages'), newRecord)
    }
  },

  // 7. 커뮤니티 게시물
  getCommunityPosts: async (stage?: string): Promise<any[]> => {
    if (isMockMode) {
      const posts = mockStore.get('community_posts')
      // 목데이터가 아예 없으면 기본 데이터 3개 생성
      if (posts.length === 0) {
        const defaultPosts = [
          {
            id: 'post_1',
            userId: 'mock_user_1',
            userName: '시험관준비맘',
            treatmentStage: 'ivf',
            title: '오늘 난자 채취하고 왔어요. 다들 힘내세요!',
            content: '첫 채취였는데 생각보다 아프진 않았지만 피곤하네요. 난자 8개 채취되었다고 하는데 좋은 결과 있었으면 좋겠습니다. 시험관 하시는 분들 모두 파이팅입니다!',
            likes: ['mock_user_2'],
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
          },
          {
            id: 'post_2',
            userId: 'mock_user_2',
            userName: '자연임신기도',
            treatmentStage: 'natural',
            title: 'AMH 1.8 수치 나왔는데 걱정되네요.',
            content: '나이는 32세인데 수치가 좀 낮게 나온 것 같아서 걱정입니다. 영양제 어떤 것 드시는지 추천 부탁드려요.',
            likes: [],
            createdAt: new Date(Date.now() - 3600000 * 20).toISOString()
          },
          {
            id: 'post_3',
            userId: 'mock_user_3',
            userName: '둥이맘대기중',
            treatmentStage: 'fet',
            title: '동결 5일 배아 이식 5일차 증상 공유해요',
            content: '약간의 콕콕거림 외에는 무증상에 가깝네요. 이번엔 꼭 착상 성공했으면 좋겠어요. 다들 힘든 시기 같이 견뎌내요!',
            likes: ['mock_user_1', 'mock_user_2'],
            createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
          }
        ]
        mockStore.set('community_posts', defaultPosts)
        return stage ? defaultPosts.filter(p => p.treatmentStage === stage) : defaultPosts
      }
      return stage
        ? posts.filter(p => p.treatmentStage === stage).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else {
      let q = query(
        collection(db, 'community_posts'),
        orderBy('createdAt', 'desc')
      )
      if (stage) {
        q = query(
          collection(db, 'community_posts'),
          where('treatmentStage', '==', stage),
          orderBy('createdAt', 'desc')
        )
      }
      const querySnapshot = await getDocs(q)
      const list: any[] = []
      querySnapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() })
      })
      return list
    }
  },

  saveCommunityPost: async (uid: string, userName: string, stage: string, title: string, content: string): Promise<void> => {
    const id = 'post_' + Math.random().toString(36).substring(2, 9)
    const newRecord = {
      id,
      userId: uid,
      userName,
      treatmentStage: stage,
      title,
      content,
      likes: [],
      createdAt: new Date().toISOString()
    }

    if (isMockMode) {
      const posts = mockStore.get('community_posts')
      posts.push(newRecord)
      mockStore.set('community_posts', posts)
    } else {
      const docRef = doc(db, 'community_posts', id)
      await setDoc(docRef, newRecord)
    }
  },

  toggleLikePost: async (postId: string, uid: string): Promise<string[]> => {
    if (isMockMode) {
      const posts = mockStore.get('community_posts')
      const index = posts.findIndex(p => p.id === postId)
      if (index > -1) {
        const likes: string[] = posts[index].likes || []
        const userIndex = likes.indexOf(uid)
        if (userIndex > -1) {
          likes.splice(userIndex, 1)
        } else {
          likes.push(uid)
        }
        posts[index].likes = likes
        mockStore.set('community_posts', posts)
        return likes
      }
      return []
    } else {
      const docRef = doc(db, 'community_posts', postId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const likes: string[] = docSnap.data().likes || []
        const userIndex = likes.indexOf(uid)
        if (userIndex > -1) {
          await updateDoc(docRef, { likes: arrayRemove(uid) })
          likes.splice(userIndex, 1)
        } else {
          await updateDoc(docRef, { likes: arrayUnion(uid) })
          likes.push(uid)
        }
        return likes
      }
      return []
    }
  },

  getCommunityComments: async (postId: string): Promise<any[]> => {
    if (isMockMode) {
      const comments = mockStore.get('community_comments')
      // 목데이터가 아예 없으면 기본 데이터 2개 생성
      if (comments.length === 0) {
        const defaultComments = [
          {
            id: 'comment_1',
            postId: 'post_1',
            userId: 'mock_user_2',
            userName: '자연임신기도',
            content: '정말 고생 많으셨어요! 푹 쉬시고 좋은 소식 있길 함께 기도할게요.',
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
          },
          {
            id: 'comment_2',
            postId: 'post_2',
            userId: 'mock_user_1',
            userName: '시험관준비맘',
            content: '저도 30대 초반에 수치 1점대 나왔지만 이쁜 아기 잘 만났어요. 너무 걱정 마시고 코큐텐이랑 비타민D 챙겨드세요!',
            createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
          }
        ]
        mockStore.set('community_comments', defaultComments)
        return defaultComments.filter(c => c.postId === postId)
      }
      return comments
        .filter(c => c.postId === postId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else {
      const q = query(
        collection(db, 'community_comments'),
        where('postId', '==', postId),
        orderBy('createdAt', 'asc')
      )
      const querySnapshot = await getDocs(q)
      const list: any[] = []
      querySnapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() })
      })
      return list
    }
  },

  saveCommunityComment: async (postId: string, uid: string, userName: string, content: string): Promise<void> => {
    const id = 'comment_' + Math.random().toString(36).substring(2, 9)
    const newRecord = {
      id,
      postId,
      userId: uid,
      userName,
      content,
      createdAt: new Date().toISOString()
    }

    if (isMockMode) {
      const comments = mockStore.get('community_comments')
      comments.push(newRecord)
      mockStore.set('community_comments', comments)
    } else {
      const docRef = doc(db, 'community_comments', id)
      await setDoc(docRef, newRecord)
    }
  }
}

// ==========================================
// 비밀 대화방 서비스
// uid는 절대 저장하지 않음 — authorToken(hash)만 사용
// ==========================================

const DEFAULT_SECRET_POSTS: SecretPost[] = [
  {
    id: 'sp_1',
    authorToken: 'zx8qm3ab',
    anonymousName: '따뜻한나비_412',
    topicTag: 'pain',
    content: '임신 준비가 생각보다 길어지면서 번아웃이 왔어요. 자꾸 결과가 아쉽게 나오니 너무 지치네요. 병원 가기도 싫고 그냥 다 포기하고 싶다는 생각이 들어요. 이런 감정 정상인가요? 주변엔 정말 말 못하겠어서 여기에 털어놓아요.',
    likes: [],
    commentsCount: 1,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'sp_2',
    authorToken: 'lk9pn7yw',
    anonymousName: '설레는씨앗_837',
    topicTag: 'relationship',
    content: '배란일 맞추다 보니 남편이 의무감으로 하는 게 느껴져요. 서로 말은 안 하는데 눈치 보는 게 너무 힘드네요. 자연스러웠던 부부 관계가 언제부터 이렇게 됐는지... 다들 어떻게 하세요?',
    likes: ['zx8qm3ab'],
    commentsCount: 2,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'sp_3',
    authorToken: 'rm2ct5xv',
    anonymousName: '차분한별빛_201',
    topicTag: 'mental',
    content: '이식 후 2주 기다리는 게 세상에서 제일 힘든 일인 것 같아요. 아무것도 집중이 안 되고 자꾸 착상 증상만 찾아보게 되더라고요. 저만 그런 건 아니죠?',
    likes: [],
    commentsCount: 0,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'sp_4',
    authorToken: 'fp6dk1nq',
    anonymousName: '포근한달빛_655',
    topicTag: 'procedure',
    content: 'IUI 오늘 병원 다녀왔어요. 아프진 않았는데 집에 오니까 혼자 울었어요. 남편은 이게 별것 아닌 것처럼 행동하고... 내가 너무 예민한 건지 모르겠어요.',
    likes: ['lk9pn7yw', 'rm2ct5xv'],
    commentsCount: 1,
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
]

const DEFAULT_SECRET_COMMENTS: (SecretComment & { postId: string })[] = [
  {
    id: 'sc_1',
    postId: 'sp_1',
    authorToken: 'lk9pn7yw',
    anonymousName: '은은한봄비_319',
    isAuthor: false,
    content: '저도 똑같이 느꼈어요. 그 감정 너무 정상이에요. 혼자 아프지 말고 여기서 털어놔요. 우리 같이 버텨요.',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'sc_2',
    postId: 'sp_2',
    authorToken: 'rm2ct5xv',
    anonymousName: '소중한새벽_743',
    isAuthor: false,
    content: '정말 공감해요. 저도 배란일 체크하다 보니 남편이 부담스러워하는 게 느껴졌어요. 그냥 서로 솔직하게 얘기했더니 좀 나아졌어요. 용기 내서 대화해보세요.',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'sc_3',
    postId: 'sp_2',
    authorToken: 'lk9pn7yw',
    anonymousName: '설레는씨앗_837',
    isAuthor: true,
    content: '감사해요. 용기 내볼게요 😢',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'sc_4',
    postId: 'sp_4',
    authorToken: 'zx8qm3ab',
    anonymousName: '따뜻한이슬_528',
    isAuthor: false,
    content: '예민한 거 아니에요. 몸도 마음도 다 함께 가는 여정인데 혼자 감당하는 게 당연히 힘들죠. 정말 수고했어요.',
    createdAt: new Date(Date.now() - 3600000 * 65).toISOString(),
  },
]

export const secretService = {
  getSecretPosts: async (topicTag?: SecretTopicTag): Promise<SecretPost[]> => {
    if (isMockMode) {
      let posts: SecretPost[] = mockStore.get('secret_posts')
      if (posts.length === 0) {
        mockStore.set('secret_posts', DEFAULT_SECRET_POSTS)
        posts = DEFAULT_SECRET_POSTS

        // 기본 댓글도 함께 초기화
        if (mockStore.get('secret_comments').length === 0) {
          mockStore.set('secret_comments', DEFAULT_SECRET_COMMENTS)
        }
      }
      const sorted = [...posts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      return topicTag ? sorted.filter(p => p.topicTag === topicTag) : sorted
    } else {
      let q = query(collection(db, 'secret_posts'), orderBy('createdAt', 'desc'))
      if (topicTag) {
        q = query(
          collection(db, 'secret_posts'),
          where('topicTag', '==', topicTag),
          orderBy('createdAt', 'desc')
        )
      }
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SecretPost))
    }
  },

  saveSecretPost: async (data: {
    id: string
    authorToken: string
    anonymousName: string
    topicTag: SecretTopicTag
    content: string
  }): Promise<void> => {
    const record: SecretPost = {
      ...data,
      likes: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    }
    if (isMockMode) {
      const posts: SecretPost[] = mockStore.get('secret_posts')
      if (posts.length === 0) mockStore.set('secret_posts', DEFAULT_SECRET_POSTS)
      const current: SecretPost[] = mockStore.get('secret_posts')
      current.unshift(record)
      mockStore.set('secret_posts', current)
    } else {
      await setDoc(doc(db, 'secret_posts', data.id), record)
    }
  },

  toggleSecretLike: async (postId: string, userToken: string): Promise<void> => {
    if (isMockMode) {
      const posts: SecretPost[] = mockStore.get('secret_posts')
      const idx = posts.findIndex(p => p.id === postId)
      if (idx > -1) {
        const likes = [...(posts[idx].likes || [])]
        const ti = likes.indexOf(userToken)
        if (ti > -1) likes.splice(ti, 1)
        else likes.push(userToken)
        posts[idx] = { ...posts[idx], likes }
        mockStore.set('secret_posts', posts)
      }
    } else {
      const ref = doc(db, 'secret_posts', postId)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const likes: string[] = snap.data().likes || []
        if (likes.includes(userToken)) {
          await updateDoc(ref, { likes: arrayRemove(userToken) })
        } else {
          await updateDoc(ref, { likes: arrayUnion(userToken) })
        }
      }
    }
  },

  getSecretComments: async (postId: string): Promise<SecretComment[]> => {
    if (isMockMode) {
      const comments: SecretComment[] = mockStore.get('secret_comments')
      return comments
        .filter(c => c.postId === postId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else {
      const q = query(
        collection(db, 'secret_comments'),
        where('postId', '==', postId),
        orderBy('createdAt', 'asc')
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SecretComment))
    }
  },

  saveSecretComment: async (data: {
    postId: string
    authorToken: string
    anonymousName: string
    content: string
  }): Promise<void> => {
    const id = 'sc_' + Math.random().toString(36).substring(2, 9)

    // 작성자 여부: 포스트의 authorToken과 비교
    let isAuthor = false
    if (isMockMode) {
      const posts: SecretPost[] = mockStore.get('secret_posts')
      const post = posts.find(p => p.id === data.postId)
      isAuthor = post?.authorToken === data.authorToken
    } else {
      const snap = await getDoc(doc(db, 'secret_posts', data.postId))
      isAuthor = snap.exists() && snap.data().authorToken === data.authorToken
    }

    const record: SecretComment = { id, ...data, isAuthor, createdAt: new Date().toISOString() }

    if (isMockMode) {
      const comments: SecretComment[] = mockStore.get('secret_comments')
      comments.push(record)
      mockStore.set('secret_comments', comments)

      // commentsCount 갱신
      const posts: SecretPost[] = mockStore.get('secret_posts')
      const idx = posts.findIndex(p => p.id === data.postId)
      if (idx > -1) {
        posts[idx] = { ...posts[idx], commentsCount: (posts[idx].commentsCount || 0) + 1 }
        mockStore.set('secret_posts', posts)
      }
    } else {
      await addDoc(collection(db, 'secret_comments'), record)
      await updateDoc(doc(db, 'secret_posts', data.postId), {
        commentsCount: increment(1),
      })
    }
  },

  deleteTreatmentSchedule: async (uid: string, id: string): Promise<void> => {
    if (isMockMode) {
      const schedules: TreatmentSchedule[] = mockStore.get('treatment_schedules')
      mockStore.set('treatment_schedules', schedules.filter((s: TreatmentSchedule) => s.id !== id))
    } else {
      await deleteDoc(doc(db, 'treatment_schedules', id))
    }
  },

  getAIChatHistory: async (uid: string): Promise<AIChatMessage[]> => {
    if (isMockMode) {
      return mockStore.get(`ai_chat_${uid}`) || []
    } else {
      const docSnap = await getDoc(doc(db, 'ai_chats', uid))
      return docSnap.exists() ? (docSnap.data().messages as AIChatMessage[]) : []
    }
  },

  saveAIChatHistory: async (uid: string, messages: AIChatMessage[]): Promise<void> => {
    if (isMockMode) {
      mockStore.set(`ai_chat_${uid}`, messages)
    } else {
      await setDoc(doc(db, 'ai_chats', uid), { messages, updatedAt: new Date().toISOString() })
    }
  },
}
