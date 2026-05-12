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
- 가용소득의 20~30%를 투자/저축으로 먼저 배분
- 나머지 70~80%로만 모든 지출
- 적합: 저축 습관이 없는 사람, 소득이 적은 경우

### 3. 제로 베이스 예산 (Zero-Based Budgeting)
- 가용소득 - 모든 카테고리 합계 = 0이 되도록 모든 원을 배분
- 모든 카테고리에 명확한 목적과 금액 부여
- 적합: 지출 통제를 강하게 원하는 사람, 고소득층

### 4. FIRE 전략 (Financial Independence, Retire Early)
- 가용소득의 50~70%를 투자에 배분, 생활비를 극단적으로 절약
- 25배 법칙: 연간 생활비 × 25배 = 목표 자산
- 적합: 조기 은퇴 목표, 고소득층
`

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const { salary, fixedExpenses = {} } = await req.json() as {
    salary: number
    fixedExpenses: Record<string, number>
  }

  if (!salary || salary <= 0) {
    return NextResponse.json({ error: '올바른 월급을 입력해주세요.' }, { status: 400 })
  }

  const fixedTotal = Object.values(fixedExpenses).reduce((s, v) => s + (v || 0), 0)
  const disposable = salary - fixedTotal
  const categoryList = EXPENSE_CATEGORIES.join(', ')

  const fixedList = Object.entries(fixedExpenses)
    .filter(([, v]) => v > 0)
    .map(([cat, v]) => `${cat}: ${v.toLocaleString('ko-KR')}원`)
    .join(', ')

  const prompt = `당신은 개인 재무 전문가이자 행동경제학 연구를 반영한 AI 예산 추천 엔진입니다.

## 사용자 입력
- 월 소득(세후): ${salary.toLocaleString('ko-KR')}원
- 고정 지출(변경 불가): ${fixedList || '없음'} → 합계 ${fixedTotal.toLocaleString('ko-KR')}원
- 가용소득(배분 가능): ${disposable.toLocaleString('ko-KR')}원

${METHODOLOGIES}

## 방법론 선택 기준 (가용소득 기준)
- 가용소득 150만원 미만: "선저축 후소비" (저축 습관 먼저)
- 가용소득 150~350만원: "50-30-20 법칙"
- 가용소득 350~600만원: "제로 베이스 예산"
- 가용소득 600만원 이상: "FIRE 전략"

## 근거 기반
- 소득 수준별 최적 저축률: 저소득 10~15%, 중산층 20% 이상, 고소득 30% 이상
- 행동경제학: 충동구매, 계획-실행 간극 고려
- 위험 관리: 비상금은 3~6개월 생활비 권장

## 배분 규칙
- 고정 지출 카테고리는 입력된 금액 그대로 budget에 포함
- 가용소득(${disposable.toLocaleString('ko-KR')}원)을 선택한 방법론 원칙으로 나머지 카테고리에 배분
- 모든 금액은 10,000원 단위로 반올림
- 고정 지출이 이미 해당 카테고리를 커버하면 중복 배분 금지

반드시 아래 JSON 형식으로만 응답하세요:
{
  "methodology": {
    "name": "방법론 이름",
    "principle": "핵심 원칙 한 줄 (비율 포함)",
    "reason": "가용소득 기준 이 방법론을 선택한 이유 1문장"
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
    "보험": 숫자,
    "적금": 숫자,
    "기부금": 숫자,
    "카드대금": 숫자,
    "기타": 숫자
  },
  "overall": "가용소득 기반 배분 전략 2문장 (고정지출 차감 후 실질 배분액과 비율 포함)",
  "reasons": {
    "식비": "가용소득의 X.X% · Y만원 — 하루 평균 얼마, 어떤 식생활 가능",
    "카페": "가용소득의 X.X% · Y만원 — 주 몇 회, 음료 단가 기준",
    "편의점": "가용소득의 X.X% · Y만원 — 하루/주 단위 소비 규모",
    "교통": "가용소득의 X.X% · Y만원 — 대중교통+기타 구성",
    "쇼핑": "가용소득의 X.X% · Y만원 — 어떤 빈도/규모 가능",
    "구독": "가용소득의 X.X% · Y만원 — 어떤 서비스 유지 가능",
    "주거": "고정지출 또는 가용소득의 X.X% · Y만원",
    "의료": "가용소득의 X.X% · Y만원 — 월 병원 방문 횟수 기준",
    "문화": "가용소득의 X.X% · Y만원 — 어떤 활동 몇 번 가능",
    "교육": "가용소득의 X.X% · Y만원 — 어떤 학습 투자 가능",
    "투자": "가용소득의 X.X% · Y만원 — 방법론 저축/투자 비율, 추천 분산",
    "보험": "고정지출 또는 가용소득의 X.X% · Y만원",
    "적금": "고정지출 또는 가용소득의 X.X% · Y만원",
    "기부금": "가용소득의 X.X% · Y만원 또는 고정지출",
    "카드대금": "고정지출 또는 가용소득의 X.X% · Y만원 — 전월 카드 사용액 기준",
    "기타": "가용소득의 X.X% · Y만원 — 예상치 못한 지출 버퍼"
  },
  "tips": [
    "행동경제학 실행 팁 1 (구체적 행동, 예: 자동이체 설정)",
    "행동경제학 실행 팁 2 (충동 구매 방지)",
    "행동경제학 실행 팁 3 (비상금 또는 습관)"
  ],
  "scenarios": [
    {
      "name": "저축 극대화",
      "description": "투자/적금을 X만원 늘리고 Y, Z 카테고리를 각 A만원 줄이면 저축률 X%로 상향 가능"
    },
    {
      "name": "여유 생활 우선",
      "description": "투자를 X만원으로 줄이고 여가/식비를 각 Y만원 늘리면 생활 만족도 향상"
    }
  ]
}

카테고리 목록: ${categoryList}`

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
      tips: string[]
      scenarios: Array<{ name: string; description: string }>
    }

    return NextResponse.json({ ...data, disposable, fixedTotal })
  } catch {
    return NextResponse.json({ error: 'AI 추천 생성에 실패했습니다.' }, { status: 500 })
  }
}
