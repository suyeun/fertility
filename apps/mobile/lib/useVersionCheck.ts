import { useEffect, useState } from 'react'
import { Platform, Linking, Alert } from 'react-native'
import { versionApi } from '@fertility/shared'

// 현재 앱 버전 — EAS 빌드 시 app.json의 version과 동기화
const APP_VERSION = '1.0.0'

export type VersionStatus = 'force' | 'optional' | 'ok' | 'idle'

interface VersionCheckResult {
  status: VersionStatus
  message: string
  storeUrl: string
}

export function useVersionCheck() {
  const [result, setResult] = useState<VersionCheckResult>({
    status: 'idle',
    message: '',
    storeUrl: '',
  })

  useEffect(() => {
    checkVersion()
  }, [])

  const checkVersion = async () => {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android'
      const res = await versionApi.check(APP_VERSION, platform)
      setResult({
        status: res.status,
        message: res.message,
        storeUrl: platform === 'ios' ? res.storeUrl.ios : res.storeUrl.android,
      })
    } catch {
      // 버전 체크 실패 시 조용히 무시 (앱 사용 차단하지 않음)
      setResult({ status: 'ok', message: '', storeUrl: '' })
    }
  }

  const openStore = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('오류', '스토어를 열 수 없어요. 직접 앱스토어에서 검색해 주세요.')
    })
  }

  return { result, openStore }
}
