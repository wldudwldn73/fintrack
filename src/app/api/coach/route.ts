import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

interface TxInput {
  date: string
  category: string
  amount: number
  type: string
  is_excluded: boolean
}

export async function POST(req: NextRequest) {
  const { transactions, year, month } = await req.json() as {
    transactions: TxInput[]
    year: number
    month: number
  }

  const expenses = transactions.filter(t => t.type === 'expense' && !t.is_excluded)
  if (expenses.length === 0) return NextResponse.json({ patterns: [], overall: null })

  // 카테고리별 집계
  const catMap: Record<string, { total: number; count: number }> = {}
  for (const t of expenses) {
    if (!catMap[t.category]) catMap[t.category] = { total: 0, count: 0 }
    catMap[t.category].total += t.amount
    catMap[t.category].count += 1
  }

  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const daysInMonth = new Date(year, month, 0).getDate()
  const midDay = Math.floor(daysInMonth / 2)

  // 상반월 vs 하반월
  const firstHalf  = expenses.filter(t => new Date(t.date).getDate() <= midDay).reduce((s, t) => s + t.amount, 0)
  const secondHalf = expenses.filter(t => new Date(t.date).getDate() > midDay).reduce((s, t) => s + t.amount, 0)

  // 날짜별 지출
  const byDate: Record<string, number> = {}
  for (const t of expenses) byDate[t.date] = (byDate[t.date] ?? 0) + t.amount
  const dateEntries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
  const maxDay = dateEntries.reduce((a, b) => b[1] > a[1] ? b : a, ['', 0])

  // 단건 큰 지출 TOP3
  const top3 = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3)

  // 평균 단건 금액
  const avgTx = totalExpense / expenses.length

  const catSummary = Object.entries(catMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, { total, count }]) => `${cat}: ${total.toLocaleString('ko-KR')}원 (${count}건, 전체의 ${Math.round(total / totalExpense * 100)}%)`)
    .join('\n')

  const top3Str = top3.map(t => `${t.category} ${t.amount.toLocaleString('ko-KR')}원 (${t.date})`).join(', ')

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const prompt = `당신은 매우 엄격하고 직설적인 한국 개인 재무 코치입니다. 사용자의 ${month}월 소비를 분석해서 문제 패턴을 발견하면 단호하게 혼내세요.

[${month}월 소비 통계]
총 지출: ${totalExpense.toLocaleString('ko-KR')}원 (${expenses.length}건)
상반월(1~${midDay}일): ${firstHalf.toLocaleString('ko-KR')}원
하반월(${midDay + 1}~${daysInMonth}일): ${secondHalf.toLocaleString('ko-KR')}원
최고 지출일: ${maxDay[0]} (${maxDay[1].toLocaleString('ko-KR')}원)
평균 단건 금액: ${Math.round(avgTx).toLocaleString('ko-KR')}원
단건 큰 지출 TOP3: ${top3Str}

카테고리별:
${catSummary}

[감지할 패턴 — 해당되는 것만 포함하세요]
1. 소액 누적: 카페+편의점 합계가 월 5만원 이상이면 지적
2. 외식 과다: 식비 비율 35% 이상이면 지적
3. 구독 방치: 구독 5만원 이상이면 점검 요구
4. 월말 몰아쓰기: 하반월이 상반월의 1.4배 이상이면 지적
5. 충동구매: 단건 50만원 이상이면서 평균의 5배 이상이면 지적
6. 외식+카페 복합 과다: 두 카테고리 합이 전체의 40% 이상이면 지적

반드시 아래 JSON 형식으로만 응답하세요. 감지된 패턴이 없으면 patterns를 빈 배열로:
{
  "patterns": [
    {
      "type": "패턴 이름",
      "severity": "high 또는 medium",
      "scold": "단호하고 직설적인 혼내는 말 2~3문장. 구체적 수치 포함. 예: '이번 달 카페에만 X만원. 이건 낭비입니다.'",
      "tip": "실천 가능한 개선 팁 1~2문장"
    }
  ],
  "overall": "전체 총평 1~2문장. 문제가 많으면 엄하게, 양호하면 칭찬. 반드시 한 줄 실천 제안 포함."
}`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content ?? '{}'
    const data = JSON.parse(raw) as {
      patterns: { type: string; severity: string; scold: string; tip: string }[]
      overall: string | null
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ patterns: [], overall: null })
  }
}
