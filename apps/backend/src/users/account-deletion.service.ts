import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { FirebaseService } from '../firebase/firebase.service'
import { CommunityService } from '../community/community.service'

/// 계정 삭제 (App Store 5.1.1(v) / Play 데이터 삭제 정책).
///
/// 순서: 비밀번호 재확인 → 배우자 연결 해제 → 개인 기록 삭제 → 커뮤니티 글 익명화 → 사용자 문서 삭제.
/// 삭제는 되돌릴 수 없으며, 결제 구독은 스토어에서 별도로 해지해야 한다(앱이 안내).
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name)

  constructor(
    private firebase: FirebaseService,
    private community: CommunityService,
  ) {}

  /// userId 필드로 사용자를 참조하는 개인 기록 컬렉션.
  static readonly USER_OWNED_COLLECTIONS = [
    'menstrual_cycles',
    'hormone_records',
    'treatment_schedules',
    'daily_notes',
  ] as const

  async deleteAccount(uid: string, password: string): Promise<{ deleted: true; summary: Record<string, number> }> {
    const userRef = this.firebase.collection('users').doc(uid)
    const userDoc = await userRef.get()
    if (!userDoc.exists) throw new NotFoundException('사용자를 찾을 수 없습니다')
    const user = userDoc.data() as any

    const ok = await bcrypt.compare(password, user.passwordHash ?? '')
    if (!ok) throw new UnauthorizedException('비밀번호가 일치하지 않아요')

    const summary: Record<string, number> = {}

    // 1) 배우자 연결 해제 — 상대방 문서의 연결 정보만 지우고 상대 기록은 유지
    if (user.coupleId) {
      const coupleRef = this.firebase.collection('couples').doc(user.coupleId)
      const coupleDoc = await coupleRef.get()
      if (coupleDoc.exists) {
        const c = coupleDoc.data() as any
        const partnerUid: string | null = c.ownerId === uid ? c.partnerId : c.ownerId
        await coupleRef.set({ status: 'UNLINKED', unlinkedAt: new Date().toISOString(), unlinkedBy: 'account_deletion' }, { merge: true })
        if (partnerUid) {
          await this.firebase.collection('users').doc(partnerUid).set({ coupleId: null, coupleRole: null }, { merge: true })
        }
        summary.couples = 1
      }
    }

    // 2) 개인 기록 삭제 (userId == uid)
    for (const col of AccountDeletionService.USER_OWNED_COLLECTIONS) {
      summary[col] = await this.deleteWhere(col, 'userId', uid)
    }
    summary.scheduled_notifications = await this.deleteWhere('scheduled_notifications', 'uid', uid)

    // 3) 문서 ID = uid 인 컬렉션
    for (const col of ['subsidy_profiles', 'push_tokens'] as const) {
      const ref = this.firebase.collection(col).doc(uid)
      if ((await ref.get()).exists) {
        await ref.delete()
        summary[col] = 1
      }
    }

    // 4) 커뮤니티 — 글·댓글은 대화 맥락 보존을 위해 익명화만 한다
    const anon = await this.community.anonymizeAuthor(uid)
    summary.community_posts_anonymized = anon.posts
    summary.community_comments_anonymized = anon.comments
    summary.community_reports = await this.deleteWhere('community_reports', 'reporterUid', uid)

    // 5) 사용자 문서 삭제 (이메일·비밀번호 해시 포함)
    await userRef.delete()

    this.logger.log(`계정 삭제 완료: ${uid} ${JSON.stringify(summary)}`)
    return { deleted: true, summary }
  }

  private async deleteWhere(collection: string, field: string, value: string): Promise<number> {
    let total = 0
    // 500건 배치 한도를 넘지 않도록 반복 삭제
    for (;;) {
      const snap = await this.firebase.collection(collection).where(field, '==', value).limit(400).get()
      if (snap.empty) break
      const batch = this.firebase.db.batch()
      snap.docs.forEach((d) => batch.delete(d.ref))
      await batch.commit()
      total += snap.size
      if (snap.size < 400) break
    }
    return total
  }
}
