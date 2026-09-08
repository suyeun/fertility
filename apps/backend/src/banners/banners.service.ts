import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'

export interface EventBanner {
  id: string
  title: string
  subTitle: string
  imageUrl: string
  linkUrl: string
  position: 'home' | 'settings'
  order: number
  bgColor: string
  /// 'brand' = 일반 이벤트/제휴, 'hospital' = 의료기관 광고(항상 isAd=true, 의료광고 내용 규제 적용)
  advertiserType: 'brand' | 'hospital'
  hospitalId?: string
  /// true 면 앱이 "광고" 표시를 붙인다. 병원 배너는 저장값과 무관하게 강제 true.
  isAd: boolean
  startAt?: string  // YYYY-MM-DD
  endAt?: string    // YYYY-MM-DD (포함)
}

function todayKst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/// 게재 기간 안인지 — 기간이 비어 있으면 상시 노출.
export function isWithinPeriod(startAt: string | undefined, endAt: string | undefined, today: string): boolean {
  if (startAt && today < startAt) return false
  if (endAt && today > endAt) return false
  return true
}

@Injectable()
export class BannersService {
  constructor(private readonly firebase: FirebaseService) {}

  /// 활성 배너 목록 — 관리자 사이트가 쓰는 `banners` 컬렉션을 읽는다.
  /// 컬렉션이 작으므로 복합 인덱스 없이 메모리에서 필터/정렬한다.
  async getActive(position: string): Promise<EventBanner[]> {
    const snap = await this.firebase.db.collection('banners').get()
    const today = todayKst()
    return snap.docs
      .map((d) => {
        const data = d.data()
        const advertiserType: EventBanner['advertiserType'] =
          data.advertiserType === 'hospital' ? 'hospital' : 'brand'
        return {
          id: d.id,
          title: (data.title as string) || '',
          subTitle: (data.subTitle as string) || '',
          imageUrl: (data.imageUrl as string) || '',
          linkUrl: (data.linkUrl as string) || '',
          position: ((data.position as string) || 'home') as EventBanner['position'],
          order: Number(data.order) || 1,
          bgColor: (data.bgColor as string) || '',
          advertiserType,
          hospitalId: (data.hospitalId as string) || undefined,
          isAd: advertiserType === 'hospital' || data.isAd === true,
          startAt: (data.startAt as string) || undefined,
          endAt: (data.endAt as string) || undefined,
          isActive: data.isActive !== false,
        }
      })
      .filter((b) => b.isActive && b.position === position && isWithinPeriod(b.startAt, b.endAt, today))
      .sort((a, b) => a.order - b.order)
      .map(({ isActive: _isActive, ...banner }) => banner)
  }
}
