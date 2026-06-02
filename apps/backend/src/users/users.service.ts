import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'

@Injectable()
export class UsersService {
  constructor(private firebase: FirebaseService) {}

  async getProfile(uid: string) {
    const doc = await this.firebase.collection('users').doc(uid).get()
    if (!doc.exists) return null
    const { passwordHash, ...profile } = doc.data() as any
    return profile
  }

  async updateProfile(uid: string, data: Partial<any>) {
    const { passwordHash, ...safe } = data as any
    await this.firebase.collection('users').doc(uid).update(safe)
    return this.getProfile(uid)
  }
}
