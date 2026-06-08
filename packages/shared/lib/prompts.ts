import type { UserProfile, HormoneRecord, UserMode } from '../types'

// ============================
// 모드별 시스템 프롬프트
// ============================

const NATURAL_SYSTEM_PROMPT = `당신은 자연 임신을 준비하는 여성의 따뜻한 AI 파트너 "봄이"입니다.

당신의 역할:
- 생리 주기, 배란일, 기초체온(BBT), 배란테스트기(OPK) 수치를 쉽게 설명합니다
- 가임기에 타이밍을 잘 맞출 수 있도록 실용적인 가이드를 제공합니다
- 자궁경부점액 변화, 배란 증상 등 신체 신호 읽는 법을 알려줍니다
- 엽산·이노시톨 등 임신 준비에 도움이 되는 영양제 정보를 제공합니다
- 자연 임신 준비 과정의 불안과 기다림에 깊이 공감합니다

반드시 지켜야 할 원칙:
- IVF·IUI 등 시술 약물(고나도트로핀, 프로게스테론 주사 등)에 대한 상세 안내는 하지 않습니다 — "병원 시술 모드"에서 더 자세히 도움받을 수 있다고 안내하세요
- 모든 정보는 "참고용"임을 명시합니다
- 임신 성공 확률에 대한 단언은 삼갑니다
- 3주기 이상 자연 시도 후 임신이 안 되면 전문 병원 상담을 부드럽게 권유합니다

답변 형식: 따뜻하고 간결한 말투. 필요할 때 배란 타이밍 팁과 격려를 함께 전달합니다.`

const CLINIC_SYSTEM_PROMPT = `당신은 IVF·IUI·FET 시술 중인 여성의 곁에 있는 따뜻하고 전문적인 AI 파트너 "봄이"입니다.

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

// 레거시 호환 (모드 미지정 시 시술 모드 기본값)
export const SYSTEM_PROMPT = CLINIC_SYSTEM_PROMPT

export function getSystemPrompt(mode: UserMode = 'CLINIC'): string {
  return mode === 'NATURAL' ? NATURAL_SYSTEM_PROMPT : CLINIC_SYSTEM_PROMPT
}

// ============================
// 감정 일기 분석 프롬프트
// ============================

export function buildDiaryAnalysisPrompt(
  content: string,
  recentEntries: string[],
  mode: UserMode = 'CLINIC'
): string {
  const context = mode === 'NATURAL'
    ? '자연 임신을 준비 중인 분'
    : 'IVF/IUI 시술 중인 분'

  return `다음은 ${context}의 오늘 감정 일기입니다:

"${content}"

${recentEntries.length > 0 ? `최근 감정 패턴: ${recentEntries.slice(0, 3).join(' / ')}` : ''}

임신 준비 과정의 어려움에 충분히 공감하면서, 따뜻한 응원 메시지를 2-3문장으로 작성해주세요.
진단이나 의학적 조언은 하지 마세요. "잘 될 거예요" 같은 근거 없는 확신 발언도 삼가주세요.`
}

// ============================
// 호르몬 수치 설명 프롬프트
// ============================

export function buildHormoneExplainPrompt(
  record: Partial<HormoneRecord>,
  mode: UserMode = 'CLINIC'
): string {
  const values: string[] = []
  if (record.bbt !== undefined) values.push(`기초체온(BBT): ${record.bbt}℃`)
  if (record.opkIndex !== undefined) values.push(`배란테스트기(OPK) 수치: ${record.opkIndex}/10`)
  if (record.amh !== undefined) values.push(`AMH: ${record.amh} ng/mL`)
  if (record.fsh !== undefined) values.push(`FSH: ${record.fsh} mIU/mL`)
  if (record.lh !== undefined) values.push(`LH: ${record.lh} mIU/mL`)
  if (record.estradiol !== undefined) values.push(`에스트라디올(E2): ${record.estradiol} pg/mL`)
  if (record.follicleSize !== undefined) values.push(`난포 크기: ${record.follicleSize} mm`)
  if (record.endometriumThickness !== undefined) values.push(`자궁내막 두께: ${record.endometriumThickness} mm`)
  if (record.hcgLevel !== undefined) values.push(`hCG: ${record.hcgLevel} mIU/mL`)

  const context = mode === 'NATURAL'
    ? '자연 임신을 준비 중인 분'
    : 'IVF/IUI 시술 중인 환자'

  return `${context}의 다음 기록을 쉽게 설명해주세요:
${values.join(', ')}

${mode === 'NATURAL'
  ? '배란 타이밍 파악 맥락에서 이 수치가 일반적으로 의미하는 바를 알기 쉽게 설명해주세요.'
  : '시술 맥락에서 이 수치가 일반적으로 의미하는 바를 알기 쉽게 설명해주세요.'
}
반드시 "이 수치는 참고용이며, 정확한 해석과 다음 단계는 담당 의사와 상담하세요"라는 문구를 포함하세요.`
}

// ============================
// 자연임신 모드 전용: OPK 피크 감지 프롬프트
// ============================

export function buildOPKSurgePrompt(recentOpkValues: number[]): string {
  const trend = recentOpkValues.join(' → ')
  return `다음은 최근 배란테스트기(OPK) 수치 변화입니다 (0-10 스케일): ${trend}

피크(Surge) 여부를 판단하고, 만약 피크라면 오늘 또는 내일이 최적 타이밍임을 따뜻하게 알려주세요.
의학적 단언은 피하고, 참고용 정보임을 명시하세요.`
}
