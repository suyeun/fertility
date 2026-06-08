import { Injectable, NotFoundException } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { v4 as uuidv4 } from 'uuid'
import * as crypto from 'crypto'
import {
  TAG_META, CATEGORY_ANONYMOUS,
  type PostTag, type PostCategory, type PostTargetMode,
} from '@fertility/shared'

const hashUid = (uid: string) =>
  crypto.createHash('sha256').update(uid + 'bom_salt').digest('hex').substring(0, 8)

const sortDesc = (arr: any[]) =>
  arr.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

const sortAsc = (arr: any[]) =>
  arr.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))

function resolveTagMeta(tag: PostTag) {
  const meta = TAG_META[tag]
  if (!meta) throw new Error(`알 수 없는 태그: ${tag}`)
  return meta
}

function allowedTargetModes(userMode?: string): PostTargetMode[] {
  if (userMode === 'NATURAL') return ['ALL', 'NATURAL']
  if (userMode === 'CLINIC')  return ['ALL', 'CLINIC']
  return ['ALL', 'NATURAL', 'CLINIC']
}

@Injectable()
export class CommunityService {
  constructor(private firebase: FirebaseService) {}

  // ============================
  // 게시글
  // ============================

  async getPosts(params: {
    category?: PostCategory
    tag?: PostTag
    userMode?: string
  }) {
    let q: any = this.firebase.collection('community_posts')
      .where('isDeleted', '==', false)

    if (params.category) q = q.where('category', '==', params.category)
    if (params.tag)      q = q.where('tag', '==', params.tag)

    const snap = await q.limit(50).get()
    let posts = snap.docs.map((d: any) => {
      const { authorToken, ...rest } = d.data()
      return { id: d.id, ...rest }
    })

    const allowed = allowedTargetModes(params.userMode)
    posts = posts.filter((p: any) => allowed.includes(p.targetMode))

    if (params.userMode === 'CLINIC' && !params.category && !params.tag) {
      posts.sort((a: any, b: any) => {
        const pa = a.targetMode === 'CLINIC' ? 0 : 1
        const pb = b.targetMode === 'CLINIC' ? 0 : 1
        if (pa !== pb) return pa - pb
        return b.createdAt.localeCompare(a.createdAt)
      })
    } else {
      sortDesc(posts)
    }

    return posts
  }

  async createPost(
    uid: string,
    realName: string,          // 프로필 실명
    anonymousName: string,     // 익명 닉네임
    body: { tag: PostTag; content: string },
  ) {
    const { category, targetMode } = resolveTagMeta(body.tag)
    const isAnonymous = CATEGORY_ANONYMOUS[category]
    const id = uuidv4()

    const post = {
      id,
      authorToken: hashUid(uid),
      authorName: isAnonymous ? anonymousName : realName,
      isAnonymous,
      category,
      tag: body.tag,
      targetMode,
      content: body.content,
      commentsCount: 0,
      reactions: { cheer: [], empathy: [], pray: [] },
      createdAt: new Date().toISOString(),
      isDeleted: false,
    }

    await this.firebase.collection('community_posts').doc(id).set(post)
    const { authorToken, ...safe } = post
    return safe
  }

  async reactPost(uid: string, postId: string, reaction: 'cheer' | 'empathy' | 'pray') {
    const token = hashUid(uid)
    const ref = this.firebase.collection('community_posts').doc(postId)
    const doc = await ref.get()
    if (!doc.exists) throw new NotFoundException('게시글을 찾을 수 없어요')

    const reactions = doc.data().reactions || { cheer: [], empathy: [], pray: [] }
    const current: string[] = reactions[reaction] || []
    const updated = current.includes(token)
      ? current.filter((t: string) => t !== token)
      : [...current, token]

    await ref.update({ [`reactions.${reaction}`]: updated })
    return { reactions: { ...reactions, [reaction]: updated } }
  }

  async deletePost(uid: string, postId: string) {
    const token = hashUid(uid)
    const ref = this.firebase.collection('community_posts').doc(postId)
    const doc = await ref.get()
    if (!doc.exists) throw new NotFoundException('게시글을 찾을 수 없어요')
    if (doc.data().authorToken !== token) throw new Error('삭제 권한이 없어요')
    await ref.update({ isDeleted: true })
    return { success: true }
  }

  // ============================
  // 댓글
  // ============================

  async getComments(postId: string) {
    const snap = await this.firebase.collection('community_comments')
      .where('postId', '==', postId)
      .get()
    return sortAsc(
      snap.docs.map((d: any) => {
        const { authorToken, ...rest } = d.data()
        return { id: d.id, ...rest }
      }),
    )
  }

  async addComment(
    uid: string,
    realName: string,
    anonymousName: string,
    postId: string,
    content: string,
  ) {
    const postDoc = await this.firebase.collection('community_posts').doc(postId).get()
    if (!postDoc.exists) throw new NotFoundException('게시글을 찾을 수 없어요')

    const postData = postDoc.data()
    const isAuthor = postData.authorToken === hashUid(uid)

    // 댓글도 게시글 카테고리 기준으로 익명 여부 결정
    const isAnonymous: boolean = postData.isAnonymous ?? CATEGORY_ANONYMOUS[postData.category]

    const id = uuidv4()
    const comment = {
      id, postId,
      authorToken: hashUid(uid),
      authorName: isAnonymous ? anonymousName : realName,
      isAnonymous,
      isAuthor,
      content,
      createdAt: new Date().toISOString(),
    }

    await this.firebase.collection('community_comments').doc(id).set(comment)
    await this.firebase.collection('community_posts').doc(postId).update({
      commentsCount: (postData.commentsCount || 0) + 1,
    })

    const { authorToken, ...safe } = comment
    return safe
  }
}
