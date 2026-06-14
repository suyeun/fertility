import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { FirebaseService } from '../firebase/firebase.service'
import { SignupDto, LoginDto } from './dto/auth.dto'
import { sanitizeUser } from '../users/users.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private firebase: FirebaseService,
    private jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    try {
      const usersRef = this.firebase.collection('users')

      // 이메일 중복 확인
      const existing = await usersRef.where('email', '==', dto.email).limit(1).get()
      if (!existing.empty) throw new ConflictException('이미 사용 중인 이메일입니다')

      const uid = uuidv4()
      const passwordHash = await bcrypt.hash(dto.password, 10)
      const now = new Date().toISOString()

      const userProfile = {
        id: uid,
        email: dto.email,
        passwordHash,
        name: dto.name,
        partnerName: dto.partnerName ?? null,
        currentMode: 'NATURAL',            // [TYPE-004] shared/types의 UserProfile 필수 필드
        averageCycleLength: 28,
        averagePeriodLength: 5,
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 트라이얼 전용
        // subscriptionExpiresAt: RevenueCat 결제 시 PaymentsService.setSubscription()이 설정 [BIZ-002]
        createdAt: now,
      }

      await usersRef.doc(uid).set(userProfile)
      return this.issueToken(uid, dto.email)
    } catch (err) {
      if (err instanceof ConflictException) throw err
      this.logger.error('signup 오류:', err)
      throw new InternalServerErrorException('회원가입 중 오류가 발생했습니다')
    }
  }

  async login(dto: LoginDto) {
    try {
      const usersRef = this.firebase.collection('users')
      const snap = await usersRef.where('email', '==', dto.email).limit(1).get()

      if (snap.empty) throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다')

      const userDoc = snap.docs[0]
      const user = userDoc.data()

      const isMatch = await bcrypt.compare(dto.password, user.passwordHash)
      if (!isMatch) throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다')

      return this.issueToken(user.id, user.email)
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      this.logger.error('login 오류:', err)
      throw new InternalServerErrorException('로그인 중 오류가 발생했습니다')
    }
  }

  async getMe(uid: string) {
    try {
      const doc = await this.firebase.collection('users').doc(uid).get()
      if (!doc.exists) throw new UnauthorizedException()
      return sanitizeUser(doc.data() as Record<string, any>) // [DRY-001] 공통 헬퍼 사용
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      this.logger.error('getMe 오류:', err)
      throw new InternalServerErrorException()
    }
  }

  private issueToken(uid: string, email: string) {
    const payload = { sub: uid, email }
    return {
      access_token: this.jwt.sign(payload),
      uid,
      email,
    }
  }
}
