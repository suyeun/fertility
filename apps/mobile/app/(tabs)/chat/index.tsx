// apps/mobile/app/chat/index.tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native'
import { router } from 'expo-router'

const PINK = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED = '#b07080'
const LIGHT_PINK = '#fff0f4'
const BORDER = '#ffd6e0'

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 뒤로가기 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>

        {/* 준비중 콘텐츠 */}
        <View style={styles.content}>
          <Image
            source={require('../../../assets/clay_chat_bubble.png')}
            style={styles.image}
          />
          <Text style={styles.title}>AI 파트너 봄이</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>서비스 준비중</Text>
          </View>
          <Text style={styles.desc}>
            임신 준비 전 과정을 함께할{'\n'}AI 채팅 서비스를 준비하고 있어요.
          </Text>
          <Text style={styles.sub}>
            수치 해석, 시술 Q&A, 감정 지지까지{'\n'}곧 만나요 💕
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fffbfc' },
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { paddingVertical: 16 },
  backText: { fontSize: 20, color: MUTED },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 60,
  },
  image: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: DARK_ROSE },
  badge: {
    backgroundColor: LIGHT_PINK,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: PINK },
  desc: {
    fontSize: 15,
    color: DARK_ROSE,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
  },
  sub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },
})
