/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fertility/shared'],
  webpack: (config, { isServer }) => {
    // 서버 사이드 빌드 시 undici 및 firebase 관련 esm 빌드 에러 방지를 위해 externals에 추가
    if (isServer) {
      config.externals.push('undici')
    }
    return config
  },
}

module.exports = nextConfig
