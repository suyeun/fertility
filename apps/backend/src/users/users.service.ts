import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'

/** 민감 필드를 제외하고 안전한 프로필 객체를 반환합니다 */
export function sanitizeUser(data: Record<string, any>) {
  const { passwordHash, ...profile } = data
  return profile
}

/** 클라이언트가 직접 수정 가능한 프로필 필드 목록 */
const ALLOWED_UPDATE_FIELDS = [
  'name',
  'partnerName',
  'currentMode',
  'treatmentStage',
  'averageCycleLength',
  'averagePeriodLength',
] as const

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(private firebase: FirebaseService) {}

  async getProfile(uid: string) {
    try {
      const doc = await this.firebase.collection('users').doc(uid).get()
      if (!doc.exists) throw new NotFoundException('사용자를 찾을 수 없습니다')
      return sanitizeUser(doc.data() as Record<string, any>)
    } catch (err) {
      if (err instanceof NotFoundException) throw err
      this.logger.error('getProfile 오류:', err)
      throw new InternalServerErrorException('프로필을 불러오는 중 오류가 발생했습니다')
    }
  }

  async updateProfile(uid: string, data: Partial<Record<typeof ALLOWED_UPDATE_FIELDS[number], any>>) {
    try {
      // 허용된 필드만 추출 — subscriptionStatus, trialEndsAt 등 민감 필드 차단
      const safeUpdate = ALLOWED_UPDATE_FIELDS.reduce((acc, field) => {
        if (data[field] !== undefined) acc[field] = data[field]
        return acc
      }, {} as Record<string, any>)

      await this.firebase.collection('users').doc(uid).update(safeUpdate)
      return this.getProfile(uid)
    } catch (err) {
      if (err instanceof NotFoundException) throw err
      this.logger.error('updateProfile 오류:', err)
      throw new InternalServerErrorException('프로필을 업데이트하는 중 오류가 발생했습니다')
    }
  }
}
