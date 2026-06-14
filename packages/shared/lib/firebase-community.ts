/**
 * [SHARED-001] 커뮤니티 서비스 (일반 게시글)
 * [SHARED-002] 레거시 secretService는 이 파일에서 완전히 제거됨
 *   - secretService는 firebase-secret.ts로 이동 (호환성 유지)
 *   - firebase.ts의 secretService export는 deprecated
 */
import {
  doc, collection, getDocs, setDoc, addDoc, getDoc,
  query, where, orderBy, updateDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore'
import { isMockMode, db, mockStore } from './firebase-core'

// 기본 커뮤니티 목 데이터
const DEFAULT_POSTS = [
  {
    id: 'post_1', userId: 'mock_user_1', userName: '시험관준비맘',
    treatmentStage: 'ivf',
    title: '오늘 난자 채취하고 왔어요. 다들 힘내세요!',
    content: '첫 채취였는데 생각보다 아프진 않았지만 피곤하네요. 난자 8개 채취되었다고 하는데 좋은 결과 있었으면 좋겠습니다.',
    likes: ['mock_user_2'],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'post_2', userId: 'mock_user_2', userName: '자연임신기도',
    treatmentStage: 'natural',
    title: 'AMH 1.8 수치 나왔는데 걱정되네요.',
    content: '나이는 32세인데 수치가 좀 낮게 나온 것 같아서 걱정입니다. 영양제 어떤 것 드시는지 추천 부탁드려요.',
    likes: [],
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
]

const DEFAULT_COMMENTS = [
  {
    id: 'comment_1', postId: 'post_1', userId: 'mock_user_2',
    userName: '자연임신기도',
    content: '정말 고생 많으셨어요! 푹 쉬시고 좋은 소식 있길 함께 기도할게요.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
]

export const communityService = {
  getCommunityPosts: async (stage?: string): Promise<any[]> => {
    if (isMockMode) {
      const posts = mockStore.get('community_posts')
      if (posts.length === 0) {
        mockStore.set('community_posts', DEFAULT_POSTS)
        return stage ? DEFAULT_POSTS.filter(p => p.treatmentStage === stage) : DEFAULT_POSTS
      }
      const sorted = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return stage ? sorted.filter(p => p.treatmentStage === stage) : sorted
    } else {
      let q = query(collection(db, 'community_posts'), orderBy('createdAt', 'desc'))
      if (stage) {
        q = query(collection(db, 'community_posts'), where('treatmentStage', '==', stage), orderBy('createdAt', 'desc'))
      }
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    }
  },

  saveCommunityPost: async (uid: string, userName: string, stage: string, title: string, content: string): Promise<void> => {
    const id = 'post_' + Math.random().toString(36).substring(2, 9)
    const newRecord = { id, userId: uid, userName, treatmentStage: stage, title, content, likes: [], createdAt: new Date().toISOString() }
    if (isMockMode) {
      const posts = mockStore.get('community_posts')
      posts.push(newRecord)
      mockStore.set('community_posts', posts)
    } else {
      await setDoc(doc(db, 'community_posts', id), newRecord)
    }
  },

  toggleLikePost: async (postId: string, uid: string): Promise<string[]> => {
    if (isMockMode) {
      const posts = mockStore.get('community_posts')
      const index = posts.findIndex(p => p.id === postId)
      if (index > -1) {
        const likes: string[] = posts[index].likes || []
        const ui = likes.indexOf(uid)
        if (ui > -1) likes.splice(ui, 1) else likes.push(uid)
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
        const ui = likes.indexOf(uid)
        if (ui > -1) {
          await updateDoc(docRef, { likes: arrayRemove(uid) })
          likes.splice(ui, 1)
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
      if (comments.length === 0) {
        mockStore.set('community_comments', DEFAULT_COMMENTS)
        return DEFAULT_COMMENTS.filter(c => c.postId === postId)
      }
      return comments.filter(c => c.postId === postId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else {
      const q = query(collection(db, 'community_comments'), where('postId', '==', postId), orderBy('createdAt', 'asc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    }
  },

  saveCommunityComment: async (postId: string, uid: string, userName: string, content: string): Promise<void> => {
    const id = 'comment_' + Math.random().toString(36).substring(2, 9)
    const newRecord = { id, postId, userId: uid, userName, content, createdAt: new Date().toISOString() }
    if (isMockMode) {
      const comments = mockStore.get('community_comments')
      comments.push(newRecord)
      mockStore.set('community_comments', comments)
    } else {
      await addDoc(collection(db, 'community_comments'), newRecord)
    }
  },
}
