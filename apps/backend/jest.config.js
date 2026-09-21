/** @type {import('jest').Config} */
// 실행: npm test (apps/backend) 또는 npm run test:backend (루트)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    // 백엔드 tsconfig paths 와 동일 — 테스트에서는 빌드 산출물 대신 소스를 직접 참조
    '^@fertility/shared$': '<rootDir>/../../packages/shared/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  clearMocks: true,
  // 테스트 출력에서 Nest Logger 잡음 제거
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}
