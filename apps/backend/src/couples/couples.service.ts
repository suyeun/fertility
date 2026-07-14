import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { NotificationsService } from '../notifications/notifications.service'
import { v4 as uuidv4 } from 'uuid'

/** 6자리 영숫자 대소문자 혼합 코드 생성 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 혼동 문자(0/O, 1/I) 제외
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

@Injectable()
export class CouplesService {
  private readonly logger = new Logger(CouplesService.name)

  constructor(
    private firebase: FirebaseService,
    private notifications: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────
  // 현재 연결 상태 조회
  // ─────────────────────────────────────────────
  async getMyStatus(uid: string) {
    try {
      const userDoc = await this.firebase.collection('users').doc(uid).get()
      const userData = userDoc.data() as any

      if (!userData?.coupleId || !userData?.coupleRole) {
        return { linked: false, role: null, coupleId: null, partnerName: null, inviteCode: null, expiresAt: null }
      }

      const coupleDoc = await this.firebase.collection('couples').doc(userData.coupleId).get()
      if (!coupleDoc.exists) {
        return { linked: false, role: null, coupleId: null, partnerName: null, inviteCode: null, expiresAt: null }
      }

      const couple = coupleDoc.data() as any

      // UNLINKED 상태이면 미연결로 반환
      if (couple.status === 'UNLINKED') {
        return { linked: false, role: null, coupleId: null, partnerName: null, inviteCode: null, expiresAt: null }
      }

      // 배우자 이름 조회
      const partnerUid = couple.ownerId === uid ? couple.partnerId : couple.ownerId
      let partnerName: string | null = null
      if (partnerUid) {
        const partnerDoc = await this.firebase.collection('users').doc(partnerUid).get()
        partnerName = (partnerDoc.data() as any)?.name ?? null
      }

      return {
        linked: couple.status === 'LINKED',
        role: userData.coupleRole as 'OWNER' | 'PARTNER',
        coupleId: userData.coupleId,
        partnerName,
        // PENDING 상태의 OWNER에게만 코드 노출
        inviteCode: couple.status === 'PENDING' && couple.ownerId === uid ? couple.inviteCode : null,
        expiresAt: couple.status === 'PENDING' ? couple.expiresAt : null,
      }
    } catch (err) {
      this.logger.error('getMyStatus 오류:', err)
      throw new InternalServerErrorException('연결 상태를 확인하는 중 오류가 발생했습니다')
    }
  }

  // ─────────────────────────────────────────────
  // 초대코드 생성 (OWNER)
  // ─────────────────────────────────────────────
  async createInvite(uid: string): Promise<{ inviteCode: string; expiresAt: string }> {
    try {
      const userDoc = await this.firebase.collection('users').doc(uid).get()
      const userData = userDoc.data() as any

      // 이미 LINKED 상태면 재발급 불가
      if (userData?.coupleId) {
        const existingCouple = await this.firebase.collection('couples').doc(userData.coupleId).get()
        if (existingCouple.exists && existingCouple.data()?.status === 'LINKED') {
          throw new BadRequestException('이미 배우자와 연결되어 있습니다. 연결 해제 후 재초대 가능합니다')
        }
      }

      const coupleId = uuidv4()
      const inviteCode = generateInviteCode()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24시간 후

      const coupleData = {
        coupleId,
        ownerId: uid,
        partnerId: null,
        inviteCode,
        status: 'PENDING',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }

      // 기존 PENDING couple 정리 (동일 uid가 OWNER인 PENDING 레코드)
      if (userData?.coupleId) {
        const prevCouple = await this.firebase.collection('couples').doc(userData.coupleId).get()
        if (prevCouple.exists && prevCouple.data()?.status === 'PENDING') {
          await this.firebase.collection('couples').doc(userData.coupleId).update({ status: 'UNLINKED' })
        }
      }

      await this.firebase.collection('couples').doc(coupleId).set(coupleData)
      await this.firebase.collection('users').doc(uid).update({
        coupleId,
        coupleRole: 'OWNER',
      })

      this.logger.log(`초대코드 생성: ${uid} → coupleId=${coupleId}`)
      return { inviteCode, expiresAt: expiresAt.toISOString() }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error('createInvite 오류:', err)
      throw new InternalServerErrorException('초대코드 생성 중 오류가 발생했습니다')
    }
  }

  // ─────────────────────────────────────────────
  // 초대코드 입력 후 연결 (PARTNER)
  // ─────────────────────────────────────────────
  async joinCouple(uid: string, code: string): Promise<{ coupleId: string; partnerName: string }> {
    try {
      // 코드 대소문자 통일
      const normalizedCode = code.toUpperCase()

      // 코드로 couple 문서 찾기
      const snap = await this.firebase
        .collection('couples')
        .where('inviteCode', '==', normalizedCode)
        .where('status', '==', 'PENDING')
        .limit(1)
        .get()

      if (snap.empty) {
        throw new BadRequestException('유효하지 않거나 만료된 초대코드입니다')
      }

      const coupleDoc = snap.docs[0]
      const couple = coupleDoc.data() as any

      // 만료 확인
      if (couple.expiresAt && new Date(couple.expiresAt) < new Date()) {
        throw new BadRequestException('초대코드가 만료되었습니다. OWNER에게 재발급을 요청해주세요')
      }

      // 자기 자신과 연결 방지
      if (couple.ownerId === uid) {
        throw new BadRequestException('자신의 초대코드로는 연결할 수 없습니다')
      }

      const coupleId = coupleDoc.id

      // 트랜잭션으로 양쪽 업데이트
      await this.firebase.collection('couples').doc(coupleId).update({
        partnerId: uid,
        status: 'LINKED',
        linkedAt: new Date().toISOString(),
        inviteCode: null, // 코드 소진
      })

      await this.firebase.collection('users').doc(uid).update({
        coupleId,
        coupleRole: 'PARTNER',
      })

      // OWNER 이름 조회
      const ownerDoc = await this.firebase.collection('users').doc(couple.ownerId).get()
      const ownerName = (ownerDoc.data() as any)?.name ?? '배우자'

      // 양쪽에 푸시 알림 발송 (실패해도 연결은 성공)
      const partnerDoc = await this.firebase.collection('users').doc(uid).get()
      const partnerName = (partnerDoc.data() as any)?.name ?? '배우자'

      this.notifications.sendPushToUser(couple.ownerId, {
        title: '배우자 연결 완료 💕',
        body: `${partnerName}님과 연결되었습니다. 이제 일정과 기록을 함께 확인하세요.`,
      }).catch(e => this.logger.warn('OWNER 연결 알림 실패:', e))

      this.notifications.sendPushToUser(uid, {
        title: '배우자 연결 완료 💕',
        body: `${ownerName}님과 연결되었습니다. 이제 일정과 기록을 함께 확인하세요.`,
      }).catch(e => this.logger.warn('PARTNER 연결 알림 실패:', e))

      this.logger.log(`커플 연결: ${uid}(PARTNER) ↔ ${couple.ownerId}(OWNER), coupleId=${coupleId}`)
      return { coupleId, partnerName: ownerName }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error('joinCouple 오류:', err)
      throw new InternalServerErrorException('초대코드 연결 중 오류가 발생했습니다')
    }
  }

  // ─────────────────────────────────────────────
  // 연결 해제 (양쪽 모두 가능)
  // ─────────────────────────────────────────────
  async unlink(uid: string, coupleId: string): Promise<void> {
    try {
      const coupleDoc = await this.firebase.collection('couples').doc(coupleId).get()
      if (!coupleDoc.exists) throw new NotFoundException('연결 정보를 찾을 수 없습니다')

      const couple = coupleDoc.data() as any

      // 요청자가 ownerId 또는 partnerId 여야 함
      if (couple.ownerId !== uid && couple.partnerId !== uid) {
        throw new ForbiddenException('이 연결을 해제할 권한이 없습니다')
      }

      await this.firebase.collection('couples').doc(coupleId).update({
        status: 'UNLINKED',
        unlinkedAt: new Date().toISOString(),
        unlinkedBy: uid,
      })

      // 양쪽 사용자 coupleId / coupleRole 초기화
      const uidsToUpdate = [couple.ownerId, couple.partnerId].filter(Boolean)
      await Promise.all(
        uidsToUpdate.map(u =>
          this.firebase.collection('users').doc(u).update({ coupleId: null, coupleRole: null })
        )
      )

      this.logger.log(`커플 연결 해제: ${uid} → coupleId=${coupleId}`)
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err
      this.logger.error('unlink 오류:', err)
      throw new InternalServerErrorException('연결 해제 중 오류가 발생했습니다')
    }
  }

  // ─────────────────────────────────────────────
  // 내부 헬퍼: uid로 배우자 uid 조회
  // ─────────────────────────────────────────────
  async getPartnerUid(uid: string): Promise<string | null> {
    try {
      const userDoc = await this.firebase.collection('users').doc(uid).get()
      const coupleId = (userDoc.data() as any)?.coupleId
      if (!coupleId) return null

      const coupleDoc = await this.firebase.collection('couples').doc(coupleId).get()
      if (!coupleDoc.exists || coupleDoc.data()?.status !== 'LINKED') return null

      const couple = coupleDoc.data() as any
      return couple.ownerId === uid ? couple.partnerId : couple.ownerId
    } catch {
      return null
    }
  }
}
