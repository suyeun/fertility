// apps/web/app/page.tsx — 마케팅 랜딩 페이지 (서버 컴포넌트, 인증 없음)
import Link from 'next/link'
import { Calculator, CalendarDays, Bell, Wallet, Users, Stethoscope, ArrowRight } from 'lucide-react'

const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL

const FEATURES = [
  {
    icon: CalendarDays,
    title: '주기 캘린더 & 시술 일정',
    desc: '배란일·가임기 예측부터 IVF·IUI·동결이식 일정까지 한 캘린더에서 관리해요.',
  },
  {
    icon: Bell,
    title: '약물·주사 정시 알림',
    desc: '주사·질정·경구약 투여 시각에 맞춰 알림을 보내드려요. 일정 전날 리마인더도 함께.',
  },
  {
    icon: Wallet,
    title: '난임 시술 지원금 계산기',
    desc: '국가·지자체 지원금을 거주지와 차수 기준으로 계산하고, 서류 체크리스트와 마감 알림까지.',
  },
  {
    icon: Users,
    title: '배우자와 함께',
    desc: '초대코드로 배우자를 연결하면 시술 일정을 함께 확인할 수 있어요.',
  },
  {
    icon: Stethoscope,
    title: '난임 병원 정보',
    desc: '지역·전문분야별 병원 검색과 전문의 자문 아티클을 제공해요.',
  },
]

function StoreButton({ href, label, sub }: { href?: string; label: string; sub: string }) {
  const base =
    'flex-1 min-w-[150px] flex flex-col items-center justify-center rounded-2xl px-5 py-3 text-center transition-all'
  if (!href) {
    return (
      <div className={`${base} bg-white/60 text-rose-900/50 border border-rose-100 cursor-default`}>
        <span className="text-[11px]">{sub}</span>
        <span className="text-sm font-bold">{label} 출시 준비 중</span>
      </div>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} bg-rose-950 text-white hover:bg-rose-900 active-press`}>
      <span className="text-[11px] opacity-80">{sub}</span>
      <span className="text-sm font-bold">{label}</span>
    </a>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-3xl px-6 py-10 flex flex-col gap-14">
        {/* 헤더 */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌸</span>
            <span className="font-outfit font-bold text-lg text-rose-950 tracking-tight">BOM</span>
            <span className="text-xs text-rose-500/80 font-medium">봄</span>
          </div>
          <Link
            href="/subsidy"
            className="text-sm font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1"
          >
            <Calculator size={16} /> 지원금 계산기
          </Link>
        </header>

        {/* 히어로 */}
        <section className="flex flex-col gap-6 text-center items-center animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-rose-950 leading-snug font-outfit">
            임신 준비의 모든 순간을,
            <br />
            봄과 함께
          </h1>
          <p className="text-rose-900/70 text-sm sm:text-base leading-relaxed max-w-xl">
            생리 주기 추적, 호르몬 수치 기록, 시술 일정과 약물 알림, 지원금 계산까지.
            <br className="hidden sm:block" />
            자연임신을 준비하는 분부터 시험관 시술 중인 부부까지, 하나의 앱에서.
          </p>
          <div className="flex flex-wrap gap-3 justify-center w-full max-w-md">
            <StoreButton href={APP_STORE_URL} label="App Store" sub="iPhone에서" />
            <StoreButton href={PLAY_STORE_URL} label="Google Play" sub="Android에서" />
          </div>
        </section>

        {/* 지원금 계산기 CTA */}
        <section className="glass rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-lg shadow-rose-100/40">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-rose-950">난임 시술 지원금, 얼마나 받을 수 있을까요?</h2>
            <p className="text-sm text-rose-900/70 mt-1 leading-relaxed">
              거주지와 시술 종류, 사용한 차수만 입력하면 예상 최대 지원금을 바로 계산해드려요. 가입 없이 무료로 이용할 수 있어요.
            </p>
          </div>
          <Link
            href="/subsidy"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-3 rounded-2xl transition-colors active-press whitespace-nowrap"
          >
            계산해보기 <ArrowRight size={16} />
          </Link>
        </section>

        {/* 기능 */}
        <section className="flex flex-col gap-5">
          <h2 className="text-lg font-bold text-rose-950 text-center">앱에서 할 수 있는 것</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-white/80 rounded-3xl p-5 border border-rose-100/60 flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-950">{f.title}</h3>
                    <p className="text-xs text-rose-900/70 mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 푸터 */}
        <footer className="text-center text-[11px] text-rose-900/50 leading-relaxed pb-6">
          <p>BOM은 의료 서비스가 아닌 개인 건강 기록 도구입니다. 진단·치료는 반드시 전문 의료진과 상담하세요.</p>
          <div className="flex justify-center gap-4 mt-3">
            <a
              href="https://cuboid-string-459.notion.site/BOM-3ab4e4079c788019b0e9e946d351ca7f"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-rose-700"
            >
              이용약관
            </a>
            <a
              href="https://cuboid-string-459.notion.site/Lunera-3864e4079c7880699f4cf6ac9f9c7952"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-rose-700"
            >
              개인정보처리방침
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}
