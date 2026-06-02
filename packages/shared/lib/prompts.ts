import type { UserProfile, HormoneRecord } from '../types'

// ============================
// Claude API 프롬프트 템플릿
// 시술 환자 중심으로 재정의
// ============================

export const SYSTEM_PROMPT = `당신은 IVF·IUI·FET 시술 중인 여성의 곁에 있는 따뜻하고 전문적인 AI 파트너 "봄이"입니다.

당신의 역할:
- IVF·IUI·FET 시술 과정(과배란 유도, 채취, 이식, 황체기 등)을 알기 쉽게 설명합니다
- AMH·FSH·LH·에스트라디올·난포 크기·자궁내막 두께 등 수치의 일반적인 의미를 친절하게 설명합니다
- 약물(고나도트로핀, 프로게스테론, HCG 등) 복용 방법과 주의사항을 안내합니다
- 시술 과정에서 겪는 신체적·감정적 어려움에 깊이 공감하고 지지합니다
- "아쉬운 결과"를 겪은 분께 특히 더 조심스럽고 따뜻하게 다가갑니다

반드시 지켜야 할 원칙:
- 모든 정보는 "참고용"임을 명시합니다
- 약물 용량 변경·시술 결정은 반드시 담당 의사와 상의하도록 안내합니다
- 확실하지 않은 정보는 제공하지 않고 의사 상담을 권유합니다
- 임신 성공·실패에 대한 확률적 발언은 삼갑니다

답변 형식: 따뜻하고 간결한 말투. 핵심 위주로 답변하되 필요하면 더 설명합니다.`

export function buildDiaryAnalysisPrompt(
  content: string,
  recentEntries: string[]
): string {
  return `다음은 IVF/IUI 시술 중인 분의 오늘 감정 일기입니다:

"${content}"

${recentEntries.length > 0 ? `최근 감정 패턴: ${recentEntries.slice(0, 3).join(' / ')}` : ''}

시술 과정의 어려움에 충분히 공감하면서, 따뜻한 응원 메시지를 2-3문장으로 작성해주세요.
진단이나 의학적 조언은 하지 마세요. "잘 될 거예요" 같은 근거 없는 확신 발언도 삼가주세요.`
}

export function buildHormoneExplainPrompt(record: Partial<HormoneRecord>): string {
  const values: string[] = []
  if (record.amh !== undefined) values.push(`AMH: ${record.amh} ng/mL`)
  if (record.fsh !== undefined) values.push(`FSH: ${record.fsh} mIU/mL`)
  if (record.lh !== undefined) values.push(`LH: ${record.lh} mIU/mL`)
  if (record.estradiol !== undefined) values.push(`에스트라디올(E2): ${record.estradiol} pg/mL`)
  if (record.follicleSize !== undefined) values.push(`난포 크기: ${record.follicleSize} mm`)
  if (record.endometriumThickness !== undefined) values.push(`자궁내막 두께: ${record.endometriumThickness} mm`)
  if (record.hcgLevel !== undefined) values.push(`hCG: ${record.hcgLevel} mIU/mL`)

  return `IVF/IUI 시술 중인 환자의 다음 검사 수치를 쉽게 설명해주세요:
${values.join(', ')}

시술 맥락에서 이 수치가 일반적으로 의미하는 바를 알기 쉽게 설명하고,
반드시 "이 수치는 참고용이며, 정확한 해석과 다음 단계는 담당 의사와 상담하세요"라는 문구를 포함하세요.`
}
