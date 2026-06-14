/**
 * [SHARED-001] firebase.ts — 하위 호환성 유지 배럴 파일
 *
 * 기존 코드에서 'import { dbService, secretService } from "@fertility/shared"'
 * 패턴을 유지하면서, 내부 구현은 도메인별 파일로 분리됨.
 *
 * ⚠️ 새 코드에서는 도메인별 파일을 직접 import 하세요:
 *   import { userService } from './firebase-users'
 *   import { cyclesService } from './firebase-health'
 *   import { diaryService } from './firebase-diary'
 *   import { communityService } from './firebase-community'
 *   import { aiChatService } from './firebase-ai'
 *   import { secretService } from './firebase-secret'  ← [SHARED-002] 레거시
 */
export { isMockMode, authService, auth, db } from './firebase-core'
export { userService } from './firebase-users'
export { cyclesService, hormonesService, treatmentService } from './firebase-health'
export { diaryService } from './firebase-diary'
export { communityService } from './firebase-community'
export { aiChatService } from './firebase-ai'

// [SHARED-002] 레거시 dbService 매핑 — 기존 코드 호환
// TODO: 향후 스프린트에서 각 호출 지점을 도메인 서비스로 교체 후 제거
import { userService } from './firebase-users'
import { cyclesService, hormonesService, treatmentService } from './firebase-health'
import { diaryService } from './firebase-diary'
import { communityService } from './firebase-community'
import { aiChatService } from './firebase-ai'

/** @deprecated Use domain-specific services instead */
export const dbService = {
  // 사용자 프로필
  getUserProfile: userService.getUserProfile,
  saveUserProfile: userService.saveUserProfile,

  // 생리 주기
  getMenstrualCycles: cyclesService.getMenstrualCycles,
  saveMenstrualCycle: cyclesService.saveMenstrualCycle,

  // 호르몬
  getHormoneRecords: hormonesService.getHormoneRecords,
  saveHormoneRecord: hormonesService.saveHormoneRecord,
  deleteHormoneRecord: hormonesService.deleteHormoneRecord,

  // 시술 일정
  getTreatmentSchedules: treatmentService.getTreatmentSchedules,
  saveTreatmentSchedule: treatmentService.saveTreatmentSchedule,
  deleteTreatmentSchedule: treatmentService.deleteTreatmentSchedule,

  // 감정 일기
  getDiaryEntries: diaryService.getDiaryEntries,
  saveDiaryEntry: diaryService.saveDiaryEntry,
  deleteDiaryEntry: diaryService.deleteDiaryEntry,

  // 커뮤니티
  getCommunityPosts: communityService.getCommunityPosts,
  saveCommunityPost: communityService.saveCommunityPost,
  toggleLikePost: communityService.toggleLikePost,
  getCommunityComments: communityService.getCommunityComments,
  saveCommunityComment: communityService.saveCommunityComment,

  // AI 채팅
  getChatMessages: aiChatService.getChatMessages,
  saveChatMessage: aiChatService.saveChatMessage,
  getAIChatHistory: aiChatService.getAIChatHistory,
  saveAIChatHistory: aiChatService.saveAIChatHistory,
}
