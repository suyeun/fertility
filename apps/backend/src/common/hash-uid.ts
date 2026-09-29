import * as crypto from 'crypto'

/// 커뮤니티 작성자 익명 토큰 — uid 를 되돌릴 수 없게 해시한다.
/// community.service 와 계정 삭제(작성 글 익명화)에서 같은 값을 써야 하므로 한 곳에 둔다.
export const hashUid = (uid: string) =>
  crypto.createHash('sha256').update(uid + 'bom_salt').digest('hex').substring(0, 8)
