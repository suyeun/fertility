import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { v4 as uuidv4 } from 'uuid'
import * as crypto from 'crypto'

const hashUid = (uid: string) => crypto.createHash('sha256').update(uid + 'bom_salt').digest('hex').substring(0, 8)
const sortDesc = (arr: any[], key: string) =>
  arr.sort((a, b) => b[key]?.localeCompare(a[key] ?? '') ?? 0)
const sortAsc = (arr: any[], key: string) =>
  arr.sort((a, b) => a[key]?.localeCompare(b[key] ?? '') ?? 0)

@Injectable()
export class CommunityService {
  constructor(private firebase: FirebaseService) {}

  async getPosts(stage?: string) {
    let q: any = this.firebase.collection('community_posts')
    if (stage) q = q.where('treatmentStage', '==', stage)
    const snap = await q.limit(50).get()
    return sortDesc(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })), 'createdAt')
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
    const newLikes = likes.includes(uid) ? likes.filter(id => id !== uid) : [...likes, uid]
    await ref.update({ likes: newLikes })
    return { likes: newLikes }
  }

  async getComments(postId: string) {
    const snap = await this.firebase.collection('community_comments')
      .where('postId', '==', postId)
      .get()
    return sortAsc(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })), 'createdAt')
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

  async getSecretPosts(tag?: string) {
    let q: any = this.firebase.collection('secret_posts')
    if (tag) q = q.where('topicTag', '==', tag)
    const snap = await q.limit(50).get()
    return sortDesc(
      snap.docs.map((d: any) => {
        const { authorToken, ...rest } = d.data()
        return { id: d.id, ...rest }
      }),
      'createdAt'
    )
  }

  async createSecretPost(uid: string, anonymousName: string, body: any) {
    const id = uuidv4()
    const post = {
      id, authorToken: hashUid(uid), anonymousName,
      topicTag: body.topicTag, content: body.content,
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
      .get()
    return sortAsc(
      snap.docs.map((d: any) => {
        const { authorToken, ...rest } = d.data()
        return { id: d.id, ...rest }
      }),
      'createdAt'
    )
  }

  async addSecretComment(uid: string, anonymousName: string, postId: string, content: string) {
    const postDoc = await this.firebase.collection('secret_posts').doc(postId).get()
    const isAuthor = postDoc.exists && postDoc.data().authorToken === hashUid(uid)
    const id = uuidv4()
    const comment = {
      id, postId, authorToken: hashUid(uid),
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
