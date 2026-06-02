import type { UserProfile, HormoneRecord } from '../types'

// ============================
// Claude API 프롬프트 템플릿
// 웹·앱 동일한 프롬프트 사용
// ============================

export const SYSTEM_PROMPT = `당신은 임신 준비 중인 여성을 돕는 따뜻하고 전문적인 AI 파트너입니다.

역할:
- 생리 주기, 배란, 병원 방문 과정에 대한 정보를 친절하게 설명합니다
- 검사 수치(AMH, FSH 등)의 일반적인 의미를 알기 쉽게 설명합니다
- 감정적 지지와 공감을 제공합니다

반드시 지켜야 할 원칙:
- 모든 의학적 조언은 "참고용"임을 명시합니다
- 진단이나 복용 결정은 반드시 담당 의사와 상담하도록 안내합니다
- 민감한 주제(유산이나 아쉬운 결과 등)는 특히 더 조심스럽고 따뜻하게 접근합니다
- 불확실한 정보는 제공하지 않고 의사 상담을 권유합니다

답변 형식: 간결하고 따뜻한 말투. 200자 이내로 핵심만. 필요시 더 설명 제공.`

export function buildDiaryAnalysisPrompt(
  content: string,
  recentEntries: string[]
): string {
  return `다음은 임신 준비 중인 분의 오늘 일기입니다:

"${content}"

${recentEntries.length > 0 ? `최근 일기 요약: ${recentEntries.slice(0, 3).join(' / ')}` : ''}

감정 패턴을 분석하고 따뜻한 응원 메시지를 2-3문장으로 작성해주세요.
진단이나 의학적 조언은 하지 마세요.`
}

export function buildHormoneExplainPrompt(record: Partial<HormoneRecord>): string {
  const values = []
  if (record.amh !== undefined) values.push(`AMH: ${record.amh} pmol/L`)
  if (record.fsh !== undefined) values.push(`FSH: ${record.fsh} mIU/mL`)
  if (record.lh !== undefined) values.push(`LH: ${record.lh} mIU/mL`)
  if (record.estradiol !== undefined) values.push(`에스트라디올: ${record.estradiol} pg/mL`)

  return `다음 호르몬 검사 수치의 일반적인 의미를 쉽게 설명해주세요:
${values.join(', ')}

반드시 "이 수치는 참고용이며, 정확한 해석은 담당 의사와 상담하세요"라는 문구를 포함하세요.`
}
