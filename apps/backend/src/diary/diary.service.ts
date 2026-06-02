import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class DiaryService {
  constructor(private firebase: FirebaseService) {}

  async getAll(uid: string) {
    const snap = await this.firebase.collection('diary_entries')
      .where('userId', '==', uid)
      .orderBy('date', 'desc')
      .get()
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  async save(uid: string, date: string, data: any) {
    // 같은 날짜 기록이 있으면 업데이트
    const existing = await this.firebase.collection('diary_entries')
      .where('userId', '==', uid)
      .where('date', '==', date)
      .limit(1)
      .get()

    let id: string
    if (!existing.empty) {
      id = existing.docs[0].id
    } else {
      id = uuidv4()
    }

    const record = {
      ...data,
      id,
      userId: uid,
      date,
      createdAt: data.createdAt || new Date().toISOString(),
    }
    await this.firebase.collection('diary_entries').doc(id).set(record, { merge: true })
    return record
  }

  async delete(uid: string, id: string) {
    await this.firebase.collection('diary_entries').doc(id).delete()
  }
}
