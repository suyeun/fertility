# 리팩토링 작업 목록

## Phase 1 — 즉시 수정 (보안) ✅ 완료
- [x] [SEC-001] JWT 시크릿 하드코딩 제거 (auth.module.ts, jwt.strategy.ts)
- [x] [SEC-002] RevenueCat 웹훅 시크릿 필수화 (payments.controller.ts)
- [x] [SEC-003] diary.delete 소유권 검증 추가 (diary.service.ts)
- [x] [SEC-004] treatment.updateStatus/delete 소유권 검증 추가 (treatment.service.ts)
- [x] [SEC-005] updateProfile 화이트리스트 필드 제한 (users.service.ts)
- [x] [ERR-001] AI 스트리밍 try-catch + res.end() 보장 (ai.service.ts)
- [x] [BIZ-001] AiService 생성자에 FirebaseService 주입 (ai.service.ts, ai.controller.ts, ai.module.ts)

## Phase 2 — 이번 스프린트 ✅ 완료
- [x] [ARCH-004] 환경변수 Joi 스키마 검증 (app.module.ts)
- [x] [SEC-006] CORS 도메인 범위 축소 (main.ts)
- [x] [SEC-007] @nestjs/throttler Rate Limiting 적용
- [x] [SEC-008] Helmet 보안 헤더 추가 (main.ts)
- [x] [PERF-001] Firestore orderBy + limit 적용 (cycles, diary, treatment service)
- [x] [TYPE-004] signup 시 currentMode 필드 추가 (auth.service.ts)
- [x] [ERR-002] Firestore try-catch 전반 추가 (cycles, diary, treatment, users service)
- [x] [ERR-003] NotFoundException 처리 (users.service.ts)
- [x] [ARCH-001] 도메인별 DTO 클래스 생성 (cycles, diary, treatment, users)
- [x] [DRY-001] sanitizeUser() 헬퍼 추출 (users.service.ts) + auth.service.ts에서 재사용
- [x] [BIZ-003] 알림 fire-and-forget 분리 (treatment.service.ts)
- [x] [FE-001] mode 계산 중복 제거 (AuthContext에서 통합)
- [x] [FE-002] loadProfile useCallback 최적화
- [x] [FE-003] 빈 catch 블록 console.warn으로 교체

## Phase 3 — 다음 스프린트 (향후 계획)
- [ ] [ARCH-002] 글로벌 ExceptionFilter 구현
- [ ] [ARCH-003] Swagger/OpenAPI 문서화
- [ ] [ARCH-005] shared 패키지 types/utils/hooks 분리
- [ ] [PERF-002] 커서 페이지네이션 적용
- [ ] [PERF-003] AI 히스토리 서브컬렉션 구조
- [ ] [PERF-004] payments.setSubscription 원자적 처리
- [ ] [BIZ-002] 구독 필드명 통일 (trialEndsAt → subscriptionExpiresAt)
- [ ] [SHARED-001] firebase.ts 도메인별 분리 (972줄 단일 파일)
- [ ] [SHARED-002] 레거시 Secret API 코드 제거
