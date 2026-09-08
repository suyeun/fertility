// apps/web/app/layout.tsx
// 웹은 마케팅 랜딩 + 공개 지원금 계산기만 제공한다. 기록·일정·커뮤니티 등 실제 서비스는 모바일 앱(BOM)에서 이용.
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BOM(봄) · 임신 준비 AI 파트너',
  description:
    '생리 주기·배란일 추적, 호르몬 수치 기록, IVF·IUI 시술 일정과 약물 알림, 난임 시술 지원금 계산까지. 임신을 준비하는 부부를 위한 올인원 앱.',
  keywords: ['임신 준비', '배란일 계산기', '난임', '시험관', 'IVF', '인공수정', '난임 시술 지원금', '지원금 계산기', '시술 일정'],
  authors: [{ name: 'BOM Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-gradient-to-tr from-[#ffdee9] to-[#b5fffc] min-h-screen">
        {children}
      </body>
    </html>
  )
}
