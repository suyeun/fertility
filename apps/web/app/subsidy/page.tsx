'use client'

// apps/web/app/subsidy/page.tsx — 공개 지원금 계산기 (가입 불필요)
// 모바일 앱의 무료 티어와 동일하게 예상 총액·요약만 보여주고,
// 항목별 상세·서류 체크리스트·마감 알림은 앱으로 유도한다.

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Lock, Smartphone } from 'lucide-react'
import {
  calculateSubsidy,
  fetchSubsidyRules,
  formatMaxAmount,
  type SubsidyCalculationResult,
  type SubsidyRules,
} from '../../lib/subsidy'

const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL

type Step = 0 | 1 | 2 | 3

export default function SubsidyCalculatorPage() {
  const [rules, setRules] = useState<SubsidyRules | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>(0)

  const [regionCode, setRegionCode] = useState<string>('')
  const [procedureKey, setProcedureKey] = useState<string>('')
  const [usedCount, setUsedCount] = useState<string>('0')
  const [extraKeys, setExtraKeys] = useState<string[]>([])
  const [result, setResult] = useState<SubsidyCalculationResult | null>(null)

  useEffect(() => {
    fetchSubsidyRules()
      .then(setRules)
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  const regions = rules?.local.regions ?? []
  const procedures = useMemo(
    () => Object.entries(rules?.national.procedures ?? {}),
    [rules],
  )
  const extras = useMemo(() => Object.entries(rules?.national.extras ?? {}), [rules])
  const selectedRegion = regions.find((r) => r.regionCode === regionCode) ?? null

  const toggleExtra = (k: string) =>
    setExtraKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))

  const calculate = () => {
    if (!rules || !procedureKey) return
    const proc = rules.national.procedures?.[procedureKey]
    const entered = Math.max(0, parseInt(usedCount, 10) || 0)
    const used = proc?.countGroup === 'iui' ? { ivf: 0, iui: entered } : { ivf: entered, iui: 0 }
    setResult(
      calculateSubsidy({
        national: rules.national,
        local: selectedRegion,
        procedureKey,
        extraKeys,
        used,
      }),
    )
    setStep(3)
  }

  const reset = () => {
    setStep(0)
    setResult(null)
    setExtraKeys([])
    setUsedCount('0')
  }

  return (
    <main className="min-h-screen flex justify-center">
      <div className="w-full max-w-[520px] min-h-screen bg-[#fffbfc] shadow-[0_0_60px_-15px_rgba(136,19,55,0.15)] flex flex-col">
        <header className="sticky top-0 z-10 glass px-4 py-3 flex items-center gap-3 border-b border-rose-100/40">
          <Link href="/" className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50" aria-label="홈으로">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-bold text-base text-rose-950">난임 시술 지원금 계산기</h1>
        </header>

        <div className="flex-1 p-5 flex flex-col gap-5">
          {step < 3 && <StepIndicator step={step} />}

          {loadError && (
            <Notice tone="error">지원금 기준을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</Notice>
          )}
          {!rules && !loadError && (
            <div className="flex flex-col items-center py-16 gap-3">
              <span className="w-8 h-8 border-4 border-rose-300 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-rose-500">지원금 기준을 불러오는 중…</p>
            </div>
          )}

          {rules && step === 0 && (
            <section className="flex flex-col gap-4 animate-fade-in">
              <StepTitle>거주지가 어디세요?</StepTitle>
              <p className="text-xs text-rose-900/60">
                지자체별 추가 지원이 다를 수 있어요. 목록에 없으면 국가 기준으로만 계산해요.
              </p>
              <select
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm text-rose-950"
              >
                <option value="">국가 기준으로만 계산 (지역 미선택)</option>
                {regions.map((r) => (
                  <option key={r.regionCode} value={r.regionCode}>
                    {r.regionName}
                  </option>
                ))}
              </select>
              <PrimaryButton onClick={() => setStep(1)}>다음</PrimaryButton>
            </section>
          )}

          {rules && step === 1 && (
            <section className="flex flex-col gap-4 animate-fade-in">
              <StepTitle>어떤 시술을 준비하세요?</StepTitle>
              <div className="flex flex-col gap-2">
                {procedures.map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProcedureKey(key)}
                    className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                      procedureKey === key
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-rose-100 bg-white hover:border-rose-200'
                    }`}
                  >
                    <div className="text-sm font-bold text-rose-950">{p.label}</div>
                    <div className="text-[11px] text-rose-900/60 mt-0.5">
                      회당 {formatMaxAmount(p.maxAmount)} · 총 {p.countLimit}회
                    </div>
                  </button>
                ))}
                {procedures.length === 0 && (
                  <Notice tone="warn">등록된 시술 기준이 없어요. 관리자에게 문의해주세요.</Notice>
                )}
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-rose-900/80">
                  현재까지 사용한 지원 횟수 (누적 차수)
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={usedCount}
                  onChange={(e) => setUsedCount(e.target.value)}
                  className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm text-rose-950"
                />
              </label>
              <div className="flex gap-2">
                <SecondaryButton onClick={() => setStep(0)}>이전</SecondaryButton>
                <PrimaryButton onClick={() => setStep(2)} disabled={!procedureKey}>
                  다음
                </PrimaryButton>
              </div>
            </section>
          )}

          {rules && step === 2 && (
            <section className="flex flex-col gap-4 animate-fade-in">
              <StepTitle>해당하는 항목이 있나요?</StepTitle>
              <p className="text-xs text-rose-900/60">해당하는 항목을 모두 선택해주세요. 없으면 바로 계산해도 돼요.</p>
              <div className="flex flex-col gap-2">
                {extras.map(([key, e]) => {
                  const on = extraKeys.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleExtra(key)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                        on ? 'border-emerald-400 bg-emerald-50' : 'border-rose-100 bg-white hover:border-rose-200'
                      }`}
                    >
                      <span className="text-sm text-rose-950">{e.label}</span>
                      <span className="text-[11px] text-rose-900/60">{formatMaxAmount(e.maxAmount)}</span>
                    </button>
                  )
                })}
                {extras.length === 0 && (
                  <p className="text-xs text-rose-900/50">추가 항목 기준이 등록되지 않았어요.</p>
                )}
              </div>
              <div className="flex gap-2">
                <SecondaryButton onClick={() => setStep(1)}>이전</SecondaryButton>
                <PrimaryButton onClick={calculate}>계산하기</PrimaryButton>
              </div>
            </section>
          )}

          {rules && step === 3 && result && (
            <ResultView result={result} onReset={reset} disclaimer={rules.national.disclaimer} />
          )}
        </div>
      </div>
    </main>
  )
}

function ResultView({
  result,
  onReset,
  disclaimer,
}: {
  result: SubsidyCalculationResult
  onReset: () => void
  disclaimer?: string
}) {
  if (!result.eligible) {
    return (
      <section className="flex flex-col gap-4 animate-fade-in">
        <StepTitle>아쉽지만 이번엔 어려울 것 같아요</StepTitle>
        <p className="text-sm text-rose-900/70">{result.reason}</p>
        <Disclaimer text={disclaimer} />
        <SecondaryButton onClick={onReset}>다시 계산하기</SecondaryButton>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5 animate-fade-in">
      {result.isStale && (
        <Notice tone="warn">
          지자체 기준 최종 확인일이 6개월 이상 지났어요. 관할 보건소에서 최신 기준을 확인해주세요.
        </Notice>
      )}
      <div>
        <p className="text-xs text-rose-900/60">예상 지원금</p>
        <p className="text-4xl font-extrabold text-emerald-600 mt-1 font-outfit">
          {formatMaxAmount(result.totalMax)}
        </p>
      </div>

      <div className="rounded-2xl bg-emerald-50 p-4 flex flex-col gap-2">
        <SummaryRow label="국가 지원" value="적용됨" />
        <SummaryRow label="지자체 추가 지원" value={result.localBenefits.length > 0 ? '있음' : '없음'} />
        <SummaryRow label="남은 지원 횟수" value={`${result.remainingCount}회`} />
      </div>

      <ul className="flex flex-col gap-1.5">
        {result.warnings.map((w) => (
          <li key={w} className="flex gap-2 text-xs text-amber-800">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{w}</span>
          </li>
        ))}
      </ul>

      {/* 상세는 앱에서 — 모바일 프리미엄 잠금과 동일한 경계 */}
      <div className="rounded-3xl border border-rose-100 bg-white p-5 flex flex-col items-center text-center gap-3">
        <Lock size={20} className="text-rose-950" />
        <p className="text-sm font-semibold text-rose-950 leading-relaxed">
          항목별 상세 · 서류 체크리스트 ·<br />신청 절차 · 마감 알림은 앱에서
        </p>
        <p className="text-xs text-rose-900/60">
          BOM 앱에서 시술 일정과 연결하면 지원결정통지서 발급·청구 서류 준비 시점을 알림으로 챙겨드려요.
        </p>
        <div className="flex flex-wrap gap-2 justify-center w-full">
          <StoreLink href={APP_STORE_URL} label="App Store" />
          <StoreLink href={PLAY_STORE_URL} label="Google Play" />
        </div>
      </div>

      <Disclaimer text={disclaimer} />
      <SecondaryButton onClick={onReset}>다시 계산하기</SecondaryButton>
    </section>
  )
}

function StoreLink({ href, label }: { href?: string; label: string }) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-rose-900/50 border border-rose-100 rounded-xl px-3 py-2">
        <Smartphone size={14} /> {label} 출시 준비 중
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-xl px-3 py-2 active-press"
    >
      <Smartphone size={14} /> {label}
    </a>
  )
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-rose-400' : 'bg-rose-100'}`}
        />
      ))}
    </div>
  )
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-rose-950">{children}</h2>
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-rose-900/70">{label}</span>
      <span className="font-semibold text-rose-950">{value}</span>
    </div>
  )
}

function Notice({ tone, children }: { tone: 'warn' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'error'
      ? 'bg-red-50 text-red-700 border-red-100'
      : 'bg-amber-50 text-amber-800 border-amber-100'
  return <div className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed ${cls}`}>{children}</div>
}

function Disclaimer({ text }: { text?: string }) {
  return (
    <p className="text-[11px] text-rose-900/50 leading-relaxed">
      {text ??
        '표시된 금액은 정부·지자체 고시 기준의 최대 지원 한도이며, 실제 지급액은 본인부담금과 시술 내용에 따라 달라질 수 있어요. 최종 확인은 관할 보건소 또는 정부24에서 해주세요.'}
    </p>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:bg-rose-200 disabled:cursor-not-allowed text-white text-sm font-bold py-3 transition-colors active-press"
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-900 text-sm font-semibold py-3 transition-colors active-press"
    >
      {children}
    </button>
  )
}
