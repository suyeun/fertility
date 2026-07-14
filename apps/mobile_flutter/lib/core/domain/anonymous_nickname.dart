/// Port of packages/shared/lib/anonymousNickname.ts — deterministic
/// uid-derived tokens/nicknames for anonymous community posting.
int _djb2(String str) {
  var h = 5381;
  for (var i = 0; i < str.length; i++) {
    h = (((h << 5) + h) + str.codeUnitAt(i)) & 0x7fffffff;
  }
  return h;
}

const _adj = [
  '조용한',
  '따뜻한',
  '봄날의',
  '다정한',
  '포근한',
  '설레는',
  '반짝이는',
  '차분한',
  '소중한',
  '은은한',
];
const _noun = ['나비', '꽃잎', '달빛', '이슬', '새벽', '씨앗', '별빛', '봄비', '햇살', '새싹'];

String _toRadix36(int value) {
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  if (value == 0) return '0';
  var v = value;
  final buf = StringBuffer();
  while (v > 0) {
    buf.write(digits[v % 36]);
    v ~/= 36;
  }
  return buf.toString().split('').reversed.join();
}

/// uid → 8자 단방향 토큰 (작성자 식별 전용, 화면 미표시)
String makeAuthorToken(String uid) {
  final radix = _toRadix36(_djb2('${uid}__secret__'));
  return radix.length > 8 ? radix.substring(0, 8) : radix;
}

/// (uid + seed) → 한글 익명 닉네임. seed에 postId를 넣으면 포스트마다 다른 이름 부여.
String makeAnonName(String uid, String seed) {
  final h = _djb2(uid + seed);
  final adj = _adj[h % _adj.length];
  final noun = _noun[(h ~/ _adj.length) % _noun.length];
  final num = (h % 900) + 100;
  return '$adj${noun}_$num';
}
