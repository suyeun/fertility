import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { randomUUID } from 'node:crypto'
import sanitizeHtml from 'sanitize-html'

const sanitize = (text: string) =>
  sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} })
import {
  TAG_META, CATEGORY_ANONYMOUS,
  type PostTag, type PostCategory, type PostTargetMode,
} from '@fertility/shared'

import { hashUid } from '../common/hash-uid'
import { ReportReason } from './dto/moderation.dto'

/// 서로 다른 신고자 수가 이 값에 도달하면 자동 숨김(운영자 검토 전까지).
export const AUTO_HIDE_REPORT_THRESHOLD = 3

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

  /// 차단한 작성자 토큰 목록 — users/{uid}.blockedAuthorTokens
  async getBlockedTokens(uid: string): Promise<string[]> {
    const doc = await this.firebase.collection('users').doc(uid).get()
    const list = (doc.data() as any)?.blockedAuthorTokens
    return Array.isArray(list) ? list : []
  }

  async getPosts(params: {
    category?: PostCategory
    tag?: PostTag
    userMode?: string
    viewerUid?: string
  }) {
    let q: any = this.firebase.collection('community_posts')
      .where('isDeleted', '==', false)

    if (params.category) q = q.where('category', '==', params.category)
    if (params.tag)      q = q.where('tag', '==', params.tag)

    const blocked = params.viewerUid ? await this.getBlockedTokens(params.viewerUid) : []
    const myToken = params.viewerUid ? hashUid(params.viewerUid) : null

    const snap = await q.limit(80).get()
    let posts = snap.docs
      .map((d: any) => d.data())
      // 신고 누적 자동 숨김 + 차단한 작성자 글 제외 (서버에서 걸러 토큰을 노출하지 않는다)
      .filter((p: any) => !p.isHidden && !blocked.includes(p.authorToken))
      .map((p: any) => {
        const { authorToken, ...rest } = p
        return { id: p.id, ...rest, isMine: myToken != null && authorToken === myToken }
      })
      .slice(0, 50)

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
    body: { tag: PostTag; title: string; content: string },
  ) {
    const { category, targetMode } = resolveTagMeta(body.tag)
    const isAnonymous = CATEGORY_ANONYMOUS[category]
    const id = randomUUID()

    const post = {
      id,
      authorToken: hashUid(uid),
      authorName: isAnonymous ? anonymousName : realName,
      isAnonymous,
      category,
      tag: body.tag,
      targetMode,
      title: sanitize(body.title),
      content: sanitize(body.content),
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

  async getComments(postId: string, viewerUid?: string) {
    const blocked = viewerUid ? await this.getBlockedTokens(viewerUid) : []
    const myToken = viewerUid ? hashUid(viewerUid) : null
    const snap = await this.firebase.collection('community_comments')
      .where('postId', '==', postId)
      .get()
    return sortAsc(
      snap.docs
        .map((d: any) => d.data())
        .filter((c: any) => !c.isHidden && !blocked.includes(c.authorToken))
        .map((c: any) => {
          const { authorToken, ...rest } = c
          return { id: c.id, ...rest, isMine: myToken != null && authorToken === myToken }
        }),
    )
  }

  // ============================
  // 신고 · 차단 (App Store 1.2 / Play UGC 정책)
  // ============================

  /// 글·댓글 신고. 같은 사람이 같은 대상을 여러 번 신고해도 1건으로 센다.
  /// 서로 다른 신고자가 AUTO_HIDE_REPORT_THRESHOLD 명에 도달하면 자동 숨김 후 운영자 검토.
  async report(
    uid: string,
    target: { postId?: string; commentId?: string },
    reason: ReportReason,
    detail?: string,
  ) {
    const collection = target.commentId ? 'community_comments' : 'community_posts'
    const targetId = target.commentId ?? target.postId
    if (!targetId) throw new BadRequestException('신고 대상이 필요해요')

    const targetRef = this.firebase.collection(collection).doc(targetId)
    const targetDoc = await targetRef.get()
    if (!targetDoc.exists) throw new NotFoundException('대상을 찾을 수 없어요')
    if (targetDoc.data().authorToken === hashUid(uid)) {
      throw new BadRequestException('본인이 작성한 글은 신고할 수 없어요')
    }

    const reportId = `${collection}_${targetId}_${hashUid(uid)}`
    await this.firebase.collection('community_reports').doc(reportId).set(
      {
        targetCollection: collection,
        targetId,
        reporterUid: uid,
        reason,
        detail: detail ? sanitize(detail) : null,
        status: 'open',
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    )

    const reportsSnap = await this.firebase.collection('community_reports')
      .where('targetCollection', '==', collection)
      .where('targetId', '==', targetId)
      .get()
    const reporterCount = new Set(reportsSnap.docs.map((d) => d.data().reporterUid)).size

    let hidden = false
    if (reporterCount >= AUTO_HIDE_REPORT_THRESHOLD && !targetDoc.data().isHidden) {
      await targetRef.update({ isHidden: true, hiddenAt: new Date().toISOString(), hiddenReason: 'reports' })
      hidden = true
    }
    return { success: true, reporterCount, hidden }
  }

  /// 글 또는 댓글의 작성자를 차단 — 이후 그 작성자의 글·댓글이 목록에서 사라진다.
  async blockAuthor(uid: string, target: { postId?: string; commentId?: string }) {
    const collection = target.commentId ? 'community_comments' : 'community_posts'
    const targetId = target.commentId ?? target.postId
    if (!targetId) throw new BadRequestException('차단 대상이 필요해요')

    const doc = await this.firebase.collection(collection).doc(targetId).get()
    if (!doc.exists) throw new NotFoundException('대상을 찾을 수 없어요')
    const token: string = doc.data().authorToken
    if (token === hashUid(uid)) throw new BadRequestException('본인은 차단할 수 없어요')

    const userRef = this.firebase.collection('users').doc(uid)
    const current = await this.getBlockedTokens(uid)
    if (!current.includes(token)) {
      await userRef.set({ blockedAuthorTokens: [...current, token] }, { merge: true })
    }
    return { success: true, blockedCount: current.includes(token) ? current.length : current.length + 1 }
  }

  async unblockAll(uid: string) {
    await this.firebase.collection('users').doc(uid).set({ blockedAuthorTokens: [] }, { merge: true })
    return { success: true }
  }

  /// 계정 삭제 시 작성 글·댓글 익명화 — 내용은 남기되 작성자 연결을 끊는다.
  async anonymizeAuthor(uid: string): Promise<{ posts: number; comments: number }> {
    const token = hashUid(uid)
    let posts = 0, comments = 0
    for (const [collection, counter] of [['community_posts', 'p'], ['community_comments', 'c']] as const) {
      const snap = await this.firebase.collection(collection).where('authorToken', '==', token).get()
      const batch = this.firebase.db.batch()
      snap.docs.forEach((d) => batch.update(d.ref, { authorToken: 'deleted', authorName: '탈퇴한 사용자' }))
      await batch.commit()
      if (counter === 'p') posts = snap.size
      else comments = snap.size
    }
    return { posts, comments }
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

    const id = randomUUID()
    const comment = {
      id, postId,
      authorToken: hashUid(uid),
      authorName: isAnonymous ? anonymousName : realName,
      isAnonymous,
      isAuthor,
      content: sanitize(content),
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
