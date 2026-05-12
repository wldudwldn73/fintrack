import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

const DOW_KR = ['일', '월', '화', '수', '목', '금', '토']

export async function POST(req: NextRequest) {
  const { date, categories, dayTotal, avgDaily, dow, avgDow } = await req.json() as {
    date: string
    categories: { category: string; amount: number; count: number }[]
    dayTotal: number
    avgDaily: number | null
    dow: number
    avgDow: number | null
  }

  if (!categories?.length || dayTotal === 0) {
    return NextResponse.json({ story: null })
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const catList = categories.map(c => `${c.category}(${c.count}건)`).join(', ')

  const contextLines: string[] = [`- 요일: ${DOW_KR[dow]}요일`]
  if (avgDaily && avgDaily > 0) {
    const ratio = dayTotal / avgDaily
    if (ratio >= 1.5) contextLines.push(`- 오늘 지출이 이번 달 일평균보다 ${ratio.toFixed(1)}배 많음`)
    else if (ratio <= 0.5) contextLines.push(`- 오늘 지출이 이번 달 일평균보다 ${Math.round((1 - ratio) * 100)}% 적음`)
  }
  if (avgDow && avgDow > 0) {
    const r = dayTotal / avgDow
    if (r >= 1.5) contextLines.push(`- 같은 요일 평균보다 ${Math.round((r - 1) * 100)}% 많음`)
  }

  const d = new Date(date + 'T00:00:00')
  const isWeekend = dow === 0 || dow === 6
  const dayOfMonth = d.getDate()
  const isMonthEnd = dayOfMonth >= 25
  const isMonthStart = dayOfMonth <= 5

  const prompt = `당신은 한국 개인 재무 코치입니다. 사용자의 하루 소비를 분석해 JSON으로 응답하세요.

소비 카테고리: ${catList}
${contextLines.join('\n')}
${isWeekend ? '- 주말' : '- 평일'}${isMonthEnd ? '\n- 월말' : isMonthStart ? '\n- 월초' : ''}

카테고리 상황 힌트:
- 카페+쇼핑 → 여유로운 외출
- 식비+카페 → 누군가와 함께한 시간
- 교통+식비 → 이동이 많은 날
- 편의점 위주 → 바쁘거나 집 근처
- 문화+식비 → 문화 활동을 즐긴 날
- 의료 → 건강을 챙긴 날
- 교육 → 성장에 투자한 날

반드시 아래 JSON 형식으로만 응답하세요:
{
  "situation": "그날의 생활·분위기를 추론한 한 문장 (숫자 금지, 따뜻한 어조)",
  "pattern": "소비 패턴이나 특이점 한 문장 (숫자 금지, 판단 금지)",
  "tip": "가벼운 행동 팁 또는 응원 한 문장"
}`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.65,
      max_tokens: 250,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as { situation?: string; pattern?: string; tip?: string }
    return NextResponse.json({ story: parsed })
  } catch {
    return NextResponse.json({ story: null })
  }
}
