import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as admin from 'firebase-admin'

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name)
  private _db: admin.firestore.Firestore
  private _messaging: admin.messaging.Messaging

  constructor(private config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length > 0) {
      this.logger.log('Firebase Admin 이미 초기화됨')
    } else {
      // 방법 1: JSON 전체를 하나의 환경변수로 (권장)
      const serviceAccountJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON')

      // 방법 2: 개별 환경변수
      const projectId    = this.config.get<string>('FIREBASE_PROJECT_ID')
      const clientEmail  = this.config.get<string>('FIREBASE_CLIENT_EMAIL')
      const rawKey       = this.config.get<string>('FIREBASE_PRIVATE_KEY') ?? ''
      // Render는 \n을 그대로 저장하므로 두 케이스 모두 처리
      const privateKey   = rawKey.includes('\\n')
        ? rawKey.replace(/\\n/g, '\n')
        : rawKey

      if (serviceAccountJson) {
        // JSON 통째로 입력한 경우
        try {
          const serviceAccount = JSON.parse(serviceAccountJson)
          admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
          this.logger.log('Firebase Admin 초기화 완료 (JSON)')
        } catch (e) {
          this.logger.error('FIREBASE_SERVICE_ACCOUNT_JSON 파싱 실패:', e)
          admin.initializeApp({ projectId: 'fertility-app-dev' })
        }
      } else if (projectId && clientEmail && privateKey) {
        // 개별 변수로 입력한 경우
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        })
        this.logger.log('Firebase Admin 초기화 완료 (개별 변수)')
      } else {
        this.logger.warn('Firebase 환경변수 미설정 — 개발 모드로 동작합니다')
        admin.initializeApp({ projectId: projectId ?? 'fertility-app-dev' })
      }
    }

    this._db = admin.firestore()
    this._messaging = admin.messaging()
  }

  get db(): admin.firestore.Firestore { return this._db }
  get messaging(): admin.messaging.Messaging { return this._messaging }
  collection(path: string) { return this._db.collection(path) }
  doc(path: string) { return this._db.doc(path) }
}
