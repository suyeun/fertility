import { Logger } from '@nestjs/common'

// 서비스 코드의 Logger.log/warn 이 테스트 출력에 섞이지 않도록 비활성화한다.
Logger.overrideLogger(false)
