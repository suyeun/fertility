/**
 * [SHARED-001] 감정일기 서비스
 */
import {
  doc, collection, getDocs, setDoc, deleteDoc, query, where, orderBy,
} from 'firebase/firestore'
import { DiaryEntry } from '../types'
import { isMockMode, db, mockStore } from './firebase-core'

export const diaryService = {
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
        orderBy('date', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DiaryEntry))
    }
  },

  saveDiaryEntry: async (uid: string, date: string, entry: Partial<DiaryEntry>): Promise<void> => {
    const id = `${uid}_${date}`
    const newRecord = {
      id, userId: uid, date,
      mood: entry.mood || 'neutral',
      content: entry.content || '',
      aiAnalysis: entry.aiAnalysis || '',
      createdAt: new Date().toISOString(),
    }
    if (isMockMode) {
      const diaries = mockStore.get('diary_entries')
      const index = diaries.findIndex(d => d.id === id)
      if (index > -1) { diaries[index] = { ...diaries[index], ...newRecord } } else { diaries.push(newRecord) }
      mockStore.set('diary_entries', diaries)
    } else {
      await setDoc(doc(db, 'diary_entries', id), newRecord, { merge: true })
    }
  },

  deleteDiaryEntry: async (_uid: string, id: string): Promise<void> => {
    if (isMockMode) {
      const diaries = mockStore.get('diary_entries')
      mockStore.set('diary_entries', diaries.filter(d => d.id !== id))
    } else {
      await deleteDoc(doc(db, 'diary_entries', id))
    }
  },
}
