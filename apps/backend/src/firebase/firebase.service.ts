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
      const projectId = this.config.get('FIREBASE_PROJECT_ID')
      const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL')
      const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn('Firebase 환경변수 미설정 — 에뮬레이터 모드로 동작합니다')
        admin.initializeApp({ projectId: 'fertility-app-dev' })
      } else {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        })
        this.logger.log('Firebase Admin 초기화 완료')
      }
    }

    this._db = admin.firestore()
    this._messaging = admin.messaging()
  }

  get db(): admin.firestore.Firestore {
    return this._db
  }

  get messaging(): admin.messaging.Messaging {
    return this._messaging
  }

  collection(path: string) {
    return this._db.collection(path)
  }

  doc(path: string) {
    return this._db.doc(path)
  }
}
