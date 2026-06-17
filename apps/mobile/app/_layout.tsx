import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { initPurchases, addCustomerInfoListener, ENTITLEMENT_ID } from '../lib/purchases'
import { useUserStore } from '@fertility/shared'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const setPremium = useUserStore(s => s.setPremium)

  useEffect(() => {
    initPurchases().catch(() => {})
    const remove = addCustomerInfoListener(info => {
      const isActive = !!info.entitlements.active[ENTITLEMENT_ID]
      setPremium(isActive)
    })
    return remove
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login/index" />
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="records/index" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="subscription/index" />
    </Stack>
  )
}
