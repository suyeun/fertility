// apps/mobile/app/login/index.tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { authApi } from '@fertility/shared'
import { loadStoredToken, saveUser } from '../../lib/auth'
import { setToken } from '@fertility/shared'
import { registerPushToken } from '../../lib/notifications'

const PINK = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED = '#b07080'
const BORDER = '#ffd6e0'
const LIGHT_PINK = '#fff0f4'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')

  const handleSubmit = async () => {
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해 주세요.')
      return
    }
    if (isSignup && !name.trim()) {
      setError('이름을 입력해 주세요.')
      return
    }

    setLoading(true)
    try {
      let res: any
      if (isSignup) {
        res = await authApi.signup({ email: email.trim(), password, name: name.trim() })
      } else {
        res = await authApi.login(email.trim(), password)
      }
      setToken(res.access_token)
      await saveUser(res.uid, res.email)
      // JWT 세팅 직후 토큰 등록 — 실패해도 로그인은 계속 진행
      registerPushToken().catch(() => {})
      router.replace('/')
    } catch (e: any) {
      setError(e.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.logo}>🌸</Text>
          <Text style={styles.title}>BOM</Text>
          <Text style={styles.subtitle}>임신 준비 AI 파트너</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {isSignup && (
            <TextInput
              style={styles.input}
              placeholder="이름"
              placeholderTextColor="#d4a0b0"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#d4a0b0"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="비밀번호 (6자 이상)"
            placeholderTextColor="#d4a0b0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>{isSignup ? '회원가입' : '로그인'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsSignup(v => !v); setError(null) }}>
            <Text style={styles.toggle}>
              {isSignup ? '이미 계정이 있으신가요? 로그인' : '아직 계정이 없으신가요? 회원가입'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fffbfc' },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  logo: { fontSize: 52, textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: DARK_ROSE, textAlign: 'center' },
  subtitle: { fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 16 },
  errorBox: { backgroundColor: '#fff0f0', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { fontSize: 12, color: '#b91c1c' },
  input: {
    backgroundColor: LIGHT_PINK, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: DARK_ROSE, borderWidth: 1, borderColor: BORDER,
  },
  btn: {
    backgroundColor: PINK, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  toggle: { color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 8 },
})
