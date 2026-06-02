function djb2(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) + str.charCodeAt(i)) & 0x7fffffff
  }
  return h
}

const ADJ = ['조용한', '따뜻한', '봄날의', '다정한', '포근한', '설레는', '반짝이는', '차분한', '소중한', '은은한']
const NOUN = ['나비', '꽃잎', '달빛', '이슬', '새벽', '씨앗', '별빛', '봄비', '햇살', '새싹']

/**
 * uid → 8자 단방향 토큰 (작성자 식별 전용, 화면 미표시)
 */
export function makeAuthorToken(uid: string): string {
  return djb2(uid + '__secret__').toString(36).substring(0, 8)
}

/**
 * (uid + seed) → 한글 익명 닉네임
 * seed에 postId를 넣으면 포스트마다 다른 이름 부여
 */
export function makeAnonName(uid: string, seed: string): string {
  const h = djb2(uid + seed)
  const adj = ADJ[h % ADJ.length]
  const noun = NOUN[Math.floor(h / ADJ.length) % NOUN.length]
  const num = (h % 900) + 100
  return `${adj}${noun}_${num}`
}
