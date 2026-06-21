import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import {
  Modal, View, Text, TouchableOpacity, Linking,
  StyleSheet, Platform,
} from 'react-native'
import { initPurchases, addCustomerInfoListener, ENTITLEMENT_ID } from '../lib/purchases'
import { useUserStore, versionApi } from '@fertility/shared'
import Constants from 'expo-constants'

SplashScreen.preventAutoHideAsync()

type UpdateStatus = 'force' | 'optional' | null

export default function RootLayout() {
  const setPremium = useUserStore(s => s.setPremium)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(null)
  const [storeUrl, setStoreUrl] = useState('')
  const [updateMessage, setUpdateMessage] = useState('')

  useEffect(() => {
    initPurchases().catch(() => {})
    const remove = addCustomerInfoListener(info => {
      const isActive = !!info.entitlements.active[ENTITLEMENT_ID]
      setPremium(isActive)
    })
    return remove
  }, [])

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const version = Constants.expoConfig?.version ?? '1.0.0'
        const platform = Platform.OS === 'ios' ? 'ios' : 'android'
        const res: any = await versionApi.check(version, platform)
        if (res.status === 'force' || res.status === 'optional') {
          setUpdateStatus(res.status)
          setStoreUrl(platform === 'ios' ? res.storeUrl.ios : res.storeUrl.android)
          setUpdateMessage(res.message || '새로운 업데이트가 있어요.')
        }
      } catch {
        // 버전 체크 실패는 무시하고 앱 진입 허용
      }
    }
    checkVersion()
  }, [])

  const [loaded, error] = useFonts({
    'Pretendard-Regular':  require('../assets/fonts/PretendardStd-Regular.ttf'),
    'Pretendard-Medium':   require('../assets/fonts/PretendardStd-Medium.ttf'),
    'Pretendard-SemiBold': require('../assets/fonts/PretendardStd-SemiBold.ttf'),
    'Pretendard-Bold':     require('../assets/fonts/PretendardStd-Bold.ttf'),
  })

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync()
  }, [loaded, error])

  if (!loaded && !error) return null

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login/index" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="records/index" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="subscription/index" />
      </Stack>

      {/* 강제 업데이트 — 닫기 불가 */}
      <Modal visible={updateStatus === 'force'} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.emoji}>🌸</Text>
            <Text style={styles.title}>업데이트가 필요해요</Text>
            <Text style={styles.message}>{updateMessage}</Text>
            <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(storeUrl)}>
              <Text style={styles.buttonText}>업데이트하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 선택 업데이트 — 닫기 가능 */}
      <Modal visible={updateStatus === 'optional'} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.emoji}>✨</Text>
            <Text style={styles.title}>새 버전이 출시됐어요</Text>
            <Text style={styles.message}>{updateMessage}</Text>
            <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(storeUrl)}>
              <Text style={styles.buttonText}>업데이트하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.later} onPress={() => setUpdateStatus(null)}>
              <Text style={styles.laterText}>나중에</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const PINK = '#ff8fab'
const DARK_ROSE = '#5a3042'

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: {
    fontSize: 18,
    fontFamily: 'Pretendard-Bold',
    color: DARK_ROSE,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: PINK,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Pretendard-SemiBold',
  },
  later: { paddingVertical: 10 },
  laterText: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    color: '#aaa',
  },
})
