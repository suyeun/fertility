import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class DiaryService {
  constructor(private firebase: FirebaseService) {}

  async getAll(uid: string) {
    const snap = await this.firebase.collection('diary_entries')
      .where('userId', '==', uid)
      .get()
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => b.date?.localeCompare(a.date ?? '') ?? 0)
  }

  async save(uid: string, date: string, data: any) {
    const existing = await this.firebase.collection('diary_entries')
      .where('userId', '==', uid)
      .where('date', '==', date)
      .limit(1)
      .get()

    const id = existing.empty ? uuidv4() : existing.docs[0].id
    const record = {
      ...data, id, userId: uid, date,
      createdAt: data.createdAt || new Date().toISOString(),
    }
    await this.firebase.collection('diary_entries').doc(id).set(record, { merge: true })
    return record
  }

  async delete(uid: string, id: string) {
    await this.firebase.collection('diary_entries').doc(id).delete()
  }
}
