import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const PINK  = '#ff8fab'
const MUTED = '#c4a0ae'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PINK,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#ffd6e0',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'Pretendard-SemiBold',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) =>
            <TabIcon name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: '캘린더',
          tabBarIcon: ({ color, size }) =>
            <TabIcon name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community/index"
        options={{
          title: '이야기방',
          tabBarIcon: ({ color, size }) =>
            <TabIcon name="people-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'AI 상담',
          tabBarIcon: ({ color, size }) =>
            <TabIcon name="chatbubble-ellipses-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
