/**
 * 관리자 콘솔 계정에 Firebase Auth 커스텀 클레임 admin=true 를 부여/해제한다.
 * firestore.rules 의 isAdmin() 이 이 클레임을 본다. 부여 후 콘솔에서 재로그인해야 토큰이 갱신된다.
 *
 *   부여: cd apps/backend && npm run set-admin -- admin@example.com
 *   해제: cd apps/backend && npm run set-admin -- admin@example.com --revoke
 */
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Logger, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import * as admin from 'firebase-admin'
import { FirebaseModule } from '../src/firebase/firebase.module'
import { FirebaseService } from '../src/firebase/firebase.service'

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), FirebaseModule] })
class Bootstrap {}

const logger = new Logger('SetAdminClaim')

async function main() {
  const [email, flag] = process.argv.slice(2)
  if (!email) throw new Error('사용법: npm run set-admin -- <email> [--revoke]')
  const revoke = flag === '--revoke'

  const app = await NestFactory.createApplicationContext(Bootstrap, { logger: ['error', 'warn', 'log'] })
  try {
    app.get(FirebaseService) // Admin SDK 초기화 보장
    const user = await admin.auth().getUserByEmail(email)
    await admin.auth().setCustomUserClaims(user.uid, revoke ? { admin: null } : { admin: true })
    logger.log(`${email} (${user.uid}) admin 클레임 ${revoke ? '해제' : '부여'} 완료 — 콘솔에서 재로그인 필요`)
  } finally {
    await app.close()
  }
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
