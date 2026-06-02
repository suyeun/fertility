import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class HormonesService {
  constructor(private firebase: FirebaseService) {}

  async getAll(uid: string) {
    const snap = await this.firebase.collection('hormone_records')
      .where('userId', '==', uid)
      .get()
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => b.recordedAt?.localeCompare(a.recordedAt ?? '') ?? 0)
  }

  async save(uid: string, data: any) {
    const id = data.id || uuidv4()
    const record = { ...data, id, userId: uid }
    await this.firebase.collection('hormone_records').doc(id).set(record, { merge: true })
    return record
  }

  async delete(uid: string, id: string) {
    await this.firebase.collection('hormone_records').doc(id).delete()
  }
}
