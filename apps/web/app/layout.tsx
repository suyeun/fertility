// apps/web/app/layout.tsx
import type { Metadata } from 'next'
import { AuthProvider } from './context/AuthContext'
import './globals.css'

export const metadata: Metadata = {
  title: '임신 준비 AI 올인원 파트너 | Fertility AI',
  description: '생리 주기 추적, 배란일 예측, 병원 일정 관리, AI 질문 응답, 감정 기록까지. 임신을 준비하는 여성과 커플을 위한 맞춤형 동반자 서비스.',
  keywords: ['임신 준비', '배란일 예측', '생리 주기', 'IVF', 'IUI', '호르몬 기록', 'AI 상담', '감정 일기'],
  authors: [{ name: 'Fertility AI Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-gradient-to-tr from-[#ffdee9] to-[#b5fffc] min-h-screen flex justify-center">
        {/* 모바일 폰 레이아웃 스타일의 고해상도 컨테이너로 감싸기 */}
        <div className="w-full max-w-[480px] min-h-screen bg-background text-foreground shadow-[0_0_60px_-15px_rgba(136,19,55,0.15)] relative flex flex-col border-x border-rose-100/30 dark:border-zinc-900">
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}
