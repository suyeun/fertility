import { Injectable } from '@nestjs/common'
import { FirebaseService } from '../firebase/firebase.service'

export type VersionStatus = 'force' | 'optional' | 'ok'

export interface VersionCheckResponse {
  status: VersionStatus
  latestVersion: string
  minRequiredVersion: string
  message: string
  storeUrl: {
    ios: string
    android: string
  }
}

// 버전 비교: '1.2.0' vs '1.1.0' → 1 (앞이 크면 양수, 같으면 0, 작으면 음수)
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

@Injectable()
export class AppVersionService {
  constructor(private readonly firebase: FirebaseService) {}

  async checkVersion(
    currentVersion: string,
    platform: 'ios' | 'android',
  ): Promise<VersionCheckResponse> {
    const db = this.firebase.db

    // Firestore: config/appVersion 문서에서 설정값 읽기
    const doc = await db.collection('config').doc('appVersion').get()

    // 문서가 없으면 기본값(통과) 반환
    if (!doc.exists) {
      return {
        status: 'ok',
        latestVersion: currentVersion,
        minRequiredVersion: currentVersion,
        message: '',
        storeUrl: {
          ios: 'https://apps.apple.com/app/lunera',
          android: 'https://play.google.com/store/apps/details?id=com.lunera.app',
        },
      }
    }

    const data = doc.data()!
    const platformData = data[platform] || {}
    const latestVersion: string = platformData.latestVersion || currentVersion
    const minRequiredVersion: string = platformData.minRequiredVersion || '1.0.0'
    const message: string = data.message || '새로운 업데이트가 있어요.'
    const storeUrl = data.storeUrl || {
      ios: 'https://apps.apple.com/app/lunera',
      android: 'https://play.google.com/store/apps/details?id=com.lunera.app',
    }

    let status: VersionStatus = 'ok'

    if (compareVersions(currentVersion, minRequiredVersion) < 0) {
      // 현재 버전 < 최소 요구 버전 → 강제 업데이트
      status = 'force'
    } else if (compareVersions(currentVersion, latestVersion) < 0) {
      // 현재 버전 < 최신 버전 → 선택 업데이트
      status = 'optional'
    }

    return { status, latestVersion, minRequiredVersion, message, storeUrl }
  }
}
