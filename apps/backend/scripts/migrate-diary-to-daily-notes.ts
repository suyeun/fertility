/**
 * 1회성 마이그레이션: diary_entries → daily_notes
 *
 * 실행 (마이그레이션만, 원본 보존): cd apps/backend && npm run migrate:diary-to-daily-notes
 * 실행 (마이그레이션 + 원본 diary_entries 전체 삭제):
 *   cd apps/backend && npm run migrate:diary-to-daily-notes -- --delete-source
 *
 * ⚠️ --delete-source는 되돌릴 수 없다. 실행 전 대상 Firestore 프로젝트(FIREBASE_PROJECT_ID)가
 * 맞는지 반드시 확인할 것.
 *
 * 이 스크립트는 AppModule 전체가 아니라 Firebase 연결에 필요한 최소 모듈만 부팅한다 —
 * JWT_SECRET/ANTHROPIC_API_KEY/REVENUECAT_WEBHOOK_SECRET 같은 무관한 환경변수는 필요 없다.
 *
 * - 같은 (userId, date) 그룹의 여러 diary_entries는 createdAt 오름차순으로
 *   "\n\n"으로 이어붙여 daily_notes 한 건의 memo로 병합한다.
 * - mood(10종) → condition(5단계)은 MOOD_TO_CONDITION 매핑표를 따르며,
 *   그룹 내 가장 최신(createdAt 기준) 항목의 mood를 그날의 대표 condition으로 채택한다.
 * - Idempotency: daily_notes 문서에 내부 전용 필드 migratedDiaryIds(diary_entries id 목록)를
 *   기록해, 재실행 시 이미 반영된 항목은 건너뛰고 새로 추가된 diary_entries만 이어붙인다.
 *   그룹 내 새 항목이 하나도 없으면 문서를 아예 건드리지 않는다.
 * - 이미 사용자가 캘린더의 새 메모 기능으로 daily_notes를 직접 작성해둔 경우(레이스 컨디션),
 *   그 memo/condition을 덮어쓰지 않고 memo 뒤에 이어붙이며, condition은 기존 값이 없을 때만 채운다.
 * - --delete-source가 없으면 diary_entries는 전혀 수정/삭제하지 않는다(읽기 전용 참조).
 */
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Logger, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FirebaseModule } from '../src/firebase/firebase.module'
import { FirebaseService } from '../src/firebase/firebase.service'

// AppModule 대신, Firebase 연결에만 필요한 최소 모듈 — 다른 도메인의 필수 환경변수를
// 요구하지 않는다.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), FirebaseModule],
})
class MigrationBootstrapModule {}

const logger = new Logger('MigrateDiaryToDailyNotes')
const shouldDeleteSource = process.argv.includes('--delete-source')

const MOOD_TO_CONDITION: Record<string, number> = {
  great: 5,
  excited: 5,
  good: 4,
  hopeful: 4,
  neutral: 3,
  tired: 2,
  anxious: 2,
  sad: 1,
  angry: 1,
  sick: 1,
}

interface DiaryEntryDoc {
  id: string
  userId: string
  date: string
  mood?: string
  content?: string
  createdAt?: string
}

function groupKey(userId: string, date: string) {
  return `${userId}::${date}`
}

async function main() {
  const app = await NestFactory.createApplicationContext(MigrationBootstrapModule)
  const firebase = app.get(FirebaseService)

  const diarySnap = await firebase.collection('diary_entries').get()
  const entries: DiaryEntryDoc[] = diarySnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }))

  const groups = new Map<string, DiaryEntryDoc[]>()
  for (const entry of entries) {
    if (!entry.userId || !entry.date) continue
    const key = groupKey(entry.userId, entry.date)
    const list = groups.get(key) ?? []
    list.push(entry)
    groups.set(key, list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  }

  logger.log(`이관 대상: diary_entries ${entries.length}건, distinct(userId,date) ${groups.size}건`)

  let changed = 0
  let skipped = 0

  for (const [, groupEntries] of groups) {
    const { userId, date } = groupEntries[0]
    const docId = `${userId}_${date}`
    const docRef = firebase.collection('daily_notes').doc(docId)
    const existingSnap = await docRef.get()
    const existing = existingSnap.exists ? (existingSnap.data() as any) : null
    const migratedIds: string[] = existing?.migratedDiaryIds ?? []

    const newEntries = groupEntries.filter((e) => !migratedIds.includes(e.id))
    if (newEntries.length === 0) {
      skipped += 1
      continue
    }

    const mergedNewText = newEntries
      .map((e) => (e.content ?? '').trim())
      .filter((c) => c.length > 0)
      .join('\n\n')

    const memo = existing?.memo
      ? mergedNewText
        ? `${existing.memo}\n\n${mergedNewText}`
        : existing.memo
      : mergedNewText

    const latestMood = groupEntries[groupEntries.length - 1]?.mood
    const mappedCondition = latestMood ? MOOD_TO_CONDITION[latestMood] ?? null : null
    // 사용자가 캘린더에서 이미 컨디션을 직접 골라뒀다면 마이그레이션이 덮어쓰지 않는다.
    const condition = existing?.condition ?? mappedCondition ?? null

    const record = {
      id: docId,
      userId,
      date,
      memo,
      condition,
      migratedFromDiary: true,
      migratedDiaryIds: [...migratedIds, ...newEntries.map((e) => e.id)],
      createdAt: existing?.createdAt ?? groupEntries[0].createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await docRef.set(record, { merge: true })
    changed += 1
  }

  logger.log(`완료: 변경 ${changed}건, 스킵(이미 반영됨) ${skipped}건`)

  if (shouldDeleteSource) {
    logger.warn(`--delete-source 지정됨: diary_entries ${diarySnap.docs.length}건을 삭제합니다.`)
    const BATCH_SIZE = 400
    let deleted = 0
    for (let i = 0; i < diarySnap.docs.length; i += BATCH_SIZE) {
      const chunk = diarySnap.docs.slice(i, i + BATCH_SIZE)
      const batch = firebase.db.batch()
      for (const doc of chunk) {
        batch.delete(doc.ref)
      }
      await batch.commit()
      deleted += chunk.length
    }
    logger.warn(`diary_entries 삭제 완료: ${deleted}건`)
  } else {
    logger.log('diary_entries는 삭제하지 않았습니다 (삭제하려면 --delete-source 플래그 추가).')
  }

  await app.close()
}

main().catch((err) => {
  logger.error('마이그레이션 실패:', err)
  process.exit(1)
})
