/**
 * [SHARED-001] 건강 데이터 서비스 (생리주기, 호르몬, 시술일정)
 */
import {
  doc, collection, getDocs, setDoc, deleteDoc, query, where, orderBy,
} from 'firebase/firestore'
import { MenstrualCycle, HormoneRecord, TreatmentSchedule } from '../types'
import { isMockMode, db, mockStore } from './firebase-core'

export const cyclesService = {
  getMenstrualCycles: async (uid: string): Promise<MenstrualCycle[]> => {
    if (isMockMode) {
      const records = mockStore.get('menstrual_cycles')
      return records
        .filter(r => r.userId === uid)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    } else {
      const q = query(
        collection(db, 'menstrual_cycles'),
        where('userId', '==', uid),
        orderBy('startDate', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as MenstrualCycle))
    }
  },

  saveMenstrualCycle: async (uid: string, record: Partial<MenstrualCycle>): Promise<void> => {
    const id = record.id || 'cycle_' + Math.random().toString(36).substring(2, 9)
    const newRecord = {
      id, userId: uid,
      startDate: record.startDate,
      endDate: record.endDate || null,
      cycleLength: record.cycleLength || 28,
      periodLength: record.periodLength || 5,
      notes: record.notes || '',
      createdAt: record.createdAt || new Date().toISOString(),
    }
    if (isMockMode) {
      const records = mockStore.get('menstrual_cycles')
      const index = records.findIndex(r => r.id === id)
      if (index > -1) { records[index] = { ...records[index], ...newRecord } } else { records.push(newRecord) }
      mockStore.set('menstrual_cycles', records)
    } else {
      await setDoc(doc(db, 'menstrual_cycles', id), newRecord, { merge: true })
    }
  },
}

export const hormonesService = {
  getHormoneRecords: async (uid: string): Promise<HormoneRecord[]> => {
    if (isMockMode) {
      const records = mockStore.get('hormone_records')
      return records
        .filter(r => r.userId === uid)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    } else {
      const q = query(
        collection(db, 'hormone_records'),
        where('userId', '==', uid),
        orderBy('recordedAt', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as HormoneRecord))
    }
  },

  saveHormoneRecord: async (uid: string, record: Partial<HormoneRecord>): Promise<void> => {
    const id = record.id || 'hormone_' + Math.random().toString(36).substring(2, 9)
    const newRecord = {
      id, userId: uid,
      recordedAt: record.recordedAt || new Date().toISOString().split('T')[0],
      amh: record.amh, fsh: record.fsh, lh: record.lh,
      estradiol: record.estradiol, progesterone: record.progesterone,
      bbt: record.bbt, opkIndex: record.opkIndex, cervicalMucus: record.cervicalMucus,
      weight: record.weight, sleepHours: record.sleepHours,
      follicleSize: record.follicleSize, endometriumThickness: record.endometriumThickness,
      retrievedOocytesCount: record.retrievedOocytesCount, embryoGrade: record.embryoGrade,
      hcgLevel: record.hcgLevel, intercourse: record.intercourse,
      notes: record.notes || '',
      createdAt: new Date().toISOString(),
    }
    if (isMockMode) {
      const records = mockStore.get('hormone_records')
      const index = records.findIndex(r => r.id === id)
      if (index > -1) { records[index] = { ...records[index], ...newRecord } } else { records.push(newRecord) }
      mockStore.set('hormone_records', records)
    } else {
      await setDoc(doc(db, 'hormone_records', id), newRecord, { merge: true })
    }
  },

  deleteHormoneRecord: async (_uid: string, id: string): Promise<void> => {
    if (isMockMode) {
      const records = mockStore.get('hormone_records')
      mockStore.set('hormone_records', records.filter(r => r.id !== id))
    } else {
      await deleteDoc(doc(db, 'hormone_records', id))
    }
  },
}

export const treatmentService = {
  getTreatmentSchedules: async (uid: string): Promise<TreatmentSchedule[]> => {
    if (isMockMode) {
      const schedules = mockStore.get('treatment_schedules')
      return schedules
        .filter(s => s.userId === uid)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    } else {
      const q = query(
        collection(db, 'treatment_schedules'),
        where('userId', '==', uid),
        orderBy('scheduledAt', 'asc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TreatmentSchedule))
    }
  },

  saveTreatmentSchedule: async (uid: string, schedule: Partial<TreatmentSchedule>): Promise<void> => {
    const id = schedule.id || 'schedule_' + Math.random().toString(36).substring(2, 9)
    const newRecord = {
      id, userId: uid,
      type: schedule.type || 'other',
      title: schedule.title || '',
      scheduledAt: schedule.scheduledAt || new Date().toISOString(),
      status: schedule.status || 'scheduled',
      hospitalName: schedule.hospitalName || '',
      notes: schedule.notes || '',
      medications: schedule.medications || [],
      createdAt: new Date().toISOString(),
    }
    if (isMockMode) {
      const schedules = mockStore.get('treatment_schedules')
      const index = schedules.findIndex(s => s.id === id)
      if (index > -1) { schedules[index] = { ...schedules[index], ...newRecord } } else { schedules.push(newRecord) }
      mockStore.set('treatment_schedules', schedules)
    } else {
      await setDoc(doc(db, 'treatment_schedules', id), newRecord, { merge: true })
    }
  },

  deleteTreatmentSchedule: async (_uid: string, id: string): Promise<void> => {
    if (isMockMode) {
      const schedules = mockStore.get('treatment_schedules')
      mockStore.set('treatment_schedules', schedules.filter(s => s.id !== id))
    } else {
      await deleteDoc(doc(db, 'treatment_schedules', id))
    }
  },
}
