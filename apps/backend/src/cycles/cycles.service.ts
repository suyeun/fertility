import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class CyclesService {
  constructor(private firebase: FirebaseService) {}

  async getAll(uid: string) {
    const snap = await this.firebase.collection('menstrual_cycles')
      .where('userId', '==', uid)
      .orderBy('startDate', 'desc')
      .get()
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  async save(uid: string, data: any) {
    const id = data.id || uuidv4()
    const record = { ...data, id, userId: uid, createdAt: data.createdAt || new Date().toISOString() }
    await this.firebase.collection('menstrual_cycles').doc(id).set(record, { merge: true })
    return record
  }
}
