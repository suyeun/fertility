import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
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
