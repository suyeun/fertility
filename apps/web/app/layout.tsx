// apps/web/app/layout.tsx
import type { Metadata } from 'next'
import { AuthProvider } from './context/AuthContext'
import { GuestProvider } from './context/GuestContext'
import './globals.css'

export const metadata: Metadata = {
  title: '루네라(Lunera) · 임신준비 배란일 캘린더',
  description: '배란일·가임기부터 IVF 시술 일정·약물 스케줄까지, 임신 준비의 모든 것을 하나의 캘린더에. 자연임신·난임 시술을 준비하는 분들을 위한 개인 건강 기록 스케줄러.',
  keywords: ['임신 준비', '배란일 계산기', '가임기', '생리 주기', '시험관', 'IVF', '인공수정', '난임', '임신 캘린더', '영양제 트래킹'],
  authors: [{ name: 'Lunera Team' }],
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
            <GuestProvider>
              {children}
            </GuestProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}
