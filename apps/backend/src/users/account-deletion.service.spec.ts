import * as bcrypt from 'bcryptjs'
import { UnauthorizedException, NotFoundException } from '@nestjs/common'
import { AccountDeletionService } from './account-deletion.service'

/// Firestore 를 흉내 내는 최소 가짜 — 컬렉션별 문서 맵과 where(field == value) 만 지원.
function fakeFirebase(store: Record<string, Record<string, any>>) {
  const deleted: string[] = []
  const updated: Record<string, any> = {}
  const docRef = (col: string, id: string) => ({
    get: async () => ({ exists: !!store[col]?.[id], data: () => store[col]?.[id] }),
    set: async (data: any) => { store[col] = store[col] || {}; store[col][id] = { ...(store[col][id] || {}), ...data }; updated[`${col}/${id}`] = data },
    delete: async () => { deleted.push(`${col}/${id}`); delete store[col]?.[id] },
    update: async (data: any) => { store[col][id] = { ...store[col][id], ...data }; updated[`${col}/${id}`] = data },
  })
  const collection = (col: string) => ({
    doc: (id: string) => docRef(col, id),
    where: (field: string, _op: string, value: any) => ({
      limit: () => ({
        get: async () => {
          const docs = Object.entries(store[col] || {})
            .filter(([, d]) => d[field] === value)
            .map(([id, d]) => ({ id, ref: docRef(col, id), data: () => d }))
          return { empty: docs.length === 0, size: docs.length, docs }
        },
      }),
      get: async () => {
        const docs = Object.entries(store[col] || {})
          .filter(([, d]) => d[field] === value)
          .map(([id, d]) => ({ id, ref: docRef(col, id), data: () => d }))
        return { empty: docs.length === 0, size: docs.length, docs }
      },
    }),
  })
  const db = {
    batch: () => {
      const ops: Array<() => Promise<void>> = []
      return {
        delete: (ref: any) => ops.push(() => ref.delete()),
        update: (ref: any, data: any) => ops.push(() => ref.update(data)),
        commit: async () => { for (const op of ops) await op() },
      }
    },
  }
  return { collection, db, deleted, updated, store }
}

describe('AccountDeletionService', () => {
  const password = 'secret123'
  let hash: string
  beforeAll(async () => { hash = await bcrypt.hash(password, 4) })

  const build = () => {
    const fb = fakeFirebase({
      users: {
        u1: { id: 'u1', email: 'a@b.c', passwordHash: hash, coupleId: 'c1' },
        u2: { id: 'u2', email: 'p@b.c', passwordHash: 'x', coupleId: 'c1' },
      },
      couples: { c1: { ownerId: 'u1', partnerId: 'u2', status: 'LINKED' } },
      treatment_schedules: { s1: { userId: 'u1' }, s2: { userId: 'u2' } },
      hormone_records: { h1: { userId: 'u1' } },
      menstrual_cycles: {},
      daily_notes: { d1: { userId: 'u1' }, d2: { userId: 'u1' } },
      scheduled_notifications: { n1: { uid: 'u1' } },
      subsidy_profiles: { u1: { regionCode: 'seoul' } },
      push_tokens: { u1: { token: 't' } },
      community_reports: { r1: { reporterUid: 'u1' } },
    })
    const community = { anonymizeAuthor: jest.fn().mockResolvedValue({ posts: 2, comments: 3 }) }
    return { fb, community, service: new AccountDeletionService(fb as any, community as any) }
  }

  it('비밀번호가 틀리면 아무것도 지우지 않는다', async () => {
    const { fb, service } = build()
    await expect(service.deleteAccount('u1', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException)
    expect(fb.deleted).toHaveLength(0)
  })

  it('없는 사용자면 NotFound', async () => {
    const { service } = build()
    await expect(service.deleteAccount('nobody', password)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('본인 기록만 삭제하고 배우자 연결을 해제하며 커뮤니티 글은 익명화한다', async () => {
    const { fb, community, service } = build()
    const res = await service.deleteAccount('u1', password)

    expect(res.deleted).toBe(true)
    expect(res.summary.treatment_schedules).toBe(1)
    expect(res.summary.daily_notes).toBe(2)
    expect(res.summary.hormone_records).toBe(1)
    expect(res.summary.scheduled_notifications).toBe(1)
    expect(res.summary.subsidy_profiles).toBe(1)
    expect(res.summary.push_tokens).toBe(1)
    expect(res.summary.community_reports).toBe(1)
    expect(res.summary.community_posts_anonymized).toBe(2)
    expect(community.anonymizeAuthor).toHaveBeenCalledWith('u1')

    // 배우자 기록은 남고 연결만 끊긴다
    expect(fb.store.treatment_schedules.s2).toBeDefined()
    expect(fb.store.couples.c1.status).toBe('UNLINKED')
    expect(fb.updated['users/u2']).toEqual({ coupleId: null, coupleRole: null })

    // 사용자 문서 삭제
    expect(fb.store.users.u1).toBeUndefined()
    expect(fb.deleted).toContain('users/u1')
  })
})
