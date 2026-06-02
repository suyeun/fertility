# 🌸 BOM (봄) — 임신 준비 AI 파트너

임신을 준비하는 여성을 위한 올인원 앱. 생리 주기 추적, 호르몬 수치 기록, 시술 일정 관리, AI 상담을 하나의 앱에서 제공합니다.

---

## 프로젝트 구조

```
fertility-app/
├── apps/
│   ├── web/        ← Next.js 14 (웹)
│   ├── mobile/     ← Expo React Native (iOS + Android)
│   └── backend/    ← NestJS API 서버 (포트 3001)
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
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 모바일 (`apps/mobile/.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

> 실기기 테스트 시 `localhost` 대신 개발 PC의 로컬 IP 주소를 사용하세요.  
> 예: `EXPO_PUBLIC_API_URL=http://192.168.0.10:3001/api`

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

# 터미널 3 — 모바일 (Expo)
npm run mobile
# → Expo Go 앱으로 QR 코드 스캔
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
# apps/mobile/.env
EXPO_PUBLIC_RC_API_KEY_IOS=appl_xxxx
EXPO_PUBLIC_RC_API_KEY_ANDROID=goog_xxxx

# apps/backend/.env
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
```

6. **웹훅 등록** (RevenueCat 대시보드 → Webhooks)
   - URL: `https://your-api.com/api/payments/revenuecat`
   - Authorization Header: `.env`의 `REVENUECAT_WEBHOOK_SECRET` 값

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
ANTHROPIC_API_KEY=sk-ant-...   # /api/ai 라우트가 남아있는 경우
```

6. **Deploy** → 완료

이후 `main` 브랜치에 푸시하면 자동 재배포돼요.

---

### 모바일 — EAS Build

```bash
npm install -g eas-cli
eas login

cd apps/mobile
eas build --platform ios      # App Store 제출용
eas build --platform android  # Google Play 제출용
```

> EAS 빌드 전 `apps/mobile/.env`의 `EXPO_PUBLIC_API_URL`을 Render 서버 URL로 변경하세요.

---

## 6. API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 → JWT 발급 |
| GET | `/api/auth/me` | 내 정보 |
| GET/PATCH | `/api/users/profile` | 프로필 조회/수정 |
| GET/POST | `/api/cycles` | 생리 주기 |
| GET/POST/DELETE | `/api/hormones` | 호르몬 기록 |
| GET/POST/PATCH/DELETE | `/api/treatment` | 시술 일정 |
| GET/POST/DELETE | `/api/diary/:date` | 감정 일기 |
| POST | `/api/ai/chat` | AI 채팅 (스트리밍) |
| GET/POST | `/api/ai/history` | 채팅 히스토리 |
| GET/POST | `/api/community/posts` | 커뮤니티 게시글 |
| GET/POST | `/api/community/secret` | 비밀 대화방 |
| POST | `/api/notifications/token` | FCM 토큰 등록 |

모든 엔드포인트는 `Authorization: Bearer <JWT>` 헤더 필요 (auth 제외).

---

## 7. 개발 현황

- [x] 회원가입 · 로그인 (JWT 기반)
- [x] 온보딩 (3단계)
- [x] 주기 캘린더
- [x] 대시보드
- [x] 호르몬 기록
- [x] 시술 일정 관리 UI
- [x] 커뮤니티 (일반 + 비밀 대화방)
- [x] AI 채팅 화면 (모바일)
- [x] NestJS 백엔드 (모든 데이터 서버 경유)
- [x] 푸시 알림 (로컬: 약물·D-1·BBT 독려 / 원격: Expo Push API + FCM)
- [x] 인앱결제 (RevenueCat — 페이월 화면, 구매/복원, 백엔드 웹훅)
- [ ] Vercel 웹 배포
- [ ] EAS 앱 빌드 (iOS / Android)
