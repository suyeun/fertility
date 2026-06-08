import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, BackHandler,
} from 'react-native'
import { useEffect } from 'react'
import type { VersionStatus } from '../lib/useVersionCheck'

const PINK = '#ff8fab'
const DARK_ROSE = '#5a3042'
const MUTED = '#b07080'
const BORDER = '#ffd6e0'

interface Props {
  status: VersionStatus
  message: string
  onUpdate: () => void   // 스토어로 이동
  onLater?: () => void   // 선택 업데이트만 표시 (강제일 땐 undefined)
}

export default function UpdateModal({ status, message, onUpdate, onLater }: Props) {
  const visible = status === 'force' || status === 'optional'
  const isForce = status === 'force'

  // 강제 업데이트일 때 안드로이드 뒤로가기 막기
  useEffect(() => {
    if (!isForce) return
    const handler = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => handler.remove()
  }, [isForce])

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // 강제 업데이트: 바깥 터치로 닫기 불가
      onRequestClose={isForce ? undefined : onLater}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          {/* 아이콘 */}
          <Text style={s.emoji}>🌸</Text>

          {/* 타이틀 */}
          <Text style={s.title}>
            {isForce ? '업데이트가 필요해요' : '새 버전이 출시됐어요'}
          </Text>

          {/* 메시지 */}
          <Text style={s.message}>
            {message || (isForce
              ? '이 버전은 더 이상 지원되지 않아요.\n계속 사용하려면 업데이트해 주세요.'
              : '더 나은 루네라를 경험해보세요.'
            )}
          </Text>

          {/* 강제일 때 안내 */}
          {isForce && (
            <View style={s.forceNotice}>
              <Text style={s.forceNoticeText}>
                ⚠️ 업데이트 후 앱을 사용할 수 있어요
              </Text>
            </View>
          )}

          {/* 버튼 */}
          <TouchableOpacity style={s.updateBtn} onPress={onUpdate} activeOpacity={0.85}>
            <Text style={s.updateBtnText}>
              {isForce ? '지금 업데이트하기' : '업데이트하기'}
            </Text>
          </TouchableOpacity>

          {/* 선택 업데이트만: 나중에 버튼 */}
          {!isForce && onLater && (
            <TouchableOpacity style={s.laterBtn} onPress={onLater} activeOpacity={0.7}>
              <Text style={s.laterBtnText}>나중에 할게요</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(90,48,66,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#5a3042',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  emoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_ROSE,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  forceNotice: {
    backgroundColor: '#fff0f4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  forceNoticeText: {
    fontSize: 11,
    color: PINK,
    fontWeight: '600',
    textAlign: 'center',
  },
  updateBtn: {
    width: '100%',
    backgroundColor: PINK,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  laterBtn: {
    paddingVertical: 10,
  },
  laterBtnText: {
    fontSize: 13,
    color: MUTED,
    textDecorationLine: 'underline',
  },
})
