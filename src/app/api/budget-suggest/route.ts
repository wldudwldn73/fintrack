import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { EXPENSE_CATEGORIES } from '@/lib/types'

const METHODOLOGIES = `
## 활용 가능한 재무 방법론

### 1. 50-30-20 법칙 (Elizabeth Warren)
- 필수지출(needs) 50% : 식비, 교통, 주거, 의료, 구독 등 생존 필수 항목
- 원하는 것(wants) 30% : 카페, 쇼핑, 문화, 편의점 등 선택적 지출
- 저축/투자 20% : 투자 카테고리에 배분
- 적합: 재무 관리 입문자, 중간 소득층

### 2. 선저축 후소비 (Pay Yourself First)
- 월급 수령 즉시 20~30%를 투자/저축으로 먼저 배분
- 나머지 70~80%로만 모든 지출
- 적합: 저축 습관이 없는 사람, 소득이 적은 경우

### 3. 제로 베이스 예산 (Zero-Based Budgeting)
- 수입 - 모든 카테고리 합계 = 0이 되도록 모든 원을 배분
- 모든 카테고리에 명확한 목적과 금액 부여
- 적합: 지출 통제를 강하게 원하는 사람, 고소득층

### 4. FIRE 전략 (Financial Independence, Retire Early)
- 수입의 50~70%를 투자에 배분, 생활비를 극단적으로 절약
- 25배 법칙: 연간 생활비 × 25배 = 목표 자산
- 적합: 조기 은퇴 목표, 고소득층

### 5. 카케보 (Kakeibo, 일본식 가계부)
- 4 버킷: 생존필수(survival) / 선택적(optional) / 문화(culture) / 예상외(extra)
- 매달 4가지 질문: 얼마 있나? 얼마 쓸까? 얼마 모을까? 어떻게 개선할까?
- 적합: 소비 마인드풀니스를 원하는 사람
`

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const { salary } = await req.json() as { salary: number }

  if (!salary || salary <= 0) {
    return NextResponse.json({ error: '올바른 월급을 입력해주세요.' }, { status: 400 })
  }

  const formatted = salary.toLocaleString('ko-KR')
  const categoryList = EXPENSE_CATEGORIES.join(', ')

  const prompt = `당신은 한국의 개인 재무 전문가입니다. 아래 방법론 중 월급 ${formatted}원에 가장 적합한 것을 선택하고, 그 방법론의 원칙을 정확히 적용해서 카테고리별 예산을 배분해주세요.

${METHODOLOGIES}

카테고리: ${categoryList}

방법론 선택 기준:
- 월급 200만원 미만: "선저축 후소비" 권장 (저축 습관 먼저)
- 월급 200~400만원: "50-30-20 법칙" 권장 (균형 잡힌 시작점)
- 월급 400~700만원: "제로 베이스 예산" 권장 (정밀한 관리)
- 월급 700만원 이상: "FIRE 전략" 권장 (공격적 자산 증식)
- 단, 방법론 원칙과 카테고리 구조가 잘 맞는지 판단하여 최적 선택

배분 규칙:
- 선택한 방법론의 비율 원칙을 반드시 지킬 것
- 모든 금액은 10,000원 단위로 반올림
- 투자 카테고리 = 저축/투자 역할

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "methodology": {
    "name": "방법론 이름",
    "principle": "핵심 원칙 한 줄 요약 (비율 포함)",
    "reason": "이 월급에 이 방법론을 선택한 이유 1문장"
  },
  "budget": {
    "식비": 숫자,
    "카페": 숫자,
    "편의점": 숫자,
    "교통": 숫자,
    "쇼핑": 숫자,
    "구독": 숫자,
    "주거": 숫자,
    "의료": 숫자,
    "문화": 숫자,
    "교육": 숫자,
    "투자": 숫자,
    "기타": 숫자
  },
  "overall": "방법론 적용 결과 요약 2문장 (총 배분액, 방법론 비율이 어떻게 반영됐는지 수치 포함)",
  "reasons": {
    "식비": "월급의 X.X% · Y만원 — 하루 평균 얼마인지, 어떤 식생활이 가능한지 구체적으로 (예: 하루 1.5만원, 주 2회 외식 포함)",
    "카페": "월급의 X.X% · Y만원 — 주 몇 회 방문 가능한지, 음료 단가 기준으로 (예: 아메리카노 4,500원 기준 주 5회)",
    "편의점": "월급의 X.X% · Y만원 — 하루 혹은 주 단위로 얼마 쓸 수 있는지 (예: 하루 700원, 간식 주 2회 수준)",
    "교통": "월급의 X.X% · Y만원 — 대중교통 + 택시/기타 비중 구체적으로 (예: 지하철 월 6만 + 택시 예비비 9만)",
    "쇼핑": "월급의 X.X% · Y만원 — 어떤 쇼핑 빈도/규모가 가능한지 (예: 의류 2개월에 한 번, 온라인 쇼핑 월 1회)",
    "구독": "월급의 X.X% · Y만원 — 어떤 구독 서비스 몇 개까지 유지 가능한지 (예: 넷플릭스+유튜브 프리미엄 커버 가능)",
    "주거": "월급의 X.X% · Y만원 — 관리비/공과금/월세 등 어느 수준까지 커버되는지",
    "의료": "월급의 X.X% · Y만원 — 월 평균 병원 방문 횟수 기준 (예: 감기 등 기본 진료 월 1~2회 수준)",
    "문화": "월급의 X.X% · Y만원 — 어떤 문화 활동 몇 번 가능한지 (예: 영화 월 2회 + 전시 1회)",
    "교육": "월급의 X.X% · Y만원 — 어떤 학습 투자 가능한지 (예: 인강 1개 또는 책 3권)",
    "투자": "월급의 X.X% · Y만원 — 방법론의 저축/투자 비율, 추천 분산 방식 (예: ETF 40만 + 비상금 적립 20만)",
    "기타": "월급의 X.X% · Y만원 — 예상치 못한 지출 대비 버퍼, 어느 상황에 쓰는지"
  }
}`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content ?? '{}'
    const data = JSON.parse(content) as {
      methodology: { name: string; principle: string; reason: string }
      budget: Record<string, number>
      overall: string
      reasons: Record<string, string>
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'AI 추천 생성에 실패했습니다.' }, { status: 500 })
  }
}
