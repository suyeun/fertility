import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { v4 as uuidv4 } from 'uuid'
import * as crypto from 'crypto'

const hashUid = (uid: string) => crypto.createHash('sha256').update(uid + 'bom_salt').digest('hex').substring(0, 8)

@Injectable()
export class CommunityService {
  constructor(private firebase: FirebaseService) {}

  // 커뮤니티 일반 게시글
  async getPosts(stage?: string) {
    let q: any = this.firebase.collection('community_posts').orderBy('createdAt', 'desc').limit(50)
    if (stage) q = this.firebase.collection('community_posts').where('treatmentStage', '==', stage).orderBy('createdAt', 'desc').limit(50)
    const snap = await q.get()
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
  }

  async createPost(uid: string, userName: string, stage: string, body: any) {
    const id = uuidv4()
    const post = {
      id, userId: uid, userName, treatmentStage: stage,
      title: body.title, content: body.content,
      likes: [], commentsCount: 0,
      createdAt: new Date().toISOString(),
    }
    await this.firebase.collection('community_posts').doc(id).set(post)
    return post
  }

  async likePost(uid: string, postId: string) {
    const ref = this.firebase.collection('community_posts').doc(postId)
    const doc = await ref.get()
    if (!doc.exists) return
    const likes: string[] = doc.data().likes || []
    const newLikes = likes.includes(uid)
      ? likes.filter(id => id !== uid)
      : [...likes, uid]
    await ref.update({ likes: newLikes })
    return { likes: newLikes }
  }

  async getComments(postId: string) {
    const snap = await this.firebase.collection('community_comments')
      .where('postId', '==', postId)
      .orderBy('createdAt', 'asc')
      .get()
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
  }

  async addComment(uid: string, userName: string, postId: string, content: string) {
    const id = uuidv4()
    const comment = { id, postId, userId: uid, userName, content, createdAt: new Date().toISOString() }
    await this.firebase.collection('community_comments').doc(id).set(comment)
    const postRef = this.firebase.collection('community_posts').doc(postId)
    const postDoc = await postRef.get()
    if (postDoc.exists) {
      await postRef.update({ commentsCount: (postDoc.data().commentsCount || 0) + 1 })
    }
    return comment
  }

  // 비밀 대화방 (익명)
  async getSecretPosts(tag?: string) {
    let q: any = this.firebase.collection('secret_posts').orderBy('createdAt', 'desc').limit(50)
    if (tag) q = this.firebase.collection('secret_posts').where('topicTag', '==', tag).orderBy('createdAt', 'desc').limit(50)
    const snap = await q.get()
    return snap.docs.map((d: any) => {
      const { authorToken, ...rest } = d.data()
      return { id: d.id, ...rest }
    })
  }

  async createSecretPost(uid: string, anonymousName: string, body: any) {
    const id = uuidv4()
    const post = {
      id,
      authorToken: hashUid(uid),
      anonymousName,
      topicTag: body.topicTag,
      content: body.content,
      likes: [], commentsCount: 0,
      createdAt: new Date().toISOString(),
    }
    await this.firebase.collection('secret_posts').doc(id).set(post)
    const { authorToken, ...safe } = post
    return safe
  }

  async likeSecretPost(uid: string, postId: string) {
    const token = hashUid(uid)
    const ref = this.firebase.collection('secret_posts').doc(postId)
    const doc = await ref.get()
    if (!doc.exists) return
    const likes: string[] = doc.data().likes || []
    const newLikes = likes.includes(token) ? likes.filter(t => t !== token) : [...likes, token]
    await ref.update({ likes: newLikes })
    return { likes: newLikes.length }
  }

  async getSecretComments(postId: string) {
    const snap = await this.firebase.collection('secret_comments')
      .where('postId', '==', postId)
      .orderBy('createdAt', 'asc')
      .get()
    return snap.docs.map((d: any) => {
      const { authorToken, ...rest } = d.data()
      return { id: d.id, ...rest }
    })
  }

  async addSecretComment(uid: string, anonymousName: string, postId: string, content: string) {
    const postDoc = await this.firebase.collection('secret_posts').doc(postId).get()
    const isAuthor = postDoc.exists && postDoc.data().authorToken === hashUid(uid)

    const id = uuidv4()
    const comment = {
      id, postId,
      authorToken: hashUid(uid),
      anonymousName, isAuthor, content,
      createdAt: new Date().toISOString(),
    }
    await this.firebase.collection('secret_comments').doc(id).set(comment)
    if (postDoc.exists) {
      await this.firebase.collection('secret_posts').doc(postId).update({
        commentsCount: (postDoc.data().commentsCount || 0) + 1,
      })
    }
    const { authorToken, ...safe } = comment
    return safe
  }
}
