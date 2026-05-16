import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface TxInput {
  date: string
  category: string
  amount: number
  type: string
  is_excluded: boolean
  is_recurring: boolean
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { transactions, year, month } = await req.json() as {
    transactions: TxInput[]
    year: number
    month: number
  }

  const expenses = transactions.filter(t => t.type === 'expense' && !t.is_excluded)
  if (expenses.length === 0) return NextResponse.json({ patterns: [], overall: null, action_plan: [], fixedTotal: 0, variableTotal: 0, fixedCatMap: {} })

  const fixedExpenses = expenses.filter(t => t.is_recurring)
  const variableExpenses = expenses.filter(t => !t.is_recurring)

  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const fixedTotal = fixedExpenses.reduce((s, t) => s + t.amount, 0)
  const variableTotal = variableExpenses.reduce((s, t) => s + t.amount, 0)

  // 고정비 카테고리별 집계
  const fixedCatMap: Record<string, number> = {}
  for (const t of fixedExpenses) fixedCatMap[t.category] = (fixedCatMap[t.category] ?? 0) + t.amount

  // 변동비 카테고리별 집계
  const varCatMap: Record<string, { total: number; count: number; largest: number }> = {}
  for (const t of variableExpenses) {
    if (!varCatMap[t.category]) varCatMap[t.category] = { total: 0, count: 0, largest: 0 }
    varCatMap[t.category].total += t.amount
    varCatMap[t.category].count += 1
    if (t.amount > varCatMap[t.category].largest) varCatMap[t.category].largest = t.amount
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const currentDay = (today.getFullYear() === year && today.getMonth() + 1 === month)
    ? today.getDate() : daysInMonth
  const midDay = Math.floor(daysInMonth / 2)

  // 상반월 vs 하반월 (변동비 기준)
  const firstHalf = variableExpenses.filter(t => new Date(t.date).getDate() <= midDay).reduce((s, t) => s + t.amount, 0)
  const secondHalf = variableExpenses.filter(t => new Date(t.date).getDate() > midDay).reduce((s, t) => s + t.amount, 0)

  // 날짜별 변동 지출
  const byDate: Record<string, number> = {}
  for (const t of variableExpenses) byDate[t.date] = (byDate[t.date] ?? 0) + t.amount
  const dateEntries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
  const maxDay = dateEntries.length > 0 ? dateEntries.reduce((a, b) => b[1] > a[1] ? b : a, ['없음', 0]) : ['없음', 0]

  // 변동비 단건 TOP3
  const top3 = [...variableExpenses].sort((a, b) => b.amount - a.amount).slice(0, 3)

  // 일평균·단건평균 (변동비)
  const avgDailyVar = currentDay > 0 ? variableTotal / currentDay : 0
  const avgTxVar = variableExpenses.length > 0 ? variableTotal / variableExpenses.length : 0

  // 주간 변동 지출 (1~4주)
  const weeklyVar: number[] = [0, 0, 0, 0]
  for (const t of variableExpenses) {
    const w = Math.min(Math.floor((new Date(t.date).getDate() - 1) / 7), 3)
    weeklyVar[w] += t.amount
  }

  const fixedSummary = Object.entries(fixedCatMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `${cat}: ${amt.toLocaleString('ko-KR')}원`)
    .join(', ')

  const varCatSummary = Object.entries(varCatMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, { total, count, largest }]) =>
      `${cat}: ${total.toLocaleString('ko-KR')}원 (${count}건, 변동비의 ${Math.round(total / variableTotal * 100)}%, 최대단건 ${largest.toLocaleString('ko-KR')}원)`
    ).join('\n')

  const top3Str = top3.map(t => `${t.category} ${t.amount.toLocaleString('ko-KR')}원 (${t.date})`).join(' / ')
  const weeklyStr = weeklyVar.map((v, i) => `${i + 1}주: ${v.toLocaleString('ko-KR')}원`).join(', ')

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const prompt = `당신은 매우 엄격하고 직설적인 한국 개인 재무 코치입니다.
고정비는 최소한의 필수 지출이므로 코칭에서 완전히 제외합니다.
${month}월의 변동 지출만을 집중 분석해서 문제 패턴을 발견하면 단호하게 지적하세요.

[${month}월 지출 개요]
총 지출: ${totalExpense.toLocaleString('ko-KR')}원
  ├ 고정비(코칭 제외): ${fixedTotal.toLocaleString('ko-KR')}원 — ${fixedSummary || '없음'}
  └ 변동비(코칭 대상): ${variableTotal.toLocaleString('ko-KR')}원 (${variableExpenses.length}건)

[변동 지출 분석]
일평균 변동 지출: ${Math.round(avgDailyVar).toLocaleString('ko-KR')}원
평균 단건 금액: ${Math.round(avgTxVar).toLocaleString('ko-KR')}원
상반월(1~${midDay}일): ${firstHalf.toLocaleString('ko-KR')}원
하반월(${midDay + 1}~${daysInMonth}일): ${secondHalf.toLocaleString('ko-KR')}원
최고 지출일: ${maxDay[0]} (${(maxDay[1] as number).toLocaleString('ko-KR')}원)
단건 큰 지출 TOP3: ${top3Str || '없음'}
주간 추이: ${weeklyStr}

카테고리별 변동 지출:
${varCatSummary || '변동 지출 없음'}

[감지할 패턴 — 변동 지출 기준, 해당되는 것만 포함]
1. 소액 누적: 카페+편의점 합계 5만원 이상
2. 외식 과다: 식비+카페 합계가 변동비의 35% 이상
3. 월말 몰아쓰기: 하반월이 상반월의 1.4배 이상
4. 충동구매 의심: 단건 30만원 이상 & 평균 단건의 5배 이상
5. 쇼핑 과다: 쇼핑 카테고리가 변동비의 25% 이상
6. 외식+카페 복합 과다: 두 카테고리 합이 변동비의 40% 이상
7. 주간 불균형: 특정 주차가 다른 주차의 2배 이상
8. 고빈도 소액 지출: 한 카테고리에서 20건 이상 (무의식 소비)
9. 오락·여가 과다: 변동비의 20% 이상
10. 일평균 과다: 일평균 변동 지출 5만원 이상

반드시 아래 JSON 형식으로만 응답하세요:
{
  "patterns": [
    {
      "type": "패턴 이름 (4~6자)",
      "severity": "high 또는 medium",
      "scold": "단호하고 직설적인 지적 3~4문장. 구체적 수치와 계산 포함. 예: '이번 달 카페에만 X만원, Y건. 주 Z회 카페를 간 셈이에요. 이건 명백히 줄여야 할 지출입니다.'",
      "tip": "즉시 실천 가능한 개선 방법 2~3문장. 숫자 목표 포함.",
      "saving_potential": "절감 가능 예상 금액 (예: '월 2~3만원')"
    }
  ],
  "overall": "전체 총평 2~3문장. 변동 지출 핵심 문제와 구체적 절감 목표 제시.",
  "action_plan": ["이번 주 바로 실천할 행동 1 (구체적 금액·횟수 포함)", "이번 주 바로 실천할 행동 2", "이번 주 바로 실천할 행동 3"]
}`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1400,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content ?? '{}'
    const data = JSON.parse(raw) as {
      patterns: { type: string; severity: string; scold: string; tip: string; saving_potential?: string }[]
      overall: string | null
      action_plan?: string[]
    }
    return NextResponse.json({ ...data, fixedTotal, variableTotal, fixedCatMap })
  } catch {
    return NextResponse.json({ patterns: [], overall: null, action_plan: [], fixedTotal, variableTotal, fixedCatMap })
  }
}
