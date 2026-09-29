import { BadRequestException } from '@nestjs/common'
import { AUTO_HIDE_REPORT_THRESHOLD, CommunityService } from './community.service'
import { hashUid } from '../common/hash-uid'

function fakeFirebase(store: Record<string, Record<string, any>>) {
  const docRef = (col: string, id: string) => ({
    get: async () => ({ exists: !!store[col]?.[id], data: () => store[col]?.[id] }),
    set: async (data: any, opts?: any) => {
      store[col] = store[col] || {}
      store[col][id] = opts?.merge ? { ...(store[col][id] || {}), ...data } : data
    },
    update: async (data: any) => { store[col][id] = { ...store[col][id], ...data } },
  })
  const query = (col: string, filters: Array<[string, any]>): any => ({
    where: (f: string, _o: string, v: any) => query(col, [...filters, [f, v]]),
    limit: () => query(col, filters),
    get: async () => {
      const docs = Object.entries(store[col] || {})
        .filter(([, d]) => filters.every(([f, v]) => d[f] === v))
        .map(([id, d]) => ({ id, ref: docRef(col, id), data: () => d }))
      return { empty: docs.length === 0, size: docs.length, docs }
    },
  })
  return {
    collection: (col: string) => ({ doc: (id: string) => docRef(col, id), ...query(col, []) }),
    db: { batch: () => { const ops: any[] = []; return { update: (r: any, d: any) => ops.push(() => r.update(d)), commit: async () => { for (const o of ops) await o() } } } },
    store,
  }
}

describe('CommunityService 신고·차단', () => {
  const author = 'author-uid'
  const build = () => {
    const fb = fakeFirebase({
      community_posts: { p1: { id: 'p1', authorToken: hashUid(author), content: 'x', isDeleted: false, targetMode: 'ALL', createdAt: '2026-09-01T00:00:00.000Z' } },
      community_comments: { c1: { id: 'c1', postId: 'p1', authorToken: hashUid(author), content: 'y' } },
      community_reports: {},
      users: {},
    })
    return { fb, service: new CommunityService(fb as any) }
  }

  it('본인 글은 신고할 수 없다', async () => {
    const { service } = build()
    await expect(service.report(author, { postId: 'p1' }, 'spam')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('같은 사람의 중복 신고는 1건으로 세고, 서로 다른 신고자가 임계값에 도달하면 숨긴다', async () => {
    const { fb, service } = build()
    for (let i = 0; i < 3; i++) await service.report('r1', { postId: 'p1' }, 'spam')
    expect(fb.store.community_posts.p1.isHidden).toBeUndefined()

    let last: any
    for (let i = 2; i <= AUTO_HIDE_REPORT_THRESHOLD; i++) {
      last = await service.report(`r${i}`, { postId: 'p1' }, 'harassment', '욕설')
    }
    expect(last.reporterCount).toBe(AUTO_HIDE_REPORT_THRESHOLD)
    expect(last.hidden).toBe(true)
    expect(fb.store.community_posts.p1.isHidden).toBe(true)
  })

  it('댓글 ID 로 작성자를 차단하면 그 작성자의 글·댓글이 목록에서 빠진다', async () => {
    const { fb, service } = build()
    await service.blockAuthor('viewer', { commentId: 'c1' })
    expect(fb.store.users.viewer.blockedAuthorTokens).toEqual([hashUid(author)])

    const posts = await service.getPosts({ viewerUid: 'viewer' })
    expect(posts).toHaveLength(0)
    const comments = await service.getComments('p1', 'viewer')
    expect(comments).toHaveLength(0)

    // 다른 사용자에게는 보이고, authorToken 은 노출되지 않으며 isMine 이 계산된다
    const others = await service.getPosts({ viewerUid: author })
    expect(others).toHaveLength(1)
    expect(others[0]).not.toHaveProperty('authorToken')
    expect(others[0].isMine).toBe(true)
  })

  it('본인은 차단할 수 없고, 차단 해제는 목록을 비운다', async () => {
    const { fb, service } = build()
    await expect(service.blockAuthor(author, { postId: 'p1' })).rejects.toBeInstanceOf(BadRequestException)
    await service.blockAuthor('viewer', { postId: 'p1' })
    await service.unblockAll('viewer')
    expect(fb.store.users.viewer.blockedAuthorTokens).toEqual([])
  })

  it('계정 삭제 익명화는 작성자 토큰과 이름을 바꾼다', async () => {
    const { fb, service } = build()
    const res = await service.anonymizeAuthor(author)
    expect(res).toEqual({ posts: 1, comments: 1 })
    expect(fb.store.community_posts.p1.authorToken).toBe('deleted')
    expect(fb.store.community_comments.c1.authorName).toBe('탈퇴한 사용자')
  })
})
