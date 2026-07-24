---
name: project-overview
description: BOM(봄) 앱 전체 구조, 기술 스택, 도메인 모델, 주요 구현 현황 요약
metadata:
  type: project
---

## BOM(봄) 앱 개요

임신 준비/난임 시술 지원 PHR 앱. NATURAL(자연임신)과 CLINIC(병원 시술) 두 모드 지원.

## 기술 스택

| 계층 | 기술 |
|------|------|
| Web | Next.js 14, React, TypeScript, Tailwind CSS |
| Mobile | Flutter (Dart), Riverpod, go_router |
| Backend | NestJS 10, TypeScript |
| DB | Firestore (Cloud Firestore) |
| Auth | JWT (자체 구현, Passport) |
| State | Context API (web), Riverpod (mobile) |
| 결제 | RevenueCat (인앱결제 iOS/Android) |
| 알림 | Firebase Admin FCM (네이티브, 원격) + flutter_local_notifications (로컬) |
| AI | Claude API (@anthropic-ai/sdk) |

## 모노레포 구조

```
fertility-app/
├── apps/web/            — Next.js 웹앱
├── apps/mobile_flutter/ — Flutter 앱 (iOS + Android)
├── apps/backend/        — NestJS API
└── packages/shared/     — 공유 타입/유틸 (@fertility/shared, apps/web 전용)
```

**RN(Expo) 앱은 폐기됨** (2026-07). 기존 `apps/mobile`은 `archive/rn-mobile` 브랜치에만 보존되어 있고 main에는 없음. 모바일은 Flutter 하나만 유지·개발한다 — 신규 모바일 기능은 `apps/mobile_flutter`에만 구현.

## 핵심 도메인 타입

```typescript
// UserProfile
subscriptionStatus: 'trial' | 'active' | 'cancelled'
trialEndsAt?: string
subscriptionExpiresAt?: string   // RevenueCat CANCELLATION 후 실제 만료일 (추가됨)
currentMode: 'NATURAL' | 'CLINIC'
```

## RevenueCat 구독 구조

- `ENTITLEMENT_ID = 'bom_premium'`
- 제품: `bom_monthly`, `bom_annual`
- 웹훅 → `/api/payments/revenuecat` → Firestore `users/{uid}` 업데이트
- 상태 흐름: INITIAL_PURCHASE → 'active', CANCELLATION → 'cancelled'(+expiresAt), EXPIRATION → 'cancelled'

## CLINIC 페이월 구조 (2026-06 구현)

**Why:** 수익화 핵심. 약물 알림이 핵심 효용이며 그 지점에서 결제 요구.

### 무료 허용
- CLINIC 진입/모드 전환
- 시술 단계 개요 열람
- 첫 번째 시술 일정 등록
- 본인 기록 원본 열람 (구독 해지 후에도 영구)

### 프리미엄 잠금
- 약물 알림 켜기 (핵심 페이월)
- 2회차 이상 시술 일정 등록
- 차트/추이 분석
- 알림 실제 발송 (백엔드에서도 재검증)

### 구현 파일 위치 (web)
- `packages/shared/lib/clinicGate.ts` — ClinicFeature enum, canUseClinicScheduler(), isPremiumProfile()
- `packages/shared/lib/clinicGate.spec.ts` — 23개 단위 테스트 (모두 통과)
- `apps/web/components/PaywallModal.tsx` — 페이월 모달 UI
- `apps/web/app/(dashboard)/treatment/page.tsx` — 게이트 연동 + 잠금 프리뷰

### 구현 파일 위치 (Flutter — clinicGate.ts를 Dart로 동일 이식)
- `apps/mobile_flutter/lib/core/domain/clinic_gate.dart` — ClinicFeature, canUseClinicScheduler() 등 동일 로직 포팅
- `apps/mobile_flutter/lib/widgets/paywall_modal.dart` — 페이월 바텀시트 UI
- `apps/mobile_flutter/lib/features/subscription/subscription_screen.dart` — 구독 화면
- `apps/backend/src/notifications/notifications.service.ts` — sendMedicationReminder 서버 재검증 (플랫폼 공통)

**How to apply:** 새 프리미엄 기능 추가 시 web(`clinicGate.ts`)과 Flutter(`clinic_gate.dart`) 양쪽에 ClinicFeature 확장 + canUseClinicScheduler switch를 동일하게 추가해야 함 — 두 구현이 별도 코드베이스라 자동 동기화되지 않음. 데이터 읽기 경로에는 게이트 함수 절대 사용 금지.

## 테스트 설정

- `packages/shared/package.json`에 jest + ts-jest 추가
- `npm test --workspace=packages/shared`로 실행
- `tsconfig.json`에 `"types": ["node", "jest"]` 설정
