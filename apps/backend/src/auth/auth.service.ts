import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { FirebaseService } from '../firebase/firebase.service'
import { SignupDto, LoginDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
  constructor(
    private firebase: FirebaseService,
    private jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
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
      partnerName: dto.partnerName,
      averageCycleLength: 28,
      averagePeriodLength: 5,
      subscriptionStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
    }

    await usersRef.doc(uid).set(userProfile)

    return this.issueToken(uid, dto.email)
  }

  async login(dto: LoginDto) {
    const usersRef = this.firebase.collection('users')
    const snap = await usersRef.where('email', '==', dto.email).limit(1).get()

    if (snap.empty) throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다')

    const userDoc = snap.docs[0]
    const user = userDoc.data()

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isMatch) throw new UnauthorizedException('이메일 또는 비밀번호가 틀렸습니다')

    return this.issueToken(user.id, user.email)
  }

  async getMe(uid: string) {
    const doc = await this.firebase.collection('users').doc(uid).get()
    if (!doc.exists) throw new UnauthorizedException()
    const { passwordHash, ...profile } = doc.data() as any
    return profile
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
