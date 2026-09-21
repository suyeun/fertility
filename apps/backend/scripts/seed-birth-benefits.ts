/**
 * 임신·출산 지원 안내 시드 — Firestore config/birthBenefits
 *
 *   미리보기: cd apps/backend && npm run seed:birth-benefits -- --dry-run
 *   기록:     cd apps/backend && npm run seed:birth-benefits
 *
 * 데이터는 scripts/birth-benefits.seed.json 을 수정한다. 없으면 코드 기본값(DEFAULT_BIRTH_BENEFITS)을 쓴다.
 * 문서를 통째로 덮어쓴다. 금액을 바꿀 때 verifiedAt(확인일)도 함께 갱신할 것 — 앱이 화면에 표시한다.
 */
import 'reflect-metadata'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { Logger, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FirebaseModule } from '../src/firebase/firebase.module'
import { FirebaseService } from '../src/firebase/firebase.service'
import { DEFAULT_BIRTH_BENEFITS, isValidBirthBenefitsDoc, BirthBenefitsDoc } from '../src/info/birth-benefits'

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), FirebaseModule] })
class SeedBootstrapModule {}

const logger = new Logger('SeedBirthBenefits')
const dryRun = process.argv.includes('--dry-run')

function loadSeed(): BirthBenefitsDoc {
  const file = join(__dirname, 'birth-benefits.seed.json')
  if (!existsSync(file)) {
    logger.log('seed json 없음 — 코드 기본값 사용')
    return DEFAULT_BIRTH_BENEFITS
  }
  const raw = JSON.parse(readFileSync(file, 'utf-8'))
  delete raw._readme
  if (!isValidBirthBenefitsDoc(raw)) throw new Error('birth-benefits.seed.json 검증 실패 (verifiedAt/disclaimer/items 확인)')
  return raw
}

async function main() {
  const doc = loadSeed()
  logger.log(`항목 ${doc.items.length}개 · 확인일 ${doc.verifiedAt} · version ${doc.version ?? '-'}`)
  if (dryRun) {
    console.log(JSON.stringify(doc, null, 2))
    logger.log('--dry-run: Firestore 에 기록하지 않았다')
    return
  }
  const app = await NestFactory.createApplicationContext(SeedBootstrapModule, { logger: ['error', 'warn', 'log'] })
  try {
    const firebase = app.get(FirebaseService)
    await firebase.db.collection('config').doc('birthBenefits').set({ ...doc, updatedAt: new Date().toISOString() })
    logger.log('기록 완료 → config/birthBenefits · 확인: GET /api/info/birth-benefits')
  } finally {
    await app.close()
  }
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
