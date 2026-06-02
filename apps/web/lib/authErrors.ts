/**
 * Firebase Auth 에러 코드 → 사용자 친화적 한국어 메시지 변환
 */
export function getAuthErrorMessage(error: any): string {
  const code: string = error?.code ?? ''

  switch (code) {
    // 로그인 관련
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return '이메일 또는 비밀번호가 올바르지 않아요. 처음이시라면 아래 회원가입을 해주세요.'

    case 'auth/invalid-email':
      return '올바른 이메일 형식을 입력해 주세요.'

    case 'auth/user-disabled':
      return '이용이 제한된 계정이에요. 문의해 주세요.'

    case 'auth/too-many-requests':
      return '로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.'

    // 회원가입 관련
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일이에요. 로그인을 해주세요.'

    case 'auth/weak-password':
      return '비밀번호는 최소 6자 이상이어야 해요.'

    case 'auth/operation-not-allowed':
      return '현재 지원하지 않는 로그인 방식이에요.'

    // 네트워크
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인해 주세요.'

    default:
      return '오류가 발생했어요. 잠시 후 다시 시도해 주세요.'
  }
}
