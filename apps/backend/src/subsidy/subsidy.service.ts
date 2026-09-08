import { ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { FirebaseService } from '../firebase/firebase.service'
import { SaveSubsidyProfileDto, AddSubsidyCalculationDto, UpdateSubsidyApplicationDto } from './dto/save-subsidy-profile.dto'

export interface NationalRules {
  version?: string
  effectiveDate?: string
  totalLimit?: number
  procedures?: Record<string, { label: string; maxAmount: number; countLimit: number; countGroup: string }>
  extras?: Record<string, { label: string; maxAmount: number }>
  eligibilityNotes?: string[]
  disclaimer?: string
}

export interface LocalRules {
  version?: string
  regions?: Array<{
    regionCode: string
    regionName: string
    overrides?: Record<string, number>
    additionalBenefits?: Array<{ id: string; label: string; description?: string; maxAmount?: number | null; amountNote?: string }>
    residencyNote?: string
    applyChannels?: string[]
    sourceUrl?: string
    lastVerified?: string
  }>
}

const emptySubsidyProfile = {
  regionCode: null,
  marriageType: null,
  usedCounts: { ivf: 0, iui: 0 },
  birthsSinceStart: 0,
  calculations: [],
  checklistState: {},
  applications: {},   // scheduleId → 신청 진행 상태 (UpdateSubsidyApplicationDto + scheduleId, updatedAt)
}

@Injectable()
export class SubsidyService {
  private readonly logger = new Logger(SubsidyService.name)

  constructor(private firebase: FirebaseService) {}

  // 인증 불필요 — 지원금 규칙은 공개 데이터. Firestore config 문서 기반이라
  // 앱 업데이트 없이 관리자가 값만 갱신하면 즉시 반영된다 (InfoModule과 동일 패턴).
  async getRules(): Promise<{ national: NationalRules; local: LocalRules }> {
    try {
      const [nationalDoc, localDoc] = await Promise.all([
        this.firebase.db.collection('config').doc('subsidyNationalRules').get(),
        this.firebase.db.collection('config').doc('subsidyLocalRules').get(),
      ])
      return {
        national: nationalDoc.exists ? (nationalDoc.data() as NationalRules) : {},
        local: localDoc.exists ? (localDoc.data() as LocalRules) : { regions: [] },
      }
    } catch (err) {
      this.logger.error('subsidy getRules 오류:', err)
      throw new InternalServerErrorException('지원금 규칙을 불러오는 중 오류가 발생했습니다')
    }
  }

  async getProfile(uid: string) {
    try {
      const doc = await this.firebase.collection('subsidy_profiles').doc(uid).get()
      if (!doc.exists) return { ...emptySubsidyProfile, userId: uid }
      return { id: doc.id, ...doc.data() }
    } catch (err) {
      this.logger.error('subsidy getProfile 오류:', err)
      throw new InternalServerErrorException('지원금 프로필을 불러오는 중 오류가 발생했습니다')
    }
  }

  async saveProfile(uid: string, dto: SaveSubsidyProfileDto) {
    try {
      const record = {
        ...dto,
        userId: uid,
        updatedAt: new Date().toISOString(),
      }
      await this.firebase.collection('subsidy_profiles').doc(uid).set(record, { merge: true })
      return this.getProfile(uid)
    } catch (err) {
      this.logger.error('subsidy saveProfile 오류:', err)
      throw new InternalServerErrorException('지원금 프로필을 저장하는 중 오류가 발생했습니다')
    }
  }

  // 회차별 신청 진행 상태 갱신 — 본인 시술 일정에만 기록할 수 있다.
  // Firestore merge 로 applications.<scheduleId> 만 부분 갱신하며, null 은 해당 단계를 미완료로 되돌린다.
  async updateApplication(uid: string, scheduleId: string, dto: UpdateSubsidyApplicationDto) {
    const scheduleDoc = await this.firebase.collection('treatment_schedules').doc(scheduleId).get()
    if (!scheduleDoc.exists) throw new NotFoundException('시술 일정을 찾을 수 없습니다')
    if (scheduleDoc.data()?.userId !== uid) throw new ForbiddenException('본인 일정에만 기록할 수 있습니다')

    try {
      const patch: Record<string, unknown> = { scheduleId, updatedAt: new Date().toISOString() }
      for (const key of ['noticeIssuedAt', 'procedureDoneAt', 'claimSubmittedAt', 'docsChecked'] as const) {
        if (dto[key] !== undefined) patch[key] = dto[key]
      }
      await this.firebase.collection('subsidy_profiles').doc(uid).set(
        {
          userId: uid,
          applications: { [scheduleId]: patch },
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
      return this.getProfile(uid)
    } catch (err) {
      this.logger.error('subsidy updateApplication 오류:', err)
      throw new InternalServerErrorException('지원금 신청 진행 상태를 저장하는 중 오류가 발생했습니다')
    }
  }

  async addCalculation(uid: string, dto: AddSubsidyCalculationDto) {
    try {
      const docRef = this.firebase.collection('subsidy_profiles').doc(uid)
      const doc = await docRef.get()
      const existing = doc.exists ? ((doc.data() as any)?.calculations ?? []) : []

      const entry = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        procedure: dto.procedure,
        extras: dto.extras ?? [],
        estimatedTotal: dto.estimatedTotal,
        linkedScheduleId: dto.linkedScheduleId ?? null,
      }

      await docRef.set(
        {
          userId: uid,
          calculations: [...existing, entry],
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      return entry
    } catch (err) {
      this.logger.error('subsidy addCalculation 오류:', err)
      throw new InternalServerErrorException('지원금 계산 결과를 저장하는 중 오류가 발생했습니다')
    }
  }
}
