/**
 * 난임 시술 지원금 규칙 시드 — Firestore config/subsidyNationalRules, config/subsidyLocalRules
 *
 *   미리보기(Firestore 접근 없음): cd apps/backend && npm run seed:subsidy-rules -- --dry-run
 *   실제 기록:                     cd apps/backend && npm run seed:subsidy-rules
 *
 * 데이터는 scripts/subsidy-rules.seed.json 을 수정한다. 문서는 set(merge: false) 로 통째로
 * 덮어쓰므로, Firebase Console 에서 직접 수정한 값이 있다면 JSON 에도 반영해둘 것.
 *
 * 관리자 콘솔(apps/admin)은 Firestore 클라이언트 SDK 를 쓰는데 firestore.rules 에 config
 * 컬렉션 규칙이 없어 기본 거부된다. 그래서 규칙 문서는 이 스크립트(Admin SDK, 규칙 무시)나
 * Firebase Console 에서만 쓸 수 있다.
 *
 * 필요 환경변수(apps/backend/.env): FIREBASE_SERVICE_ACCOUNT_JSON 또는
 * FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 */
import 'reflect-metadata'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { Logger, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FirebaseModule } from '../src/firebase/firebase.module'
import { FirebaseService } from '../src/firebase/firebase.service'
import type { NationalRules, LocalRules } from '../src/subsidy/subsidy.service'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), FirebaseModule],
})
class SeedBootstrapModule {}

const logger = new Logger('SeedSubsidyRules')
const dryRun = process.argv.includes('--dry-run')

interface SeedFile {
  national: NationalRules
  local: LocalRules & {
    _regionDefaults?: Partial<NonNullable<LocalRules['regions']>[number]>
  }
}

function loadSeed(): { national: NationalRules; local: LocalRules } {
  const raw = readFileSync(join(__dirname, 'subsidy-rules.seed.json'), 'utf-8')
  const seed = JSON.parse(raw) as SeedFile

  const defaults = seed.local._regionDefaults ?? {}
  const regions = (seed.local.regions ?? []).map((r) => ({
    overrides: {},
    additionalBenefits: [],
    applyChannels: [],
    ...defaults,
    ...r,
  }))

  return {
    national: seed.national,
    local: { version: seed.local.version, regions },
  }
}

function validate(national: NationalRules, local: LocalRules) {
  const errors: string[] = []
  const procs = national.procedures ?? {}
  for (const key of ['ivf_fresh', 'ivf_frozen', 'iui']) {
    if (!procs[key]) errors.push(`national.procedures.${key} 누락 — 앱이 이 키를 기대한다`)
  }
  for (const [k, p] of Object.entries(procs)) {
    if (!(p.maxAmount > 0)) errors.push(`procedures.${k}.maxAmount 는 양수여야 한다`)
    if (!(p.countLimit > 0)) errors.push(`procedures.${k}.countLimit 는 양수여야 한다`)
    if (!['ivf', 'iui'].includes(p.countGroup)) errors.push(`procedures.${k}.countGroup 은 ivf|iui`)
  }
  if (!(national.totalLimit && national.totalLimit > 0)) errors.push('national.totalLimit 누락')
  const codes = new Set<string>()
  for (const r of local.regions ?? []) {
    if (!r.regionCode || !r.regionName) errors.push(`regionCode/regionName 누락: ${JSON.stringify(r)}`)
    if (codes.has(r.regionCode)) errors.push(`regionCode 중복: ${r.regionCode}`)
    codes.add(r.regionCode)
    for (const k of Object.keys(r.overrides ?? {})) {
      if (!procs[k]) errors.push(`${r.regionCode}.overrides.${k} 는 존재하지 않는 시술 키`)
    }
  }
  if (errors.length) {
    for (const e of errors) logger.error(e)
    throw new Error(`시드 데이터 검증 실패 (${errors.length}건)`)
  }
}

async function main() {
  const { national, local } = loadSeed()
  validate(national, local)

  logger.log(`국가 규칙: ${Object.keys(national.procedures ?? {}).length}개 시술, ${Object.keys(national.extras ?? {}).length}개 추가항목, 총 ${national.totalLimit}회`)
  logger.log(`지자체 규칙: ${local.regions?.length ?? 0}개 지역`)

  if (dryRun) {
    console.log(JSON.stringify({ national, local }, null, 2))
    logger.log('--dry-run: Firestore 에 기록하지 않았다')
    return
  }

  const app = await NestFactory.createApplicationContext(SeedBootstrapModule, { logger: ['error', 'warn', 'log'] })
  try {
    const firebase = app.get(FirebaseService)
    const config = firebase.db.collection('config')
    const now = new Date().toISOString()
    const batch = firebase.db.batch()
    batch.set(config.doc('subsidyNationalRules'), { ...national, updatedAt: now })
    batch.set(config.doc('subsidyLocalRules'), { ...local, updatedAt: now })
    await batch.commit()
    logger.log(`기록 완료 → config/subsidyNationalRules, config/subsidyLocalRules (project: ${process.env.FIREBASE_PROJECT_ID ?? 'service-account'})`)
    logger.log('확인: GET /api/subsidy/rules')
  } finally {
    await app.close()
  }
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
