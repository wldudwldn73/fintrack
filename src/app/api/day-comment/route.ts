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

  const catList = categories
    .map(c => `${c.category}(${c.count}건)`)
    .join(', ')

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

  const prompt = `당신은 한국 개인 재무 코치입니다. 사용자의 하루 소비 카테고리를 보고 그날의 생활을 스토리텔링으로 코멘트해주세요.

소비 카테고리: ${catList}
${contextLines.join('\n')}
${isWeekend ? '- 주말' : '- 평일'}${isMonthEnd ? '\n- 월말' : isMonthStart ? '\n- 월초' : ''}

규칙:
1. 2~3문장으로 작성하세요
2. 숫자나 퍼센트를 직접 쓰지 마세요
3. 카테고리에서 그날의 분위기·상황·감정을 자연스럽게 추론하세요
4. 마지막 문장은 따뜻한 응원이나 가벼운 행동 팁으로 끝내세요
5. 판단하거나 훈계하는 어조는 피하세요
6. 반드시 한국어로 작성하세요

카테고리별 상황 힌트:
- 카페+쇼핑 → 여유로운 외출, 혼자만의 시간
- 식비+카페(저녁) → 누군가와 함께한 시간
- 교통+식비 → 이동이 많았던 날
- 편의점 위주 → 바쁘거나 집 근처에 있었던 날
- 문화+식비 → 영화·전시 등 문화 활동
- 의료 → 건강을 챙긴 날
- 교육 → 성장에 투자한 날
- 쇼핑 only → 필요한 걸 장만한 날`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.65,
      max_tokens: 200,
    })
    const story = completion.choices[0]?.message?.content?.trim() ?? null
    return NextResponse.json({ story })
  } catch {
    return NextResponse.json({ story: null })
  }
}
