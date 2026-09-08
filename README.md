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
| GET/POST | `/api/cycles` | 생리 주기 |
| GET/POST/DELETE | `/api/hormones` | 호르몬 기록 |
| GET/POST/PATCH/DELETE | `/api/treatment` | 시술 일정 |
| GET | `/api/treatment/templates` | 회차 프로토콜 템플릿(예시 일정, `config/treatmentTemplates` 로 갱신 가능) |
| GET/GET(:date)/POST/DELETE | `/api/daily-notes` | 캘린더 일별 메모·컨디션 (감정일기 대체, 날짜당 1건) |
| POST | `/api/ai/chat` | AI 채팅 (스트리밍) — 현재 호출하는 클라이언트 없음 (웹 동결, Flutter 미구현) |
| GET/POST | `/api/ai/history` | 채팅 히스토리 — 현재 호출하는 클라이언트 없음 |
| GET/POST | `/api/community/posts` | 커뮤니티 게시글 |
| POST | `/api/notifications/token` | FCM 토큰 등록 |
| GET | `/api/banners` | 활성 배너 (게재 기간 필터, 병원 배너는 isAd=true) |
| POST | `/api/ads/events` | 광고 노출·클릭 비식별 집계 (인증 불필요, 분당 120회) |
| GET | `/api/ads/stats` | 기간별 광고 집계 합계 |
| GET | `/api/subsidy/rules` | 난임 시술 지원금 규칙(국가/지자체, 인증 불필요) |
| GET/PATCH | `/api/subsidy/profile` | 지원금 프로필(거주지·차수·체크리스트) |
| POST | `/api/subsidy/profile/calculations` | 지원금 계산 결과 저장 |
| PATCH | `/api/subsidy/applications/:scheduleId` | 회차별 지원금 신청 진행 상태 (통지서 발급 · 시술 완료 · 청구 완료 · 서류 체크) |

모든 엔드포인트는 `Authorization: Bearer <JWT>` 헤더 필요 (auth 제외).

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
