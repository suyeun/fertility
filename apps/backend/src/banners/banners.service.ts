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
}

@Injectable()
export class BannersService {
  constructor(private readonly firebase: FirebaseService) {}

  /// 활성 배너 목록 — 관리자 사이트가 쓰는 `banners` 컬렉션을 읽는다.
  /// 컬렉션이 작으므로 복합 인덱스 없이 메모리에서 필터/정렬한다.
  async getActive(position: string): Promise<EventBanner[]> {
    const snap = await this.firebase.db.collection('banners').get()
    return snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          title: (data.title as string) || '',
          subTitle: (data.subTitle as string) || '',
          imageUrl: (data.imageUrl as string) || '',
          linkUrl: (data.linkUrl as string) || '',
          position: ((data.position as string) || 'home') as EventBanner['position'],
          order: Number(data.order) || 1,
          bgColor: (data.bgColor as string) || '',
          isActive: data.isActive !== false,
        }
      })
      .filter((b) => b.isActive && b.position === position)
      .sort((a, b) => a.order - b.order)
      .map(({ isActive: _isActive, ...banner }) => banner)
  }
}
