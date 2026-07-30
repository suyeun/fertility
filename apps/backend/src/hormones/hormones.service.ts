import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'
import { CouplesService } from '../couples/couples.service'
import { randomUUID } from 'node:crypto'

@Injectable()
export class HormonesService {
  constructor(
    private firebase: FirebaseService,
    private couples: CouplesService,
  ) {}

  async getAll(uid: string) {
    const mySnap = await this.firebase.collection('hormone_records')
      .where('userId', '==', uid)
      .get()
    const myRecords = mySnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => b.recordedAt?.localeCompare(a.recordedAt ?? '') ?? 0)

    // 배우자 연결 시 배우자 기록도 함께 조회
    const partnerUid = await this.couples.getPartnerUid(uid)
    if (!partnerUid) return myRecords

    const partnerSnap = await this.firebase.collection('hormone_records')
      .where('userId', '==', partnerUid)
      .get()
    const partnerRecords = partnerSnap.docs
      .map(d => ({ id: d.id, ...d.data(), isPartnerRecord: true }))
      .sort((a: any, b: any) => b.recordedAt?.localeCompare(a.recordedAt ?? '') ?? 0)

    return [...myRecords, ...partnerRecords]
      .sort((a: any, b: any) => b.recordedAt?.localeCompare(a.recordedAt ?? '') ?? 0)
  }

  async save(uid: string, data: any) {
    const id = data.id || randomUUID()

    // coupleId 자동 주입
    const userDoc = await this.firebase.collection('users').doc(uid).get()
    const coupleId = (userDoc.data() as any)?.coupleId ?? null

    const record = {
      ...data, id, userId: uid, coupleId,
      author: uid,
      updatedAt: new Date().toISOString(),
    }
    await this.firebase.collection('hormone_records').doc(id).set(record, { merge: true })
    return record
  }

  async delete(uid: string, id: string) {
    await this.firebase.collection('hormone_records').doc(id).delete()
  }
}
