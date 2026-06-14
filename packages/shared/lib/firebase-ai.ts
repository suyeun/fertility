/**
 * [SHARED-001] AI 채팅 히스토리 서비스
 */
import {
  doc, getDoc, setDoc, collection, getDocs, addDoc, query, where, orderBy,
} from 'firebase/firestore'
import { AIChatMessage } from '../types'
import { isMockMode, db, mockStore } from './firebase-core'

export const aiChatService = {
  // 서버 AI API에서 저장한 서브컬렉션 구조와 호환
  // ai_chats/{uid}/messages — 백엔드 PERF-003 변경에 맞춰 업데이트
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

  // 레거시 직접 채팅 메시지 저장 (사용 중인 경우 호환성 유지)
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
        orderBy('timestamp', 'asc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => d.data() as AIChatMessage)
    }
  },

  saveChatMessage: async (uid: string, message: AIChatMessage): Promise<void> => {
    const newRecord = { ...message, userId: uid }
    if (isMockMode) {
      const chats = mockStore.get('chat_messages')
      chats.push(newRecord)
      mockStore.set('chat_messages', chats)
    } else {
      await addDoc(collection(db, 'chat_messages'), newRecord)
    }
  },
}
