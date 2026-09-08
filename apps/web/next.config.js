/** @type {import('next').NextConfig} */
// 웹은 랜딩 페이지 + 공개 지원금 계산기만 제공한다 (2026-09 동결).
// 기록·일정·커뮤니티·AI 채팅 등 서비스 화면은 모바일 앱(BOM)으로 이전됐다.
const LEGACY_ROUTES = [
  '/login', '/signup', '/onboarding', '/tour',
  '/calendar', '/chat', '/community', '/info', '/records',
  '/settings', '/subscription', '/treatment',
]

const nextConfig = {
  async redirects() {
    return LEGACY_ROUTES.map((source) => ({
      source: `${source}/:path*`,
      destination: '/',
      permanent: false,
    }))
  },
}

module.exports = nextConfig
