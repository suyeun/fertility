import { Injectable, Logger } from '@nestjs/common'
import { FieldValue } from 'firebase-admin/firestore'
import { FirebaseService } from '../firebase/firebase.service'
import { AdEventDto } from './dto/ad-event.dto'

/// 광고 노출·클릭 집계.
///
/// 설계 원칙 (의료법 27조3항 환자 유인·알선 회피, 개인정보보호법 민감정보 보호):
/// - 사용자 ID, 기기 ID, IP 를 저장하지 않는다. 문서는 `YYYY-MM-DD_target_targetId` 하나에 카운트만 누적.
/// - 이 수치는 광고주 리포트용이며 과금과 연동되지 않는다(정액 광고).
@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name)

  constructor(private firebase: FirebaseService) {}

  async record(dto: AdEventDto): Promise<void> {
    const day = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) // KST 일자
    const docId = `${day}_${dto.target}_${dto.targetId}`
    const field = dto.type === 'click' ? 'clicks' : 'impressions'
    try {
      await this.firebase.db.collection('ad_stats').doc(docId).set(
        {
          day,
          target: dto.target,
          targetId: dto.targetId,
          [field]: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
    } catch (err) {
      // 집계 실패는 사용자 경험에 영향을 주지 않는다 — 로그만 남기고 200 을 돌려준다.
      this.logger.warn(`ad_stats 기록 실패 (${docId}): ${err}`)
    }
  }

  /// 기간·대상별 합계 — 관리자 리포트용. from/to 는 YYYY-MM-DD.
  async summarize(params: { target?: string; targetId?: string; from: string; to: string }) {
    let query: FirebaseFirestore.Query = this.firebase.db
      .collection('ad_stats')
      .where('day', '>=', params.from)
      .where('day', '<=', params.to)
    const snap = await query.get()

    const rows = snap.docs
      .map((d) => d.data())
      .filter((r) => (!params.target || r.target === params.target) && (!params.targetId || r.targetId === params.targetId))

    const byTarget = new Map<string, { target: string; targetId: string; impressions: number; clicks: number }>()
    for (const r of rows) {
      const key = `${r.target}_${r.targetId}`
      const acc = byTarget.get(key) ?? { target: r.target, targetId: r.targetId, impressions: 0, clicks: 0 }
      acc.impressions += Number(r.impressions) || 0
      acc.clicks += Number(r.clicks) || 0
      byTarget.set(key, acc)
    }
    return {
      from: params.from,
      to: params.to,
      items: [...byTarget.values()].sort((a, b) => b.impressions - a.impressions),
    }
  }
}
