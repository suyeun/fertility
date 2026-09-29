# 🌸 BOM (봄) — 임신 준비 AI 파트너

임신을 준비하는 여성을 위한 올인원 앱. 생리 주기 추적, 호르몬 수치 기록, 시술 일정 관리, AI 상담을 하나의 앱에서 제공합니다.

---

## 프로젝트 구조

```
fertility-app/
├── apps/
│   ├── web/            ← Next.js 14 (랜딩 페이지 + 공개 지원금 계산기, 서비스 화면은 동결)
│   ├── mobile_flutter/ ← Flutter (iOS + Android)
│   └── backend/        ← NestJS API 서버 (포트 3001)
└── packages/
    └── shared/     ← 공유 타입 + API 클라이언트
```

---

## 1. 의존성 설치

```bash
# 루트에서 전체 워크스페이스 한 번에 설치
npm install
```

---

## 2. 환경 변수 설정

### 백엔드 (`apps/backend/.env`)

```bash
cp apps/backend/.env.example apps/backend/.env
```

```env
PORT=3001

# JWT (반드시 변경)
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d

# Firebase Admin (서비스 계정)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...
```

> **Firebase 서비스 계정 키 발급**  
> Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → JSON 파일에서 값 복사

### 웹 (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api   # 지원금 규칙 조회에만 사용
NEXT_PUBLIC_APP_STORE_URL=                      # 비어 있으면 "출시 준비 중" 표시
NEXT_PUBLIC_PLAY_STORE_URL=
```

> 웹은 2026-09부터 **랜딩 페이지 + 공개 지원금 계산기**만 제공합니다. 로그인·기록·일정·커뮤니티·AI 채팅 등 서비스 화면은 모바일 앱으로 이전됐고, 기존 경로는 `/`로 리다이렉트됩니다.

### 모바일 (Flutter — `--dart-define`)

Flutter 앱은 `.env` 파일 대신 빌드 시점의 `--dart-define`으로 API 주소를 주입합니다.

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

> 안드로이드 에뮬레이터는 `localhost` 대신 `10.0.2.2`를 사용하세요 (미지정 시 자동 처리됨).  
> 실기기 테스트 시 개발 PC의 로컬 IP 주소를 사용하세요.  
> 예: `--dart-define=API_BASE_URL=http://192.168.0.10:3001/api`

---

## 3. 개발 서버 실행

터미널 3개를 열어 각각 실행하세요.

```bash
# 터미널 1 — 백엔드 (NestJS)
npm run backend
# → http://localhost:3001/api

# 터미널 2 — 웹 (Next.js)
npm run web
# → http://localhost:3000

# 터미널 3 — 모바일 (Flutter)
cd apps/mobile_flutter
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

---

## 4. Firebase 설정 (처음 시작할 때)

1. [Firebase Console](https://console.firebase.google.com) → 새 프로젝트 생성
2. **Firestore Database** 생성 (테스트 모드로 시작)
3. **프로젝트 설정 → 서비스 계정** → 비공개 키 생성 → `apps/backend/.env`에 입력
4. `firestore.rules` 배포:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

---

## 4-1. 지원금 계산기 규칙 데이터 (Firestore `config`)

앱과 웹의 난임 시술 지원금 계산기는 Firestore `config` 컬렉션의 두 문서를 읽습니다.

| 문서 | 내용 |
|---|---|
| `config/subsidyNationalRules` | 국가 기준 — 시술별 회당 상한(`procedures`), 별도 지원 항목(`extras`), 총 지원 횟수(`totalLimit`) |
| `config/subsidyLocalRules` | 지자체 기준 — `regions[]` 에 지역별 상한 덮어쓰기(`overrides`)와 추가 지원(`additionalBenefits`) |

두 문서가 비어 있으면 계산기에 시술 목록이 나오지 않습니다. 관리자 콘솔(`apps/admin`)은 Firestore 클라이언트 SDK를 쓰는데 `firestore.rules`에 `config` 규칙이 없어 기본 거부되므로, **아래 시드 스크립트(Admin SDK)** 또는 Firebase Console에서만 기록할 수 있습니다.

```bash
# 1) 데이터 확인·수정: apps/backend/scripts/subsidy-rules.seed.json
# 2) 미리보기 (Firestore 접근 없음)
cd apps/backend && npm run seed:subsidy-rules -- --dry-run
# 3) 실제 기록 — apps/backend/.env 의 FIREBASE_* 가 가리키는 프로젝트에 씁니다
cd apps/backend && npm run seed:subsidy-rules
# 4) 확인
curl http://localhost:3001/api/subsidy/rules
```

- 시드 값은 보건복지부 난임부부 시술비 지원사업 **2024-11-01 개정 기준(만 44세 이하 상한)** 입니다. 배포 전 e보건소에서 최신 고시를 확인하고 `version`/`effectiveDate`를 갱신하세요.
- 시술 키는 앱이 기대하는 `ivf_fresh` · `ivf_frozen` · `iui` 세 개를 반드시 유지해야 합니다.
- 지자체는 17개 광역 시·도 뼈대만 들어 있습니다. 지역별 추가 지원을 채운 뒤 `lastVerified`에 확인일(`YYYY-MM-DD`)을 적으면 앱의 "6개월 이상 경과" 경고가 사라집니다. 6개월이 지나면 다시 경고가 뜨므로 반년마다 재확인하세요.
- 스크립트는 문서를 통째로 덮어씁니다. Firebase Console에서 직접 고친 값이 있으면 JSON에도 반영해두세요.

---

## 4-5. 처방표 스캔 (사진 → 일정 초안)

캘린더 > **처방표 스캔**: 병원에서 받은 처방전·주사 일정표 사진을 찍으면 `POST /api/treatment/scan-schedule` 이 Claude(비전, `claude-opus-5-5`)로 약 이름·용량·날짜·시각·종류를 읽어 **초안**으로 돌려준다. 앱은 같은 약(이름·용량)을 한 일정 + 여러 투약 시각으로 묶어 확인 화면에 띄우고, 사용자가 날짜·시각·용량을 수정·체크한 뒤 등록 버튼을 눌러야 저장된다(자동 등록 없음). 확신도가 낮은 항목은 "확인 필요"로 표시한다.

- **개인정보**: 사진은 base64 로 요청에만 실리고 서버·로그·DB 에 저장하지 않는다(로그는 건수·소요시간만). 개인정보 처리방침에 "처방전 이미지의 분석 처리 위탁(Anthropic), 저장 없음" 항목을 추가해야 한다. iOS 카메라·사진 권한 문구는 `Info.plist` 에 있음.
- **설정**: 백엔드 `ANTHROPIC_API_KEY` 필수(없으면 503 안내). 요청 본문 한도 12MB(`main.ts`), 사용자당 분당 6회 제한. 앱은 긴 변 1600px·JPEG 80% 로 줄여 보낸다.
- **비용**: 사진 1장 ≈ 입력 2~3천 토큰 + 출력 1천 토큰 → 약 3~5센트.
- **횟수 정책**: 무료 사용자는 평생 2회, 프리미엄은 하루 20회(KST 기준 초기화). 성공한 분석만 센다. 서버가 `users/{uid}.scanFreeUsed / scanDailyUsed / scanDailyDate` 로 관리하고 `GET /api/treatment/scan-quota` 로 잔여 횟수를 내려준다. 초과 시 403 + `code: SCAN_FREE_LIMIT | SCAN_DAILY_LIMIT` — 앱은 무료 소진이면 페이월, 프리미엄 소진이면 안내를 띄운다.
- **유료 경계**: 약물 알림이 붙는 저장은 프리미엄(기존 게이트). 무료는 첫 일정 1건·약물 없음만.
- 카카오 알림톡 연동은 후속 과제(푸시로 먼저 출시).

---

## 4-4. 계정 삭제 · 커뮤니티 신고/차단 · 관리자 권한

- **계정 삭제** `DELETE /api/users/me` (본문 `{ password }`): 비밀번호 재확인 → 배우자 연결 해제(상대 기록 유지) → 주기·수치·시술 일정·메모·예약 알림·지원금 프로필·푸시 토큰 삭제 → 커뮤니티 글·댓글은 "탈퇴한 사용자"로 익명화 → 사용자 문서 삭제. 앱: 설정 > 계정 > 회원 탈퇴. 스토어 구독은 앱이 해지할 수 없어 안내만 한다.
- **신고** `POST /api/community/posts/:id/report`, `POST /api/community/comments/:id/report` (`reason`: spam·harassment·medical_misinfo·privacy·sexual·other, `detail` 선택). 서로 다른 신고자 3명이면 `isHidden` 으로 자동 숨김 후 관리자가 `community_reports` 에서 검토한다. 앱: 글 ⋯ 메뉴, 댓글 길게 누르기.
- **차단** `POST /api/community/block` (`postId` 또는 `commentId`) — 서버가 작성자 토큰을 `users/{uid}.blockedAuthorTokens` 에 저장하고 목록·댓글 조회에서 걸러낸다(토큰 비노출). 해제 `DELETE /api/community/block`, 앱: 설정 > 커뮤니티 차단 해제.
- **관리자 콘솔 권한**: `firestore.rules` 의 `isAdmin()` 은 Firebase Auth 커스텀 클레임 `admin=true` 를 본다. 부여: `cd apps/backend && npm run set-admin -- <콘솔 로그인 이메일>` 후 콘솔 재로그인. 배너·콘텐츠·앱설정·푸시 이력·병원(광고 계약)·아티클 쓰기, 사용자·광고 집계·신고 읽기가 관리자에게 열린다. 규칙 배포: `firebase deploy --only firestore:rules`.
- **Android 릴리스 서명**: `android/key.properties.example` 을 `key.properties` 로 복사해 채우면 릴리스 빌드가 그 키로 서명된다(없으면 디버그 키 + 경고). `*.jks`, `key.properties` 는 git 제외.
- **스토어 링크**: 백엔드 `APP_STORE_URL_IOS`, `APP_STORE_URL_ANDROID` (버전 체크 응답 기본값). `config/appVersion.storeUrl` 이 있으면 그 값 우선.

---

## 4-3. 임신 확인 모드

시술·자연임신 준비 사용자가 임신을 확인하면 `treatmentStage = 'pregnant'` 로 전환한다. 기획과 화면별 변화는 [docs/pregnancy-mode.md](docs/pregnancy-mode.md) 참고.

- 진입: 설정 > 현재 모드 > "임신을 확인했어요", 또는 홈(판정 대기 단계) 카드 → `/pregnancy-setup` 에서 주수 기준일(마지막 생리 시작일 또는 이식일+배아일수 환산) 입력
- 프로필 필드: `pregnancyLmpDate`, `pregnancyConfirmedAt` (다른 모드로 돌아가면 해제)
- 홈: 주수·출산 예정일·주수별 안내·다음 산전 검사, 임신·출산 지원 카드(`/birth-benefits`)
- 캘린더: 임신 요약 카드, 산전 진찰·초음파·검사 칩, 산전 검사 템플릿(`GET /api/treatment/templates` 의 `mode: 'pregnant'`)
- 기록: 기초체온·배란테스트기 카드 숨김, 체중·수면 중심
- 시술 기록 요약(`/treatment-summary`): 회차별 일정·약물·수치를 텍스트로 정리해 공유(산부인과 지참용, 자가 기록 명시)
- 지원 금액은 Firestore `config/birthBenefits` 문서에서 `GET /api/info/birth-benefits` 로 받는다(인증 불필요). 문서가 없거나 형식이 깨지면 백엔드 기본값, 서버 연결이 안 되면 앱 내 폴백을 쓰고 화면에 "저장된 기준 표시 중"을 붙인다.

```bash
# 금액·확인일 수정: apps/backend/scripts/birth-benefits.seed.json (verifiedAt 도 함께 갱신)
cd apps/backend && npm run seed:birth-benefits -- --dry-run   # 미리보기
cd apps/backend && npm run seed:birth-benefits                # 기록
curl http://localhost:3001/api/info/birth-benefits             # 확인 (source: config)
```

---

## 4-2. 병원 광고 · 배너 운영 원칙

정액(기간) 광고만 판매하고, 앱은 환자 정보를 병원에 전달하지 않으며, 광고는 항상 "광고"로 표시합니다. 근거 법령과 약관·계약서·처리방침 문안은 [docs/ad-policy.md](docs/ad-policy.md)에 정리했습니다. 관리자 콘솔 **배너 관리 > 병원 광고 계약** 표에서 계약 기간을 관리하고, **통계**에서 비식별 노출·클릭을 확인합니다.

---

## 5. 인앱결제 설정 (RevenueCat)

### 준비 순서

1. **[RevenueCat](https://app.revenuecat.com) 계정 생성** → 새 프로젝트 생성

2. **App Store Connect** (iOS) 에서 구독 상품 등록
   - 앱 내 구입 → 자동 갱신 구독 추가
   - 제품 ID: `bom_monthly` (월간), `bom_annual` (연간)

3. **Google Play Console** (Android) 에서 구독 상품 등록
   - 앱 내 상품 → 구독 추가
   - 제품 ID: `bom_monthly`, `bom_annual` (동일하게)

4. **RevenueCat 대시보드** 설정
   - Products에 위 제품 ID 등록
   - Offerings 생성 (current offering에 패키지 추가)
   - Entitlements 생성: ID = `bom_premium`
   - API Keys 탭에서 iOS/Android 키 복사

5. **환경변수 설정**

```bash
# 모바일 — flutter run/build 시 --dart-define으로 전달
--dart-define=RC_API_KEY_IOS=appl_xxxx
--dart-define=RC_API_KEY_ANDROID=goog_xxxx

# apps/backend/.env
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
```

6. **웹훅 등록** (RevenueCat 대시보드 → Webhooks)
   - URL: `https://your-api.com/api/payments/revenuecat`
   - Authorization Header: `.env`의 `REVENUECAT_WEBHOOK_SECRET` 값

---

### 결제 테스트 (샌드박스) 체크리스트

실제 카드 대신 스토어 샌드박스로 검증한다. 흐름: 스토어 샌드박스 → RevenueCat → `POST /api/payments/revenuecat` → Firestore `users.subscriptionStatus` → 앱 잠금 해제.

**준비**
- App Store Connect 유료 앱 계약(계약·세금·은행) 서명 — 미서명이면 상품 목록이 비어 온다
- Sandbox 테스터 계정 생성(App Store Connect → 사용자 및 액세스) 후 기기 설정 → App Store → 샌드박스 계정 로그인
- Play Console → 설정 → 라이선스 테스트에 테스터 Gmail 등록, 결제 권한 포함 빌드를 내부 테스트 트랙에 업로드
- RevenueCat 웹훅 설정의 "테스트 전송" → 백엔드 로그에 `TEST 이벤트 수신` 이 찍히면 URL·시크릿 정상 (401 이면 시크릿 불일치)

**시나리오**

| 시나리오 | 확인 |
|---|---|
| 월간·연간 신규 구매 | 결제 직후 홈·캘린더 잠금(2회차 일정, 약물 알림, 지원금 상세, 진행 관리 체크) 즉시 해제, Render 로그 `INITIAL_PURCHASE`, Firestore 문서 `active` |
| 무료 체험 → 자동 결제 | 페이월에 체험 기간 표시, 종료 후 `RENEWAL` 로 active 유지 (샌드박스: 월간 ≈ 5분, 연간 ≈ 1시간 주기로 갱신 후 자동 만료) |
| 취소 | 스토어 구독 관리에서 취소 → `CANCELLATION` → 만료 전 기능 유지, 만료 후 잠김 |
| 결제 실패 | 샌드박스 테스터 설정에서 결제 실패 강제 → `BILLING_ISSUE` 처리 |
| 구매 복원 | 앱 삭제·재설치 후 "구매 복원" 으로 권한 복구 |
| 다른 기기 | 같은 앱 계정으로 다른 기기 로그인 시 권한 유지 |

**운영 서버 주의**: `NODE_ENV=production` 에서는 샌드박스 웹훅을 무시한다(로그에 `샌드박스 이벤트 무시`). 운영 서버로 샌드박스 검증이 필요하면 `REVENUECAT_ALLOW_SANDBOX=true` 를 잠시 켠 뒤 끈다.

---

## 6. 배포

### 백엔드 — Render

#### 첫 배포 (대시보드)

1. [render.com](https://render.com) 가입 → **New Web Service**
2. GitHub 레포 연결
3. 아래 항목 입력:

| 항목 | 값 |
|---|---|
| Root Directory | *(비워두기 — 루트에서 빌드)* |
| Build Command | `npm ci && npm run build:shared && npm run build --workspace=apps/backend` |
| Start Command | `node apps/backend/dist/main.js` |
| Node Version | `20` |

4. **Environment Variables** 탭에서 입력:

```
NODE_ENV=production
JWT_SECRET=<랜덤 64자 문자열>
JWT_EXPIRES_IN=7d
FIREBASE_PROJECT_ID=<프로젝트 ID>
FIREBASE_CLIENT_EMAIL=<서비스 계정 이메일>
FIREBASE_PRIVATE_KEY=<서비스 계정 프라이빗 키 (줄바꿈 \n 포함)>
ANTHROPIC_API_KEY=sk-ant-...
REVENUECAT_WEBHOOK_SECRET=<임의 시크릿>
ALLOWED_ORIGINS=https://your-app.vercel.app
```

5. **Deploy** → 배포 완료 후 URL 복사 (예: `https://bom-backend.onrender.com`)

> ⚠️ 무료 플랜은 15분 비활성 시 슬립 → 첫 요청 30초 대기. 유료 전환 시 해소됨.

---

### 웹 — Vercel

#### 첫 배포 (대시보드)

1. [vercel.com](https://vercel.com) 가입 → **New Project**
2. GitHub 레포 연결
3. **Root Directory** → `apps/web` 설정
4. Framework Preset → **Next.js** (자동 감지)
5. **Environment Variables** 추가:

```
NEXT_PUBLIC_API_URL=https://bom-backend.onrender.com/api
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/...
NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/...
```

> 웹에는 더 이상 Anthropic API 키가 필요하지 않습니다 (AI 프록시 라우트 제거).

6. **Deploy** → 완료

이후 `main` 브랜치에 푸시하면 자동 재배포돼요.

---

### 모바일 — Flutter Build

```bash
cd apps/mobile_flutter

# Android — Google Play 제출용 (App Bundle)
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://bom-backend.onrender.com/api \
  --dart-define=RC_API_KEY_ANDROID=goog_xxxx

# iOS — App Store 제출용
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://bom-backend.onrender.com/api \
  --dart-define=RC_API_KEY_IOS=appl_xxxx
```

> 빌드 시 `API_BASE_URL`을 반드시 Render 서버 URL로 지정하세요 — 미지정 시 로컬 개발용 주소로 폴백됩니다.

---

## 6. API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 → JWT 발급 |
| GET | `/api/auth/me` | 내 정보 |
| GET/PATCH | `/api/users/profile` | 프로필 조회/수정 |
| DELETE | `/api/users/me` | 계정 삭제 (비밀번호 재확인) |
| POST | `/api/community/posts/:id/report`, `/api/community/comments/:id/report` | 신고 |
| POST/DELETE | `/api/community/block` | 작성자 차단 / 전체 해제 |
| GET/POST | `/api/cycles` | 생리 주기 |
| GET/POST/DELETE | `/api/hormones` | 호르몬 기록 |
| GET/POST/PATCH/DELETE | `/api/treatment` | 시술 일정 |
| GET | `/api/treatment/templates` | 회차 프로토콜 템플릿(예시 일정, `config/treatmentTemplates` 로 갱신 가능) |
| POST | `/api/treatment/scan-schedule` | 처방전·일정표 사진 분석 → 일정 초안 (이미지 미저장, 분당 6회) |
| GET | `/api/treatment/scan-quota` | 스캔 잔여 횟수 (무료 평생 2회 · 프리미엄 하루 20회) |
| GET/GET(:date)/POST/DELETE | `/api/daily-notes` | 캘린더 일별 메모·컨디션 (감정일기 대체, 날짜당 1건) |
| POST | `/api/ai/chat` | AI 채팅 (스트리밍) — 현재 호출하는 클라이언트 없음 (웹 동결, Flutter 미구현) |
| GET/POST | `/api/ai/history` | 채팅 히스토리 — 현재 호출하는 클라이언트 없음 |
| GET/POST | `/api/community/posts` | 커뮤니티 게시글 |
| POST | `/api/notifications/token` | FCM 토큰 등록 |
| GET | `/api/info/birth-benefits` | 임신·출산 지원 안내 (config/birthBenefits, 인증 불필요) |
| GET | `/api/banners` | 활성 배너 (게재 기간 필터, 병원 배너는 isAd=true) |
| POST | `/api/ads/events` | 광고 노출·클릭 비식별 집계 (인증 불필요, 분당 120회) |
| GET | `/api/ads/stats` | 기간별 광고 집계 합계 |
| GET | `/api/subsidy/rules` | 난임 시술 지원금 규칙(국가/지자체, 인증 불필요) |
| GET/PATCH | `/api/subsidy/profile` | 지원금 프로필(거주지·차수·체크리스트) |
| POST | `/api/subsidy/profile/calculations` | 지원금 계산 결과 저장 |
| PATCH | `/api/subsidy/applications/:scheduleId` | 회차별 지원금 신청 진행 상태 (통지서 발급 · 시술 완료 · 청구 완료 · 서류 체크) |

모든 엔드포인트는 `Authorization: Bearer <JWT>` 헤더 필요 (auth 제외).

---

## 6-1. 테스트

| 대상 | 명령 | 내용 |
|---|---|---|
| 백엔드 (Jest) | `npm run test:backend` 또는 `cd apps/backend && npm test` | 결제 웹훅 처리(샌드박스 무시·상태 전환), 배너 게재 기간, 병원 광고 계약 기간, 회차 템플릿 검증 |
| 공유 패키지 (Jest) | `npm run test:shared` | 주기 계산 등 |
| 모바일 (flutter test) | `cd apps/mobile_flutter && flutter test` | 지원금 계산·진행 관리, 회차 템플릿 초안, 프리미엄 게이트, 앱 부팅 |
| 전체 JS | `npm test` | shared + backend |

백엔드 테스트 파일은 `src/**/*.spec.ts` 이며 빌드(`tsconfig.json`)에서는 제외되고 `tsconfig.spec.json` 으로만 컴파일된다. 외부 의존(Firestore 등)은 가짜 객체로 대체하고 순수 로직만 검증한다.

---

## 7. 개발 현황

- [x] 회원가입 · 로그인 (JWT 기반)
- [x] 온보딩 (3단계)
- [x] 주기 캘린더
- [x] 대시보드
- [x] 호르몬 기록
- [x] 시술 일정 관리 UI
- [x] 커뮤니티
- [ ] AI 채팅 화면 (웹 동결로 클라이언트 없음 — 백엔드 엔드포인트만 유지)
- [x] 난임 시술 지원금 계산기 (앱 + 웹 공개 버전)
- [x] 웹: 랜딩 페이지 + 공개 지원금 계산기로 축소 (2026-09)
- [x] NestJS 백엔드 (모든 데이터 서버 경유)
- [x] 푸시 알림 (로컬: 약물·D-1·BBT 독려 / 원격: FCM)
- [x] 인앱결제 (RevenueCat — 페이월 화면, 구매/복원, 백엔드 웹훅)
- [x] 난임 시술 지원금 계산기 (홈/병원탭/캘린더 통합, 지원금 규칙은 원격 갱신)
- [x] 감정일기 → 캘린더 메모 통합 (Flutter+웹 모두 제거, 기록 탭 단순화, 기존 데이터 daily_notes로 이관)
- [ ] Vercel 웹 배포
- [ ] Flutter 앱 빌드 · 스토어 제출 (iOS / Android)
