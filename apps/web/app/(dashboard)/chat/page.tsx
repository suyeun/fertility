'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { aiApi, detectEmergency } from '@fertility/shared'
import type { UserMode } from '@fertility/shared'
import { Send, Sparkles, AlertTriangle, Info, ShieldCheck } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isEmergency?: boolean
}

// 의료법 면책 고지 — 최초 1회 표시
function DisclaimerBanner({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#ff8fab]" />
          <h3 className="text-base font-bold text-[#5a3042]">AI 상담 시작 전 안내</h3>
        </div>

        <div className="bg-[#fff8f9] rounded-2xl p-4 flex flex-col gap-3 text-[12px] text-[#5a3042] leading-relaxed border border-[#ffd6e0]">
          <p className="font-bold text-[#ff8fab]">📋 반드시 확인해 주세요</p>

          <div className="flex gap-2">
            <span className="shrink-0">✅</span>
            <p>봄이(BOM AI)는 <b>의료기기가 아니며</b>, 제공하는 정보는 <b>참고용 건강 정보 및 기록 정리</b> 목적입니다.</p>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0">✅</span>
            <p>봄이는 <b>진단·처방·치료 행위를 하지 않습니다.</b> 수치 설명은 데이터 트렌드 안내 수준으로만 제공됩니다.</p>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0">✅</span>
            <p>증상, 수치, 치료 계획에 대한 <b>정확한 판단은 반드시 담당 난임 전문의와 상담</b>하세요.</p>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0">🚨</span>
            <p className="text-red-600 font-semibold">응급 증상(심한 복통, 호흡곤란, 다량 출혈)은 즉시 119 또는 응급실에 연락하세요.</p>
          </div>
        </div>

        <p className="text-[10px] text-[#c4a0ae] text-center">
          대한민국 의료법 및 보건복지부 비의료 건강관리서비스 가이드라인 준수
        </p>

        <button
          onClick={onConfirm}
          className="w-full py-3.5 bg-[#ff8fab] text-white rounded-2xl text-sm font-bold active:scale-[0.98] transition-all"
        >
          확인했어요, 봄이와 대화 시작하기
        </button>
      </div>
    </div>
  )
}

// 응급 경고 배너
function EmergencyBanner() {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl p-3 mx-1">
      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
      <p className="text-[11px] text-red-700 font-semibold leading-relaxed">
        응급 증상이 감지됐어요. 지금 바로 <b>119</b> 또는 <b>담당 병원 응급라인</b>에 연락하세요.
      </p>
    </div>
  )
}

export default function ChatPage() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [disclaimerShown, setDisclaimerShown] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const mode: UserMode = (profile?.currentMode as UserMode)
    ?? (profile?.treatmentStage === 'natural' ? 'NATURAL' : 'CLINIC')

  useEffect(() => {
    // 세션 내 최초 1회만 고지
    const shown = sessionStorage.getItem('bom_disclaimer')
    if (shown) setDisclaimerShown(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleConfirmDisclaimer = () => {
    sessionStorage.setItem('bom_disclaimer', '1')
    setDisclaimerShown(true)
  }

  const handleSend = async () => {
    if (!input.trim() || streaming) return

    const userText = input.trim()
    setInput('')

    // 프론트엔드 응급 키워드 사전 감지
    const isEmergency = detectEmergency(userText)

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userText },
    ]
    setMessages(newMessages)
    setStreaming(true)

    // 응급 감지 시 AI 호출 없이 즉시 경고
    if (isEmergency) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🚨 **지금 즉시 병원 또는 응급실에 연락하세요.**\n\n말씀하신 증상은 즉각적인 의료 확인이 필요할 수 있습니다.\n\n저는 AI이며 의료 판단을 대신할 수 없습니다. 증상이 심각하다면 지체하지 말고 **119** 또는 **담당 병원 응급라인**에 연락하세요.',
        isEmergency: true,
      }])
      setStreaming(false)
      return
    }

    // 일반 메시지: 스트리밍 응답
    let assistantText = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      await aiApi.streamChat(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        (token) => {
          assistantText += token
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: assistantText }
            return updated
          })
        },
        mode,
      )
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '일시적인 오류가 발생했어요. 다시 시도해 주세요.',
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <>
      {!disclaimerShown && <DisclaimerBanner onConfirm={handleConfirmDisclaimer} />}

      <div className="flex flex-col h-[calc(100vh-140px)]">

        {/* 헤더 */}
        <div className="flex items-center gap-2 pb-3 border-b border-[#ffd6e0]">
          <Sparkles size={18} className="text-[#ff8fab]" />
          <div>
            <h2 className="text-sm font-bold text-[#5a3042]">AI 봄이와 대화하기</h2>
            <p className="text-[10px] text-[#b07080]">
              {mode === 'NATURAL' ? '자연 임신 준비 모드' : '시술 모드'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1 bg-[#fff0f4] px-2 py-1 rounded-full">
            <Info size={10} className="text-[#ff8fab]" />
            <span className="text-[9px] text-[#ff8fab] font-bold">비의료 서비스</span>
          </div>
        </div>

        {/* 상단 고정 경고문 */}
        <div className="flex items-start gap-2 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-3 py-2 mt-2">
          <Info size={12} className="text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-yellow-800 leading-relaxed">
            <b>BOM AI 파트너는 의료 진단이나 처방을 제공하지 않습니다.</b> 본 답변은 기록 및 정보 참고용이며, 의료적 판단은 반드시 전문의와 상의하세요.
          </p>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">

          {/* 웰컴 메시지 */}
          {messages.length === 0 && (
            <div className="flex flex-col gap-3">
              <div className="bg-[#fff0f4] rounded-2xl p-4 text-sm text-[#5a3042] leading-relaxed">
                <p className="font-bold mb-1">안녕하세요! 봄이예요 🌸</p>
                <p className="text-[12px] text-[#b07080]">
                  {mode === 'NATURAL'
                    ? '배란일, 기초체온, OPK 수치 등 자연 임신 준비 관련 궁금한 점을 물어보세요.'
                    : '시술 과정, 호르몬 수치, 약물 정보 등 궁금한 점을 물어보세요.'
                  }
                </p>
                <p className="text-[10px] text-[#c4a0ae] mt-2">
                  ※ 저는 의료 전문가가 아니에요. 참고용 정보만 제공하며, 정확한 판단은 담당 의사와 상담해 주세요.
                </p>
              </div>

              {/* 추천 질문 */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-[#b07080] font-semibold">이런 것들을 물어볼 수 있어요</p>
                {(mode === 'NATURAL'
                  ? ['OPK 수치가 8이면 배란이 임박한 건가요?', 'BBT가 갑자기 올랐는데 어떤 의미인가요?', '가임기를 더 정확히 알 수 있는 방법이 있나요?']
                  : ['과배란 유도 중 배가 많이 부른데 정상인가요?', 'AMH 수치가 낮으면 시술이 어려운가요?', '이식 후 황체호르몬 수치가 얼마면 좋은가요?']
                ).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="text-left text-[11px] text-[#8c5060] bg-white border border-[#ffd6e0] rounded-xl px-3 py-2.5 hover:bg-[#fff0f4] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 대화 메시지 */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#ff8fab] text-white rounded-br-sm'
                    : msg.isEmergency
                      ? 'bg-red-50 border border-red-200 text-red-800 rounded-bl-sm'
                      : 'bg-white border border-[#ffd6e0] text-[#5a3042] rounded-bl-sm'
                }`}
                style={{ boxShadow: '0 1px 4px -1px rgba(0,0,0,0.08)' }}
              >
                {msg.isEmergency && (
                  <div className="flex items-center gap-1 mb-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    <span className="text-[10px] font-bold text-red-600">응급 상황 감지</span>
                  </div>
                )}
                {msg.content || (
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#ffd6e0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#ffd6e0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#ffd6e0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
                {/* AI 응답 하단 면책 고지 */}
                {msg.role === 'assistant' && !msg.isEmergency && msg.content && (
                  <p className="text-[9px] text-[#c4a0ae] mt-2 pt-2 border-t border-[#ffeef3]">
                    ※ 참고용 정보 · 정확한 판단은 담당 의사와 상담하세요
                  </p>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* 입력 영역 */}
        <div className="pt-3 border-t border-[#ffd6e0]">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="궁금한 점을 물어보세요..."
              disabled={streaming}
              className="flex-1 text-sm px-4 py-3 rounded-2xl border border-[#ffd6e0] bg-[#fff8f9] focus:outline-none focus:ring-2 focus:ring-[#ff8fab] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="p-3 bg-[#ff8fab] text-white rounded-2xl disabled:opacity-40 active:scale-95 transition-all shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
          {/* 하단 고정 경고문 */}
          <p className="text-[9px] text-[#b07080] text-center mt-1.5 leading-relaxed">
            BOM AI 파트너는 의료 진단·처방을 제공하지 않습니다. 본 답변은 기록 및 정보 참고용이며,{' '}
            의료적 판단은 반드시 담당 난임 전문의와 상의하세요.
          </p>
        </div>

      </div>
    </>
  )
}
