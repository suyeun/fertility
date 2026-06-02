// apps/mobile/app/chat/index.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { router } from 'expo-router'
import { aiApi, usersApi } from '@fertility/shared'
import type { AIChatMessage, UserProfile } from '@fertility/shared'

const PINK = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED = '#b07080'
const BORDER = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'
const BG = '#fffbfc'


// ============================================================
// 추천 질문 목록
// ============================================================
const SUGGESTED = [
  'AMH 수치가 낮으면 어떤 의미인가요?',
  '배란일 예측 방법을 알려주세요',
  'IVF 시술 과정이 궁금해요',
  '기초체온 기록 방법이 뭔가요?',
  '착상 성공 신호가 있나요?',
]

export default function ChatScreen() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { loadStoredToken, loadUser } = await import('../../lib/auth')
        const token = await loadStoredToken()
        if (!token) { router.replace('/login' as any); return }
        const u = await loadUser()
        if (!u) { router.replace('/login' as any); return }
        setUser(u)
        const p = await usersApi.getProfile()
        setProfile(p)
        const history = await aiApi.getHistory()
        if (history?.length > 0) setMessages(history)
      } catch {}
    }
    init()
  }, [])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    const userMsg: AIChatMessage = { role: 'user', content: trimmed, timestamp: new Date().toISOString() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setIsStreaming(true)
    scrollToBottom()

    const assistantMsg: AIChatMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, assistantMsg])

    try {
      let accumulated = ''
      await aiApi.streamChat(
        nextMessages.map(m => ({ role: m.role, content: m.content })),
        (token) => {
          accumulated += token
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: accumulated, timestamp: assistantMsg.timestamp }
            return updated
          })
          scrollToBottom()
        }
      )
      const finalHistory = [...nextMessages, { role: 'assistant' as const, content: accumulated, timestamp: assistantMsg.timestamp }]
      await aiApi.saveHistory(finalHistory).catch(() => {})
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '잠시 연결이 어려워요. 다시 시도해 주세요 💕',
          timestamp: assistantMsg.timestamp,
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      scrollToBottom()
    }
  }, [messages, isStreaming, user, scrollToBottom])

  const clearHistory = useCallback(async () => {
    setMessages([])
    await aiApi.saveHistory([]).catch(() => {})
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🌸 AI 파트너</Text>
          <Text style={styles.headerSub}>봄이 — 임신 준비 AI</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
            <Text style={styles.clearText}>초기화</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {/* 빈 화면 — 웰컴 + 추천 질문 */}
          {messages.length === 0 && (
            <View style={styles.welcome}>
              <Text style={styles.welcomeEmoji}>🌸</Text>
              <Text style={styles.welcomeTitle}>안녕하세요{profile?.name ? `, ${profile.name}님` : ''}!</Text>
              <Text style={styles.welcomeDesc}>
                임신 준비 중 궁금한 것들을{'\n'}편하게 물어보세요 💕
              </Text>
              <Text style={styles.welcomeNote}>
                ※ AI 답변은 참고용이며 의료 상담을 대체하지 않습니다.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTED.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => sendMessage(q)}
                  >
                    <Text style={styles.suggestionText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 메시지 목록 */}
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user'
            const isLast = idx === messages.length - 1
            return (
              <View
                key={idx}
                style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}
              >
                {!isUser && (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>🌸</Text>
                  </View>
                )}
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
                  {isStreaming && isLast && !isUser && msg.content === '' ? (
                    <ActivityIndicator size="small" color={MUTED} />
                  ) : (
                    <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
                      {msg.content}
                      {isStreaming && isLast && !isUser && (
                        <Text style={styles.cursor}>▍</Text>
                      )}
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
        </ScrollView>

        {/* 입력창 */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="궁금한 점을 물어보세요..."
            placeholderTextColor="#d4a0b0"
            multiline
            maxLength={500}
            editable={!isStreaming}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isStreaming) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#fff',
  },
  backBtn: { paddingRight: 12 },
  backText: { fontSize: 20, color: MUTED },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: DARK_ROSE },
  headerSub: { fontSize: 10, color: MUTED, marginTop: 1 },
  clearBtn: { paddingLeft: 12 },
  clearText: { fontSize: 11, color: MUTED },

  messageList: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 8 },

  welcome: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  welcomeEmoji: { fontSize: 48, marginBottom: 12 },
  welcomeTitle: { fontSize: 18, fontWeight: '700', color: DARK_ROSE, marginBottom: 6 },
  welcomeDesc: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  welcomeNote: { fontSize: 10, color: '#d4a0b0', marginTop: 8, textAlign: 'center' },
  suggestions: { marginTop: 20, width: '100%', gap: 8 },
  suggestionChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionText: { fontSize: 13, color: DARK_ROSE, fontWeight: '500' },

  msgRow: { flexDirection: 'row', marginBottom: 12, maxWidth: '85%' },
  msgRowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  msgRowAssistant: { alignSelf: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LIGHT_PINK,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  avatarText: { fontSize: 16 },

  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  bubbleUser: { backgroundColor: PINK },
  bubbleAssistant: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: '#fff', fontWeight: '500' },
  bubbleTextAssistant: { color: DARK_ROSE },
  cursor: { color: PINK },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#fff',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: LIGHT_PINK,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: DARK_ROSE,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PINK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: BORDER },
  sendIcon: { fontSize: 18, color: '#fff', fontWeight: '700' },
})
